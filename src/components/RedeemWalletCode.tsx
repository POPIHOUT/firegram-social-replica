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
import { Loader2, Gift, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CodeInfo {
  value: number;
  max_uses: number;
  current_uses: number;
  expires_at: string | null;
}

export const RedeemWalletCode = () => {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [codeInfo, setCodeInfo] = useState<CodeInfo | null>(null);

  const handleCheckCode = async () => {
    if (!code.trim()) {
      toast.error("Please enter a code");
      return;
    }

    setChecking(true);
    setCodeInfo(null);
    
    const { data, error } = await supabase
      .from("wallet_codes")
      .select("value, max_uses, current_uses, expires_at, active")
      .eq("code", code.trim().toUpperCase())
      .maybeSingle();

    if (error) {
      toast.error("Failed to check code");
      console.error(error);
      setChecking(false);
      return;
    }

    if (!data) {
      toast.error("Invalid code");
      setChecking(false);
      return;
    }

    if (!data.active) {
      toast.error("This code is no longer active");
      setChecking(false);
      return;
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      toast.error("This code has expired");
      setChecking(false);
      return;
    }

    if (data.current_uses >= data.max_uses) {
      toast.error("This code has been fully redeemed");
      setChecking(false);
      return;
    }

    setCodeInfo({
      value: data.value,
      max_uses: data.max_uses,
      current_uses: data.current_uses,
      expires_at: data.expires_at,
    });
    
    toast.success("Code verified!");
    setChecking(false);
  };

  const handleRedeem = async () => {
    if (!code.trim() || !codeInfo) {
      toast.error("Please check the code first");
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
      setCodeInfo(null);
      setOpen(false);
      // Refresh the page to update wallet balance
      window.location.reload();
    }
    setRedeeming(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        setCode("");
        setCodeInfo(null);
      }
    }}>
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
            <div className="flex gap-2">
              <Input
                id="redemption-code"
                placeholder="Enter your code"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setCodeInfo(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && !codeInfo && handleCheckCode()}
                className="font-mono uppercase"
                style={{ textTransform: "uppercase" }}
              />
              <Button 
                onClick={handleCheckCode} 
                disabled={checking || !code.trim() || !!codeInfo}
                variant="secondary"
              >
                {checking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Check"
                )}
              </Button>
            </div>
          </div>

          {codeInfo && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">Valid Code!</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Value:</span>
                  <span className="font-bold text-2xl text-green-600">${codeInfo.value.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Uses left:</span>
                  <Badge variant="secondary">{codeInfo.max_uses - codeInfo.current_uses} / {codeInfo.max_uses}</Badge>
                </div>
                {codeInfo.expires_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expires:</span>
                    <span className="text-sm">{new Date(codeInfo.expires_at).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <Button 
            onClick={handleRedeem} 
            disabled={redeeming || !codeInfo} 
            className="w-full"
          >
            {redeeming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redeeming...
              </>
            ) : (
              <>
                <Gift className="mr-2 h-4 w-4" />
                {codeInfo ? `Redeem $${codeInfo.value.toFixed(2)}` : "Check code first"}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
