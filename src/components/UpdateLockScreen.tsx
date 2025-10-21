import { Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface UpdateLockScreenProps {
  reason: string;
  lockedUntil: string;
  creatorUsername: string;
}

export const UpdateLockScreen = ({ reason, lockedUntil, creatorUsername }: UpdateLockScreenProps) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-secondary/20">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-destructive/10 rounded-full">
              <Lock className="w-12 h-12 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-2xl">Update Lock</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            The application is currently locked for maintenance.
          </p>
          <div className="space-y-2 text-sm bg-secondary/50 p-4 rounded-lg">
            <p><strong>Reason:</strong> {reason}</p>
            <p><strong>Locked by:</strong> {creatorUsername}</p>
            <p><strong>Available again:</strong> {new Date(lockedUntil).toLocaleString()}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Please check back later. We apologize for any inconvenience.
          </p>
          <Button variant="outline" onClick={handleLogout} className="w-full">
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};