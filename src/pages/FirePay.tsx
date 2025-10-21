import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard, ShieldCheck } from "lucide-react";
import Navigation from "@/components/Navigation";

const FirePay = () => {
  const [searchParams] = useSearchParams();
  const amount = searchParams.get("amount");
  const price = searchParams.get("price");
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");

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

      const { error } = await supabase.from("flame_purchases").insert({
        user_id: session.user.id,
        flame_amount: parseInt(amount || "0"),
        price_usd: parseFloat(price || "0"),
        card_type: cardType,
        card_last4: last4,
        card_holder_name: cardHolder,
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

  if (!amount || !price) {
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
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Flames:</span>
                <span className="font-semibold">{parseInt(amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-muted-foreground">Total:</span>
                <span className="text-2xl font-bold">${price}</span>
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
                  `Pay $${price}`
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center mt-4">
                Your purchase will be reviewed by our admin team. Flames will be added to your account after approval.
              </p>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default FirePay;
