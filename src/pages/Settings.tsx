import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Flame, Sparkles } from "lucide-react";
import firegramLogo from "@/assets/firegram-logo.png";

const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [purchasingPremium, setPurchasingPremium] = useState(false);
  const [userFlames, setUserFlames] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("flames, is_premium")
      .eq("id", user.id)
      .single();

    if (profile) {
      setUserFlames(profile.flames);
      setIsPremium(profile.is_premium);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your new passwords match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: "Password updated",
        description: "Your password has been changed successfully",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Error updating password:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePurchasePremium = async () => {
    setPurchasingPremium(true);
    try {
      const { error } = await supabase.rpc("purchase_premium");

      if (error) throw error;

      toast({
        title: "Premium Activated! 🔥",
        description: "You are now a FireGram Premium member!",
      });

      await fetchUserData();
    } catch (error: any) {
      console.error("Error purchasing premium:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to purchase premium",
        variant: "destructive",
      });
    } finally {
      setPurchasingPremium(false);
    }
  };

  return (
    <div className="min-h-screen pb-safe">
      <Navigation />
      <main className="max-w-2xl mx-auto pt-16 sm:pt-20 px-4 pb-20 sm:pb-24">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>

        <div className="space-y-6">
          <Card className={isPremium ? "border-orange-500/50 bg-gradient-to-br from-orange-500/5 to-transparent" : ""}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>FireGram Premium</CardTitle>
                {isPremium && <Sparkles className="w-5 h-5 text-orange-500" />}
              </div>
              <CardDescription>
                {isPremium 
                  ? "You are a FireGram Premium member! 🔥"
                  : "Unlock exclusive features with FireGram Premium"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isPremium ? (
                <div className="flex items-center gap-3 p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
                  <img src={firegramLogo} alt="FireGram" className="w-12 h-12" />
                  <div>
                    <p className="font-semibold text-orange-500">Premium Active</p>
                    <p className="text-sm text-muted-foreground">Exclusive fire effect on your profile</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                    <img src={firegramLogo} alt="FireGram" className="w-12 h-12" />
                    <div className="flex-1">
                      <p className="font-semibold mb-2">Premium Benefits:</p>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>✨ Exclusive FireGram badge</li>
                        <li>🔥 Epic fire effect on your profile</li>
                        <li>⚡ Stand out from the crowd</li>
                      </ul>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
                    <div className="flex items-center gap-2">
                      <Flame className="w-5 h-5 text-orange-500" />
                      <span className="font-semibold">Your Flames: {userFlames}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">Need: 1000 🔥</span>
                  </div>
                  <Button
                    onClick={handlePurchasePremium}
                    disabled={purchasingPremium || userFlames < 1000}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                  >
                    {purchasingPremium ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Purchasing...
                      </>
                    ) : (
                      <>
                        <Flame className="mr-2 h-4 w-4" />
                        Purchase Premium (1000 🔥)
                      </>
                    )}
                  </Button>
                  {userFlames < 1000 && (
                    <p className="text-xs text-center text-muted-foreground">
                      You need {1000 - userFlames} more flames to purchase premium
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                    minLength={6}
                  />
                </div>

                <div>
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                    minLength={6}
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Password"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>
                Manage your account settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate("/auth");
                }}
              >
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Settings;
