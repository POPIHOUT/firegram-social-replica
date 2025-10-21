import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Flame } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface FlameShopDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const flamePackages = [
  { amount: 100, price: 0.99, popular: false },
  { amount: 500, price: 3.99, popular: true },
  { amount: 1000, price: 6.99, popular: false },
  { amount: 2500, price: 14.99, popular: false },
  { amount: 5000, price: 24.99, popular: false },
];

const PRICE_PER_FLAME = 0.01; // $0.01 per flame for custom amounts

const FlameShopDialog = ({ open, onOpenChange }: FlameShopDialogProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [customAmount, setCustomAmount] = useState("");

  const handlePurchase = (amount: number, price: number) => {
    navigate(`/firepay?amount=${amount}&price=${price}`);
    onOpenChange(false);
  };

  const handleCustomPurchase = () => {
    const amount = parseInt(customAmount);
    
    if (!amount || amount < 1) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount of flames (minimum 1)",
        variant: "destructive",
      });
      return;
    }

    if (amount > 100000) {
      toast({
        title: "Amount Too Large",
        description: "Maximum custom amount is 100,000 flames",
        variant: "destructive",
      });
      return;
    }

    const price = amount * PRICE_PER_FLAME;
    navigate(`/firepay?amount=${amount}&price=${price.toFixed(2)}`);
    onOpenChange(false);
    setCustomAmount("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Flame className="w-6 h-6 text-orange-500" />
            Buy Flames
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Custom Amount Section */}
          <Card className="border-2 border-purple-500 bg-purple-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-purple-500" />
                Custom Amount
              </CardTitle>
              <CardDescription>
                Choose your own amount • ${PRICE_PER_FLAME.toFixed(2)} per flame
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="custom-amount">Number of Flames</Label>
                <Input
                  id="custom-amount"
                  type="number"
                  placeholder="Enter amount (1-100,000)"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  min="1"
                  max="100000"
                  className="mt-2"
                />
              </div>
              {customAmount && parseInt(customAmount) > 0 && (
                <div className="text-center p-3 bg-background rounded-lg">
                  <span className="text-2xl font-bold">
                    ${(parseInt(customAmount) * PRICE_PER_FLAME).toFixed(2)}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total price for {parseInt(customAmount).toLocaleString()} flames
                  </p>
                </div>
              )}
              <Button
                onClick={handleCustomPurchase}
                disabled={!customAmount || parseInt(customAmount) < 1}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                Purchase Custom Amount
              </Button>
            </CardContent>
          </Card>

          {/* Pre-defined Packages */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Quick Packages</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {flamePackages.map((pkg) => (
                <Card
                  key={pkg.amount}
                  className={pkg.popular ? "border-orange-500 border-2 relative" : ""}
                >
                  {pkg.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                        BEST VALUE
                      </span>
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-center justify-center mb-2">
                      <Flame className="w-12 h-12 text-orange-500" />
                    </div>
                    <CardTitle className="text-center text-2xl">
                      {pkg.amount.toLocaleString()}
                    </CardTitle>
                    <CardDescription className="text-center">Flames</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <span className="text-3xl font-bold">${pkg.price}</span>
                    </div>
                    <Button
                      onClick={() => handlePurchase(pkg.amount, pkg.price)}
                      className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                    >
                      Purchase
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground text-center mt-4">
          All purchases require admin approval. Flames will be added to your account after approval.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default FlameShopDialog;
