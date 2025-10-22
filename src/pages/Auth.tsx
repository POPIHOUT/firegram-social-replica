import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Flame } from "lucide-react";
import firegramLogo from "@/assets/firegram-logo.png";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [loading, setLoading] = useState(false);
  const [showMfaInput, setShowMfaInput] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaFactorId, setMfaFactorId] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          // If MFA is required, fetch factors and prompt for code
          const msg = error.message?.toLowerCase() || "";
          if (msg.includes('mfa') || msg.includes('factor')) {
            try {
              const { data: factors } = await supabase.auth.mfa.listFactors();
              const totpFactor = factors?.totp?.find(f => f.status === 'verified');
              if (totpFactor) {
                setMfaFactorId(totpFactor.id);
                setShowMfaInput(true);
                setLoading(false);
                toast({
                  title: "2FA Required",
                  description: "Please enter your 6-digit code from Google Authenticator",
                });
                return;
              }
            } catch (_) {}

            toast({
              title: "Two‑factor setup issue",
              description: "No TOTP factor found on your account.",
              variant: 'destructive',
            });
            setLoading(false);
            return;
          }
          throw error;
        }

        // After successful password login, check if user has MFA
        if (data.user) {
          const { data: factors } = await supabase.auth.mfa.listFactors();
          const totpFactor = factors?.totp?.find(f => f.status === 'verified');
          
          if (totpFactor) {
            // User has MFA enabled, show MFA input
            setMfaFactorId(totpFactor.id);
            setShowMfaInput(true);
            setLoading(false);
            toast({
              title: "2FA Required",
              description: "Please enter your 6-digit code from Google Authenticator",
            });
            return;
          }

          // No MFA required, login successful
          toast({
            title: "Welcome back!",
            description: "You've successfully logged in.",
          });
          navigate("/feed");
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/feed`,
            data: {
              username: username,
              full_name: `${firstName} ${lastName}`.trim() || username,
              first_name: firstName,
              last_name: lastName,
              date_of_birth: dateOfBirth,
            },
          },
        });

        if (data.user) {
          await supabase.from("profiles").update({
            first_name: firstName,
            last_name: lastName,
            date_of_birth: dateOfBirth,
          }).eq("id", data.user.id);
        }

        if (error) throw error;

        toast({
          title: "Account created!",
          description: "Welcome to Firegram! 🔥",
        });
        navigate("/feed");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mfaCode.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter a 6-digit code",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (!mfaFactorId) throw new Error("No MFA factor found");

      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: mfaFactorId
      });

      if (challengeError || !challenge) throw challengeError || new Error("Failed to create challenge");

      const { error } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challenge.id,
        code: mfaCode
      });

      if (error) throw error;

      toast({
        title: "Welcome back!",
        description: "You've successfully logged in.",
      });
      navigate("/feed");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Invalid verification code",
        variant: "destructive",
      });
      setMfaCode("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-card">
      <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-sm glow-fire">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center mb-2">
            <div className="relative w-20 h-20 rounded-full fire-gradient p-1 animate-pulse-slow">
              <img 
                src={firegramLogo} 
                alt="Firegram" 
                className="w-full h-full rounded-full object-cover"
              />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">
            <span className="fire-text">Firegram</span>
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {isLogin ? "Welcome back! Sign in to continue" : "Join the fire and create your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showMfaInput ? (
            <form onSubmit={handleMfaVerify} className="space-y-4">
              <div className="text-center mb-4">
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code from your Google Authenticator app
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mfa-code">2FA Code</Label>
                <Input
                  id="mfa-code"
                  type="text"
                  placeholder="000000"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  required
                  className="text-center text-2xl tracking-widest bg-muted border-border focus:border-primary transition-colors"
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                className="w-full fire-gradient hover:opacity-90 transition-opacity font-semibold"
                disabled={loading || mfaCode.length !== 6}
              >
                {loading ? "Verifying..." : "Verify Code"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setShowMfaInput(false);
                  setMfaCode("");
                  setMfaFactorId("");
                  setPassword("");
                }}
              >
                Back to Login
              </Button>
            </form>
          ) : (
            <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="John"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required={!isLogin}
                      className="bg-muted border-border focus:border-primary transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required={!isLogin}
                      className="bg-muted border-border focus:border-primary transition-colors"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    required={!isLogin}
                    className="bg-muted border-border focus:border-primary transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required={!isLogin}
                    className="bg-muted border-border focus:border-primary transition-colors"
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-muted border-border focus:border-primary transition-colors"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-muted border-border focus:border-primary transition-colors"
              />
            </div>
            <Button
              type="submit"
              className="w-full fire-gradient hover:opacity-90 transition-opacity font-semibold"
              disabled={loading}
            >
              {loading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
            </Button>
            </form>
          )}

          {!showMfaInput && (
            <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
