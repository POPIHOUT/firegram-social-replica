import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard, ShieldCheck, Wallet } from "lucide-react";
import Navigation from "@/components/Navigation";

const FirePay = () => {
  const [searchParams] = useSearchParams();
  const amount = searchParams.get("amount");
  const price = searchParams.get("price");
  const sacCode = searchParams.get("sac");
  const useWallet = searchParams.get("wallet") === "true";
  const isWalletDeposit = searchParams.get("wallet_deposit") === "true";
  const walletDepositAmount = searchParams.get("amount");
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [validatedSacCode, setValidatedSacCode] = useState<{
    code: string;
    creatorId: string;
    creatorUsername: string;
  } | null>(null);
  const [finalPrice, setFinalPrice] = useState(parseFloat(price || "0"));
  const [paymentMethod, setPaymentMethod] = useState<"wallet" | "card" | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletPassword, setWalletPassword] = useState("");

  // Validate SAC code on component mount
  useState(() => {
    const validateSacCode = async () => {
      if (sacCode && sacCode.trim()) {
        const { data, error } = await supabase
          .from("sac_codes")
          .select(`
            code,
            user_id,
            profiles:user_id (username)
          `)
          .eq("code", sacCode.toUpperCase())
          .eq("active", true)
          .single();

        if (!error && data) {
          const discount = parseFloat(price || "0") * 0.05; // 5% discount
          const discountedPrice = parseFloat(price || "0") - discount;
          setFinalPrice(discountedPrice);
          setValidatedSacCode({
            code: data.code,
            creatorId: data.user_id,
            creatorUsername: (data.profiles as any)?.username || "Unknown",
          });
          toast({
            title: "SAC Code Applied!",
            description: `5% discount applied. Supporting ${(data.profiles as any)?.username}`,
          });
        } else {
          toast({
            title: "Invalid SAC Code",
            description: "The code you entered is not valid or inactive",
            variant: "destructive",
          });
        }
      }
    };
    validateSacCode();

    // Fetch wallet balance if not wallet deposit
    if (!isWalletDeposit) {
      const fetchBalance = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("wallet_balance")
          .eq("id", user.id)
          .single();

        if (profile) {
          setWalletBalance(Number(profile.wallet_balance) || 0);
        }
      };
      fetchBalance();
    }
  });

  const detectCardType = (number: string): "visa" | "mastercard" | null => {
    const cleaned = number.replace(/\s/g, "");
    if (cleaned.startsWith("4")) return "visa";
    if (cleaned.match(/^5[1-5]/)) return "mastercard";
    return null;
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, "");
    const formatted = cleaned.match(/.{1,4}/g)?.join(" ") || cleaned;
    return formatted.slice(0, 19); // Max 16 digits + 3 spaces
  };

  const formatExpiryDate = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + "/" + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      // If this is a wallet deposit
      if (isWalletDeposit) {
        const cardType = detectCardType(cardNumber);
        if (!cardType) {
          toast({
            title: "Invalid Card",
            description: "Only Visa and Mastercard are accepted",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const cleaned = cardNumber.replace(/\s/g, "");
        if (cleaned.length !== 16) {
          toast({
            title: "Invalid Card Number",
            description: "Card number must be 16 digits",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const last4 = cleaned.slice(-4);

        const { error } = await supabase.from("wallet_deposits").insert({
          user_id: session.user.id,
          amount: parseFloat(walletDepositAmount || "0"),
          card_type: cardType,
          card_last4: last4,
          card_holder_name: cardHolder,
        });

        if (error) throw error;

        toast({
          title: "Deposit Submitted",
          description: "Your wallet deposit is pending admin approval. Money will be added once approved.",
        });

        setTimeout(() => {
          navigate("/settings");
        }, 1500);
        
        setLoading(false);
        return;
      }

      // If paying with wallet
      if (paymentMethod === "wallet") {
        // Verify password first
        if (!walletPassword) {
          toast({
            title: "Password Required",
            description: "Please enter your password to confirm",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Verify password by attempting to sign in
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) {
          toast({
            title: "Error",
            description: "User email not found",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const { error: passwordError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: walletPassword,
        });

        if (passwordError) {
          toast({
            title: "Incorrect Password",
            description: "The password you entered is incorrect",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Password verified, proceed with purchase
        const { error } = await supabase.rpc("purchase_flames_with_wallet", {
          flame_amount: parseInt(amount || "0"),
          price_amount: finalPrice,
          user_password: walletPassword,
        });

        if (error) throw error;

        toast({
          title: "Purchase Successful!",
          description: `${amount} flames added to your account instantly`,
        });

        setTimeout(() => {
          navigate("/feed");
        }, 1500);
        
        setLoading(false);
        return;
      }

      // Paying with card - requires admin approval
      const cardType = detectCardType(cardNumber);
      if (!cardType) {
        toast({
          title: "Invalid Card",
          description: "Only Visa and Mastercard are accepted",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const cleaned = cardNumber.replace(/\s/g, "");
      if (cleaned.length !== 16) {
        toast({
          title: "Invalid Card Number",
          description: "Card number must be 16 digits",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const last4 = cleaned.slice(-4);

      // Calculate creator commission (15% of the flames)
      const creatorCommission = validatedSacCode
        ? Math.floor(parseInt(amount || "0") * 0.15)
        : 0;

      const { error } = await supabase.from("flame_purchases").insert({
        user_id: session.user.id,
        flame_amount: parseInt(amount || "0"),
        price_usd: finalPrice,
        card_type: cardType,
        card_last4: last4,
        card_holder_name: cardHolder,
        sac_code: validatedSacCode?.code || null,
        creator_id: validatedSacCode?.creatorId || null,
        discount_percent: validatedSacCode ? 5 : 0,
        creator_commission_flames: creatorCommission,
      });

      if (error) throw error;

      toast({
        title: "Purchase Submitted",
        description: "Your purchase is pending admin approval. You'll receive the flames once approved.",
      });

      setTimeout(() => {
        navigate("/feed");
      }, 1500);
    } catch (error: any) {
      console.error("Error submitting purchase:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit purchase",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if ((!amount || !price) && !isWalletDeposit) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Invalid Purchase</CardTitle>
            <CardDescription>Missing purchase details</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-safe">
      <Navigation />
      <main className="max-w-2xl mx-auto pt-20 px-4 pb-20">
        {isWalletDeposit ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-center mb-4">
                <Wallet className="w-12 h-12 text-primary" />
              </div>
              <CardTitle className="text-2xl text-center">Add Money to Wallet</CardTitle>
              <CardDescription className="text-center">
                Secure Payment via FirePay
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Amount:</span>
                  <span className="text-2xl font-bold">${parseFloat(walletDepositAmount || "0").toFixed(2)}</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <Input
                    id="cardNumber"
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Only Visa and Mastercard accepted
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cardHolder">Card Holder Name</Label>
                  <Input
                    id="cardHolder"
                    placeholder="JOHN DOE"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expiry">Expiry Date</Label>
                    <Input
                      id="expiry"
                      placeholder="MM/YY"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                      maxLength={5}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cvv">CVV</Label>
                    <Input
                      id="cvv"
                      placeholder="123"
                      type="password"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 3))}
                      maxLength={3}
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                  <ShieldCheck className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-green-500">
                    Secured by FirePay encryption
                  </span>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Pay $${parseFloat(walletDepositAmount || "0").toFixed(2)}`
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center mt-4">
                  Your deposit will be reviewed by our admin team. Money will be added to your wallet after approval.
                </p>
              </form>
            </CardContent>
          </Card>
        ) : !paymentMethod ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-center mb-4">
                <CreditCard className="w-12 h-12 text-primary" />
              </div>
              <CardTitle className="text-2xl text-center">Choose Payment Method</CardTitle>
              <CardDescription className="text-center">
                Select how you want to pay
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Flames:</span>
                  <span className="font-semibold">{parseInt(amount || "0").toLocaleString()}</span>
                </div>
                {validatedSacCode && (
                  <>
                    <div className="flex justify-between items-center text-green-500">
                      <span className="text-sm">SAC Code ({validatedSacCode.code}):</span>
                      <span className="font-semibold">-5% discount</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>Supporting:</span>
                      <span>{validatedSacCode.creatorUsername}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Original:</span>
                      <span className="line-through text-muted-foreground">${price}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between items-center mt-2 pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Total:</span>
                  <span className="text-2xl font-bold">${finalPrice.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-3">
                {walletBalance >= finalPrice && (
                  <Button
                    onClick={() => setPaymentMethod("wallet")}
                    className="w-full h-auto py-6 flex flex-col items-start gap-2 bg-gradient-to-r from-primary to-primary/80"
                  >
                    <div className="flex items-center gap-2 w-full justify-between">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-5 h-5" />
                        <span className="font-semibold">Pay with FireWallet</span>
                      </div>
                      <Badge variant="secondary">Instant</Badge>
                    </div>
                    <div className="text-xs text-left opacity-90">
                      Balance: ${walletBalance.toFixed(2)} • Instant flames delivery
                    </div>
                  </Button>
                )}

                <Button
                  onClick={() => setPaymentMethod("card")}
                  variant="outline"
                  className="w-full h-auto py-6 flex flex-col items-start gap-2"
                >
                  <div className="flex items-center gap-2 w-full justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      <span className="font-semibold">Pay with Card</span>
                    </div>
                    <Badge variant="secondary">Requires Approval</Badge>
                  </div>
                  <div className="text-xs text-left text-muted-foreground">
                    Visa/Mastercard • Admin approval required
                  </div>
                </Button>

                {walletBalance < finalPrice && walletBalance > 0 && (
                  <p className="text-xs text-center text-muted-foreground">
                    Not enough wallet balance (${walletBalance.toFixed(2)} available). Add more in Settings or pay with card.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ) : paymentMethod === "wallet" ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-center mb-4">
                <Wallet className="w-12 h-12 text-primary" />
              </div>
              <CardTitle className="text-2xl text-center">Confirm Purchase</CardTitle>
              <CardDescription className="text-center">
                Pay with your FireWallet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Flames:</span>
                  <span className="font-semibold">{parseInt(amount || "0").toLocaleString()}</span>
                </div>
                {validatedSacCode && (
                  <>
                    <div className="flex justify-between items-center text-green-500">
                      <span className="text-sm">SAC Code ({validatedSacCode.code}):</span>
                      <span className="font-semibold">-5% discount</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>Supporting:</span>
                      <span>{validatedSacCode.creatorUsername}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Original:</span>
                      <span className="line-through text-muted-foreground">${price}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between items-center mt-2 pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Total:</span>
                  <span className="text-2xl font-bold">${finalPrice.toFixed(2)}</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="wallet-password">Confirm Password</Label>
                  <Input
                    id="wallet-password"
                    type="password"
                    placeholder="Enter your account password"
                    value={walletPassword}
                    onChange={(e) => setWalletPassword(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    For security, please confirm your password to complete this purchase
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setPaymentMethod(null);
                      setWalletPassword("");
                    }}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-primary to-primary/80"
                    disabled={loading || !walletPassword}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      `Pay $${finalPrice.toFixed(2)}`
                    )}
                  </Button>
                </div>
              </form>

              <p className="text-xs text-muted-foreground text-center mt-4">
                Flames will be added to your account instantly!
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <CreditCard className="w-12 h-12 text-primary" />
            </div>
            <CardTitle className="text-2xl text-center">FirePay</CardTitle>
            <CardDescription className="text-center">
              Secure Payment Gateway
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Flames:</span>
                  <span className="font-semibold">{parseInt(amount || "0").toLocaleString()}</span>
                </div>
                {validatedSacCode && (
                  <>
                    <div className="flex justify-between items-center text-green-500">
                      <span className="text-sm">SAC Code ({validatedSacCode.code}):</span>
                      <span className="font-semibold">-5% discount</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>Supporting:</span>
                      <span>{validatedSacCode.creatorUsername}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Original:</span>
                      <span className="line-through text-muted-foreground">${price}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between items-center mt-2 pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Total:</span>
                  <span className="text-2xl font-bold">${finalPrice.toFixed(2)}</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <Input
                    id="cardNumber"
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Only Visa and Mastercard accepted
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cardHolder">Card Holder Name</Label>
                  <Input
                    id="cardHolder"
                    placeholder="JOHN DOE"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expiry">Expiry Date</Label>
                    <Input
                      id="expiry"
                      placeholder="MM/YY"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                      maxLength={5}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cvv">CVV</Label>
                    <Input
                      id="cvv"
                      placeholder="123"
                      type="password"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 3))}
                      maxLength={3}
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                  <ShieldCheck className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-green-500">
                    Secured by FirePay encryption
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPaymentMethod(null)}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      `Pay $${finalPrice.toFixed(2)}`
                    )}
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground text-center mt-4">
                  Your purchase will be reviewed by our admin team. Flames will be added to your account after approval.
                </p>
              </form>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default FirePay;
