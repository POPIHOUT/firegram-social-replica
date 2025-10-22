import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Gift } from "lucide-react";

export const RedeemWalletCode = () => {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  const handleRedeem = async () => {
    if (!code.trim()) {
      toast.error("Please enter a code");
      return;
    }

    setRedeeming(true);
    const { data, error } = await supabase.rpc("redeem_wallet_code", {
      code_text: code.trim(),
    });

    if (error) {
      toast.error(error.message || "Failed to redeem code");
      console.error(error);
    } else {
      toast.success(`Code redeemed! $${data} added to your wallet`);
      setCode("");
      setOpen(false);
      // Refresh the page to update wallet balance
      window.location.reload();
    }
    setRedeeming(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Gift className="mr-2 h-4 w-4" />
          Redeem Code
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Redeem Wallet Code</DialogTitle>
          <DialogDescription>
            Enter your wallet code to add money to your wallet balance.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="redemption-code">Code</Label>
            <Input
              id="redemption-code"
              placeholder="Enter your code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRedeem()}
              className="font-mono uppercase"
              style={{ textTransform: "uppercase" }}
            />
          </div>
          <Button onClick={handleRedeem} disabled={redeeming} className="w-full">
            {redeeming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redeeming...
              </>
            ) : (
              <>
                <Gift className="mr-2 h-4 w-4" />
                Redeem Code
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
