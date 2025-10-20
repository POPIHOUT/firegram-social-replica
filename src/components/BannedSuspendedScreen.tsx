import { AlertCircle, Ban, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface BannedSuspendedScreenProps {
  type: "banned" | "suspended";
  reason?: string;
  suspendedUntil?: string;
}

export const BannedSuspendedScreen = ({ type, reason, suspendedUntil }: BannedSuspendedScreenProps) => {
  const isBanned = type === "banned";
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="flex flex-col items-center text-center space-y-4">
          {isBanned ? (
            <Ban className="w-16 h-16 text-destructive" />
          ) : (
            <Clock className="w-16 h-16 text-warning" />
          )}
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">
              {isBanned ? "Your Account Has Been Banned" : "Your Account Has Been Suspended"}
            </h1>
            
            {isBanned ? (
              <p className="text-muted-foreground">
                Your account has been permanently banned for violating our terms of service.
              </p>
            ) : (
              <p className="text-muted-foreground">
                Your account is temporarily suspended.
                {suspendedUntil && (
                  <span className="block mt-2">
                    Suspension ends: {new Date(suspendedUntil).toLocaleString('en-US')}
                  </span>
                )}
              </p>
            )}
          </div>

          {reason && (
            <div className="w-full p-4 bg-muted rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <AlertCircle className="w-4 h-4" />
                Reason:
              </div>
              <p className="text-sm text-muted-foreground">{reason}</p>
            </div>
          )}

          <div className="w-full pt-4 space-y-3">
            <Button
              className="w-full"
              onClick={() => window.open("https://discord.gg/7w3xaMm6gg", "_blank")}
            >
              Appeal on Discord
            </Button>
            
            <p className="text-xs text-muted-foreground">
              If you think this is a mistake, you can appeal through our Discord server.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
