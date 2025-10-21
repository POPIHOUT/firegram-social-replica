import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Lock, Unlock } from "lucide-react";

interface UpdateLock {
  id: string;
  created_by: string;
  reason: string;
  locked_until: string;
  active: boolean;
  created_at: string;
  creator?: {
    username: string;
  };
}

export const UpdateLockManagement = () => {
  const [locks, setLocks] = useState<UpdateLock[]>([]);
  const [reason, setReason] = useState("");
  const [lockedUntil, setLockedUntil] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLocks();
  }, []);

  const fetchLocks = async () => {
    const { data, error } = await supabase
      .from("update_locks")
      .select(`
        *,
        creator:profiles!update_locks_created_by_fkey(username)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch update locks");
      return;
    }

    setLocks(data || []);
  };

  const createLock = async () => {
    if (!reason || !lockedUntil) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("You must be logged in");
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("update_locks")
      .insert({
        created_by: user.id,
        reason,
        locked_until: new Date(lockedUntil).toISOString(),
        active: true
      });

    setLoading(false);

    if (error) {
      toast.error("Failed to create update lock");
      return;
    }

    toast.success("Update lock created successfully");
    setReason("");
    setLockedUntil("");
    fetchLocks();
  };

  const deactivateLock = async (lockId: string) => {
    const { error } = await supabase
      .from("update_locks")
      .update({ active: false })
      .eq("id", lockId);

    if (error) {
      toast.error("Failed to deactivate lock");
      return;
    }

    toast.success("Lock deactivated");
    fetchLocks();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Create Server Lock
          </CardTitle>
          <CardDescription>
            Lock the app for maintenance. Admins and Support can still access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              placeholder="e.g., Server maintenance, new feature deployment..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lockedUntil">Locked Until</Label>
            <Input
              id="lockedUntil"
              type="datetime-local"
              value={lockedUntil}
              onChange={(e) => setLockedUntil(e.target.value)}
            />
          </div>
          <Button onClick={createLock} disabled={loading}>
            <Lock className="w-4 h-4 mr-2" />
            Create Lock
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Active Locks</h3>
        {locks.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No update locks found
            </CardContent>
          </Card>
        ) : (
          locks.map((lock) => (
            <Card key={lock.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      {lock.active ? (
                        <Lock className="w-4 h-4 text-destructive" />
                      ) : (
                        <Unlock className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className={lock.active ? "text-destructive font-semibold" : "text-muted-foreground"}>
                        {lock.active ? "ACTIVE" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-sm">
                      <strong>Reason:</strong> {lock.reason}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <strong>Created by:</strong> {lock.creator?.username || "Unknown"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <strong>Locked until:</strong> {new Date(lock.locked_until).toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <strong>Created:</strong> {new Date(lock.created_at).toLocaleString()}
                    </p>
                  </div>
                  {lock.active && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deactivateLock(lock.id)}
                    >
                      <Unlock className="w-4 h-4 mr-2" />
                      Deactivate
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};