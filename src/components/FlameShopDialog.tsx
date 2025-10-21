import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FlameShopDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const flamePackages = [
  { amount: 100, price: 4.99, popular: false },
  { amount: 500, price: 19.99, popular: true },
  { amount: 1000, price: 34.99, popular: false },
  { amount: 2500, price: 79.99, popular: false },
  { amount: 5000, price: 149.99, popular: false },
];

const FlameShopDialog = ({ open, onOpenChange }: FlameShopDialogProps) => {
  const navigate = useNavigate();

  const handlePurchase = (amount: number, price: number) => {
    navigate(`/firepay?amount=${amount}&price=${price}`);
    onOpenChange(false);
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {flamePackages.map((pkg) => (
            <Card
              key={pkg.amount}
              className={pkg.popular ? "border-orange-500 border-2 relative" : ""}
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    POPULAR
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

        <p className="text-sm text-muted-foreground text-center mt-4">
          All purchases require admin approval. Flames will be added to your account after approval.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default FlameShopDialog;
