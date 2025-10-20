import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Flame, ShoppingBag, Check } from "lucide-react";

interface Effect {
  id: string;
  name: string;
  description: string;
  price: number;
  effect_type: string;
  icon: string;
}

const Shop = () => {
  const [loading, setLoading] = useState(true);
  const [effects, setEffects] = useState<Effect[]>([]);
  const [ownedEffects, setOwnedEffects] = useState<Set<string>>(new Set());
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [userFlames, setUserFlames] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkPremiumAndFetch();
  }, []);

  const checkPremiumAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_premium, flames")
      .eq("id", session.user.id)
      .single();

    if (!profile?.is_premium) {
      toast({
        title: "Premium Required",
        description: "You need FireGram Premium to access the shop",
        variant: "destructive",
      });
      navigate("/settings");
      return;
    }

    setIsPremium(true);
    setUserFlames(profile.flames);
    await fetchEffects(session.user.id);
  };

  const fetchEffects = async (userId: string) => {
    try {
      const [effectsRes, ownedRes] = await Promise.all([
        supabase.from("effects").select("*").order("price"),
        supabase.from("user_effects").select("effect_id").eq("user_id", userId),
      ]);

      if (effectsRes.data) setEffects(effectsRes.data);
      if (ownedRes.data) {
        setOwnedEffects(new Set(ownedRes.data.map((e) => e.effect_id)));
      }
    } catch (error) {
      console.error("Error fetching effects:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (effectId: string, price: number) => {
    setPurchasing(effectId);
    try {
      const { error } = await supabase.rpc("purchase_effect", {
        effect_uuid: effectId,
      });

      if (error) throw error;

      toast({
        title: "Effect Purchased! ✨",
        description: "You can now use this effect on your profile",
      });

      setUserFlames((prev) => prev - price);
      setOwnedEffects((prev) => new Set([...prev, effectId]));
    } catch (error: any) {
      console.error("Error purchasing effect:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to purchase effect",
        variant: "destructive",
      });
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-safe">
      <Navigation />
      <main className="max-w-6xl mx-auto pt-16 sm:pt-20 px-4 pb-20 sm:pb-24">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold">Effects Shop</h1>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 rounded-lg border border-orange-500/20">
              <Flame className="w-5 h-5 text-orange-500" />
              <span className="font-semibold">{userFlames}</span>
            </div>
          </div>

          <p className="text-muted-foreground">
            Premium exclusive effects to customize your profile
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {effects.map((effect) => {
              const owned = ownedEffects.has(effect.id);
              const canAfford = userFlames >= effect.price;

              return (
                <Card
                  key={effect.id}
                  className={owned ? "border-primary/50 bg-primary/5" : ""}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <span className="text-4xl">{effect.icon}</span>
                      {owned && <Badge variant="default">Owned</Badge>}
                    </div>
                    <CardTitle className="text-xl">{effect.name}</CardTitle>
                    <CardDescription>{effect.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-orange-500" />
                        <span className="font-semibold">{effect.price}</span>
                      </div>
                      {owned ? (
                        <Button variant="outline" disabled>
                          <Check className="mr-2 h-4 w-4" />
                          Owned
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handlePurchase(effect.id, effect.price)}
                          disabled={purchasing === effect.id || !canAfford}
                          className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                        >
                          {purchasing === effect.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Buying...
                            </>
                          ) : (
                            <>
                              <ShoppingBag className="mr-2 h-4 w-4" />
                              Buy
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                    {!canAfford && !owned && (
                      <p className="text-xs text-destructive mt-2">
                        Need {effect.price - userFlames} more flames
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Shop;