import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Flame, Sparkles, Upload, ShoppingBag, X, Wallet, CreditCard, Shield, QrCode, Copy } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import firegramLogo from "@/assets/firegram-logo.png";
import { RedeemWalletCode } from "@/components/RedeemWalletCode";
import QRCode from "qrcode";

const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [purchasingPremium, setPurchasingPremium] = useState(false);
  const [userFlames, setUserFlames] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [showOwnFireEffect, setShowOwnFireEffect] = useState(true);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [customBackgroundUrl, setCustomBackgroundUrl] = useState<string>("");
  const [showCustomBackground, setShowCustomBackground] = useState(true);
  const [premiumUntil, setPremiumUntil] = useState<string | null>(null);
  const [ownedEffects, setOwnedEffects] = useState<any[]>([]);
  const [selectedEffectId, setSelectedEffectId] = useState<string | null>(null);
  const [cancellingPremium, setCancellingPremium] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [qrCode, setQrCode] = useState<string>("");
  const [totpSecret, setTotpSecret] = useState<string>("");
  const [verifyCode, setVerifyCode] = useState("");
  const [enablingMfa, setEnablingMfa] = useState(false);
  const [disablingMfa, setDisablingMfa] = useState(false);
  const [secretTimer, setSecretTimer] = useState(60);
  const [showSecret, setShowSecret] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchUserData();
    checkMfaStatus();
  }, []);

  // Timer countdown for secret key
  useEffect(() => {
    if (showSecret && secretTimer > 0) {
      const interval = setInterval(() => {
        setSecretTimer((prev) => {
          if (prev <= 1) {
            setShowSecret(false);
            setTotpSecret("");
            setQrCode("");
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [showSecret, secretTimer]);

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("flames, is_premium, show_own_fire_effect, custom_background_url, show_custom_background, premium_until, selected_effect_id, wallet_balance")
      .eq("id", user.id)
      .single();

    if (profile) {
      setUserFlames(profile.flames);
      setIsPremium(profile.is_premium);
      setShowOwnFireEffect(profile.show_own_fire_effect ?? true);
      setCustomBackgroundUrl(profile.custom_background_url || "");
      setShowCustomBackground(profile.show_custom_background ?? true);
      setPremiumUntil(profile.premium_until);
      setSelectedEffectId(profile.selected_effect_id);
      setWalletBalance(Number(profile.wallet_balance) || 0);
      
      // Fetch owned effects if premium
      if (profile.is_premium) {
        const { data: effectsData } = await supabase
          .from("user_effects")
          .select("effect_id, effects(*)")
          .eq("user_id", user.id);
        
        if (effectsData) {
          setOwnedEffects(effectsData.map((e: any) => e.effects));
        }
      }
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

  const handleToggleFireEffect = async (checked: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({ show_own_fire_effect: checked })
        .eq("id", user.id);

      if (error) throw error;

      setShowOwnFireEffect(checked);
      toast({
        title: checked ? "Fire effect enabled" : "Fire effect disabled",
        description: checked 
          ? "You will now see the fire effect on your profile" 
          : "Fire effect hidden from your view",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleCustomBackground = async (checked: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({ show_custom_background: checked })
        .eq("id", user.id);

      if (error) throw error;

      setShowCustomBackground(checked);
      toast({
        title: checked ? "Custom background enabled" : "Custom background disabled",
        description: checked 
          ? "Your custom background is now visible" 
          : "Custom background hidden",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if it's a video (but not GIF) and validate duration
    if (file.type.startsWith('video/') && !file.name.toLowerCase().endsWith('.gif')) {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      const checkDuration = new Promise<boolean>((resolve) => {
        video.onloadedmetadata = () => {
          window.URL.revokeObjectURL(video.src);
          const duration = video.duration;
          resolve(duration <= 180); // 3 minutes = 180 seconds
        };
        video.src = URL.createObjectURL(file);
      });

      const isValidDuration = await checkDuration;
      if (!isValidDuration) {
        toast({
          title: "Video too long",
          description: "Video must be maximum 3 minutes",
          variant: "destructive",
        });
        return;
      }
    }

    setUploadingBackground(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/background-${Date.now()}.${fileExt}`;

      // Delete old background if exists
      if (customBackgroundUrl) {
        const oldPath = customBackgroundUrl.split('/').slice(-2).join('/');
        await supabase.storage.from("avatars").remove([oldPath]);
      }

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ custom_background_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setCustomBackgroundUrl(publicUrl);
      
      const fileType = file.type.startsWith('video/') || file.name.toLowerCase().endsWith('.gif') 
        ? 'video/GIF' 
        : 'image';
      
      toast({
        title: "Background updated",
        description: `Your custom ${fileType} background has been set`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingBackground(false);
    }
  };

  const handleSelectEffect = async (effectId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({ selected_effect_id: effectId || null })
        .eq("id", user.id);

      if (error) throw error;

      setSelectedEffectId(effectId || null);
      toast({
        title: effectId ? "Effect Selected" : "Effect Removed",
        description: effectId ? "Your profile effect has been updated" : "Profile effect removed",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };


  const handleCancelPremium = async () => {
    if (!confirm("Are you sure? You won't get your flames back!")) return;

    setCancellingPremium(true);
    try {
      const { error } = await supabase.rpc("cancel_premium");

      if (error) throw error;

      toast({
        title: "Premium Cancelled",
        description: "Your premium subscription has been cancelled",
      });

      await fetchUserData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCancellingPremium(false);
    }
  };

  const checkMfaStatus = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      
      const totpFactor = data?.totp?.find(f => f.status === 'verified');
      setMfaEnabled(!!totpFactor);
    } catch (error: any) {
      console.error("Error checking MFA status:", error);
    }
  };

  const handleEnableMfa = async () => {
    setEnablingMfa(true);
    try {
      // Remove ALL existing factors (both verified and unverified)
      const { data: existingFactors } = await supabase.auth.mfa.listFactors();
      
      if (existingFactors?.totp && existingFactors.totp.length > 0) {
        for (const factor of existingFactors.totp) {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
        }
      }

      // Create new factor with timestamp to ensure uniqueness
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `FireGram_${Date.now()}`
      });

      if (error) throw error;

      setTotpSecret(data.totp.secret);
      setQrCode("enabled");
      setShowSecret(true);
      setSecretTimer(60);

      toast({
        title: "Secret Key Generated",
        description: "Save this key now! It will disappear in 60 seconds",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setEnablingMfa(false);
    }
  };

  const handleVerifyAndEnable = async () => {
    if (verifyCode.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter a 6-digit code",
        variant: "destructive",
      });
      return;
    }

    setEnablingMfa(true);
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp?.[0];
      
      if (!totpFactor) throw new Error("No TOTP factor found");

      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: totpFactor.id,
        code: verifyCode
      });

      if (error) throw error;

      setMfaEnabled(true);
      setQrCode("");
      setTotpSecret("");
      setVerifyCode("");

      toast({
        title: "2FA Enabled! 🔒",
        description: "Your account is now protected with two-factor authentication",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Invalid verification code",
        variant: "destructive",
      });
    } finally {
      setEnablingMfa(false);
    }
  };

  const handleDisableMfa = async () => {
    if (!confirm("Are you sure you want to disable 2FA?")) return;

    setDisablingMfa(true);
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp?.find(f => f.status === 'verified');
      
      if (!totpFactor) throw new Error("No verified TOTP factor found");

      const { error } = await supabase.auth.mfa.unenroll({
        factorId: totpFactor.id
      });

      if (error) throw error;

      setMfaEnabled(false);
      toast({
        title: "2FA Disabled",
        description: "Two-factor authentication has been disabled",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDisablingMfa(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(totpSecret);
    toast({
      title: "Copied!",
      description: "Secret key copied to clipboard",
    });
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
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                <CardTitle>FireWallet</CardTitle>
              </div>
              <CardDescription>
                Redeem wallet codes to add money instantly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-8 h-8 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Wallet Balance</p>
                      <p className="text-2xl font-bold">${walletBalance.toFixed(2)}</p>
                    </div>
                  </div>
                  <RedeemWalletCode />
                </div>
                
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    💡 Use wallet codes to add money to your balance. Codes are provided by admins.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

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
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
                    <img src={firegramLogo} alt="FireGram" className="w-12 h-12" />
                    <div className="flex-1">
                      <p className="font-semibold text-orange-500">Premium Active</p>
                      <p className="text-sm text-muted-foreground">Exclusive fire effect on your profile</p>
                      {premiumUntil && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Expires: {new Date(premiumUntil).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={handleCancelPremium}
                      disabled={cancellingPremium}
                    >
                      {cancellingPremium ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate("/shop")}
                  >
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    Visit Effects Shop
                  </Button>

                  {ownedEffects && ownedEffects.length > 0 && (
                    <div className="space-y-2">
                      <Label>Profile Effect</Label>
                      <Select value={selectedEffectId || "none"} onValueChange={(value) => handleSelectEffect(value === "none" ? "" : value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an effect" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          <SelectItem value="none">None</SelectItem>
                          {ownedEffects.map((effect) => (
                            effect && effect.id ? (
                              <SelectItem key={effect.id} value={effect.id}>
                                {effect.icon} {effect.name}
                              </SelectItem>
                            ) : null
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Choose which effect appears on your profile
                      </p>
                    </div>
                  )}

                  <div className="space-y-4 p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="fire-effect">Profile Effect Visibility</Label>
                        <p className="text-xs text-muted-foreground">Toggle to see your profile effect on your own profile</p>
                      </div>
                      <Switch
                        id="fire-effect"
                        checked={showOwnFireEffect}
                        onCheckedChange={handleToggleFireEffect}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <Label htmlFor="custom-bg">Show custom background</Label>
                          <p className="text-xs text-muted-foreground">Everyone can see your custom background when enabled</p>
                        </div>
                        <Switch
                          id="custom-bg"
                          checked={showCustomBackground}
                          onCheckedChange={handleToggleCustomBackground}
                        />
                      </div>
                      
                      <Label htmlFor="background-upload">Custom Background</Label>
                      <p className="text-xs text-muted-foreground mb-2">Upload image, GIF or video (max 3 min) for your profile background</p>
                      {customBackgroundUrl && (
                        <div className="relative w-full h-32 mb-2 rounded-lg overflow-hidden">
                          {customBackgroundUrl.includes('.mp4') || customBackgroundUrl.includes('.webm') || customBackgroundUrl.includes('.mov') ? (
                            <video 
                              src={customBackgroundUrl} 
                              className="w-full h-full object-cover"
                              autoPlay
                              loop
                              muted
                            />
                          ) : (
                            <img 
                              src={customBackgroundUrl} 
                              alt="Custom background" 
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Input
                          id="background-upload"
                          type="file"
                          accept="image/*,.gif,video/*"
                          onChange={handleBackgroundUpload}
                          disabled={uploadingBackground}
                          className="flex-1"
                        />
                        {uploadingBackground && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                      </div>
                    </div>
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
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
                      <div className="flex items-center gap-2">
                        <Flame className="w-5 h-5 text-orange-500" />
                        <span className="font-semibold">Your Flames: {userFlames}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">Need: 1000 🔥</span>
                    </div>
                    <p className="text-xs text-center text-muted-foreground">(Valid for 1 month)</p>
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
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <CardTitle>Two-Factor Authentication (2FA)</CardTitle>
              </div>
              <CardDescription>
                Add an extra layer of security with Google Authenticator
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mfaEnabled ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                      <div className="flex items-center gap-3">
                        <Shield className="w-8 h-8 text-green-500" />
                        <div>
                          <p className="font-semibold text-green-500">2FA Enabled</p>
                          <p className="text-sm text-muted-foreground">Your account is protected</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        onClick={handleDisableMfa}
                        disabled={disablingMfa}
                      >
                        {disablingMfa ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Disable"
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {!qrCode ? (
                      <>
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground mb-2">
                            🔒 Protect your account with an extra security layer
                          </p>
                          <p className="text-sm text-muted-foreground">
                            You'll need Google Authenticator app to scan the QR code
                          </p>
                        </div>
                        <Button
                          onClick={handleEnableMfa}
                          disabled={enablingMfa}
                          className="w-full"
                        >
                          {enablingMfa ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            <>
                              <Shield className="mr-2 h-4 w-4" />
                              Enable 2FA
                            </>
                          )}
                        </Button>
                      </>
                    ) : (
                      <div className="space-y-4">
                        {showSecret ? (
                          <>
                            <div className="text-center space-y-2">
                              <p className="font-semibold">Enter this key in Google Authenticator</p>
                              <p className="text-sm text-destructive font-semibold">
                                ⏱️ Time remaining: {secretTimer} seconds
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Save this key now! It will disappear after the timer ends
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label>Secret Key</Label>
                              <div className="flex gap-2">
                                <Input
                                  value={totpSecret}
                                  readOnly
                                  className="font-mono text-sm"
                                />
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={copySecret}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="p-4 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground">
                              The secret key has been hidden for security.
                            </p>
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label htmlFor="verify-code">Enter 6-digit code from app</Label>
                          <Input
                            id="verify-code"
                            type="text"
                            placeholder="000000"
                            value={verifyCode}
                            onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            maxLength={6}
                            className="text-center text-2xl tracking-widest"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setQrCode("");
                              setTotpSecret("");
                              setVerifyCode("");
                              setShowSecret(false);
                              setSecretTimer(60);
                            }}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleVerifyAndEnable}
                            disabled={verifyCode.length !== 6 || enablingMfa || !showSecret}
                            className="flex-1"
                          >
                            {enablingMfa ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Verify & Enable"
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
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
