import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BannedSuspendedScreen } from "./BannedSuspendedScreen";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userStatus, setUserStatus] = useState<{
    banned: boolean;
    suspended: boolean;
    banReason?: string;
    suspendedReason?: string;
    suspendedUntil?: string;
  } | null>(null);

  useEffect(() => {
    checkUserStatus();
  }, []);

  const checkUserStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("banned, suspended, ban_reason, suspended_reason, suspended_until")
        .eq("id", user.id)
        .single();

      if (profile) {
        // Check if suspension has expired
        const now = new Date();
        const suspendedUntil = profile.suspended_until ? new Date(profile.suspended_until) : null;
        const isStillSuspended = profile.suspended && suspendedUntil && suspendedUntil > now;

        if (profile.banned) {
          setUserStatus({
            banned: true,
            suspended: false,
            banReason: profile.ban_reason || undefined,
          });
        } else if (isStillSuspended) {
          setUserStatus({
            banned: false,
            suspended: true,
            suspendedReason: profile.suspended_reason || undefined,
            suspendedUntil: profile.suspended_until || undefined,
          });
        } else if (profile.suspended && suspendedUntil && suspendedUntil <= now) {
          // Clear expired suspension
          await supabase
            .from("profiles")
            .update({ suspended: false, suspended_reason: null, suspended_until: null })
            .eq("id", user.id);
          
          setUserStatus(null);
        } else {
          setUserStatus(null);
        }
      }
    } catch (error) {
      console.error("Error checking user status:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (userStatus?.banned) {
    return (
      <BannedSuspendedScreen
        type="banned"
        reason={userStatus.banReason}
      />
    );
  }

  if (userStatus?.suspended) {
    return (
      <BannedSuspendedScreen
        type="suspended"
        reason={userStatus.suspendedReason}
        suspendedUntil={userStatus.suspendedUntil}
      />
    );
  }

  return <>{children}</>;
};
