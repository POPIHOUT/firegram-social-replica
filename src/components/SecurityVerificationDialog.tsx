import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, Shield } from "lucide-react";

interface SecurityVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: () => void;
  title?: string;
  description?: string;
}

export function SecurityVerificationDialog({
  open,
  onOpenChange,
  onVerified,
  title = "Security Verification",
  description = "Please verify your identity to continue",
}: SecurityVerificationDialogProps) {
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasMfa, setHasMfa] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const checkMfa = async () => {
      if (!open) return;
      
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp?.find(f => f.status === 'verified');
      
      if (totpFactor) {
        setHasMfa(true);
        setMfaFactorId(totpFactor.id);
      } else {
        setHasMfa(false);
        setMfaFactorId("");
      }
    };

    checkMfa();
  }, [open]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Verify password
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        throw new Error("User email not found");
      }

      const { error: passwordError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password,
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

      // Verify MFA if enabled
      if (hasMfa) {
        if (mfaCode.length !== 6) {
          toast({
            title: "Invalid 2FA Code",
            description: "Please enter a 6-digit code",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
          factorId: mfaFactorId
        });

        if (challengeError || !challenge) {
          throw challengeError || new Error("Failed to create MFA challenge");
        }

        const { error: verifyError } = await supabase.auth.mfa.verify({
          factorId: mfaFactorId,
          challengeId: challenge.id,
          code: mfaCode
        });

        if (verifyError) {
          toast({
            title: "Invalid 2FA Code",
            description: "The code you entered is incorrect",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      // All verifications passed
      toast({
        title: "Verified",
        description: "Identity confirmed successfully",
      });
      
      setPassword("");
      setMfaCode("");
      onVerified();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Account Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
            />
          </div>

          {hasMfa && (
            <div className="space-y-2">
              <Label htmlFor="mfa-code" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                2FA Code
              </Label>
              <Input
                id="mfa-code"
                type="text"
                placeholder="000000"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                required
                className="text-center text-2xl tracking-widest"
              />
              <p className="text-xs text-muted-foreground">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPassword("");
                setMfaCode("");
                onOpenChange(false);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !password || (hasMfa && mfaCode.length !== 6)}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
