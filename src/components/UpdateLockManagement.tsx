import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Lock, Unlock, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface UpdateLock {
  id: string;
  created_by: string;
  reason: string;
  locked_until: string;
  active: boolean;
  created_at: string;
  bypass_user_ids: string[];
  creator?: {
    username: string;
  };
}

interface User {
  id: string;
  username: string;
  avatar_url: string;
}

export const UpdateLockManagement = () => {
  const [locks, setLocks] = useState<UpdateLock[]>([]);
  const [reason, setReason] = useState("");
  const [lockedUntil, setLockedUntil] = useState("");
  const [loading, setLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedBypassUsers, setSelectedBypassUsers] = useState<User[]>([]);
  const [userSearchOpen, setUserSearchOpen] = useState(false);

  useEffect(() => {
    fetchLocks();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .order("username");

    if (error) {
      toast.error("Failed to fetch users");
      return;
    }

    setAllUsers(data || []);
  };

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

    const bypassUserIds = selectedBypassUsers.map(u => u.id);

    const { error } = await supabase
      .from("update_locks")
      .insert({
        created_by: user.id,
        reason,
        locked_until: new Date(lockedUntil).toISOString(),
        active: true,
        bypass_user_ids: bypassUserIds
      });

    setLoading(false);

    if (error) {
      toast.error("Failed to create update lock");
      return;
    }

    toast.success("Server lock created successfully");
    setReason("");
    setLockedUntil("");
    setSelectedBypassUsers([]);
    fetchLocks();
  };

  const addBypassUser = (user: User) => {
    if (!selectedBypassUsers.find(u => u.id === user.id)) {
      setSelectedBypassUsers([...selectedBypassUsers, user]);
    }
    setUserSearchOpen(false);
  };

  const removeBypassUser = (userId: string) => {
    setSelectedBypassUsers(selectedBypassUsers.filter(u => u.id !== userId));
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
          <div className="space-y-2">
            <Label>Bypass Users (these users can access during lock)</Label>
            <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  Add users to bypass list
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search users..." />
                  <CommandEmpty>No user found.</CommandEmpty>
                  <CommandGroup className="max-h-64 overflow-auto">
                    {allUsers.map((user) => (
                      <CommandItem
                        key={user.id}
                        onSelect={() => addBypassUser(user)}
                      >
                        {user.username}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
            {selectedBypassUsers.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedBypassUsers.map((user) => (
                  <Badge key={user.id} variant="secondary" className="flex items-center gap-1">
                    {user.username}
                    <X 
                      className="w-3 h-3 cursor-pointer" 
                      onClick={() => removeBypassUser(user.id)}
                    />
                  </Badge>
                ))}
              </div>
            )}
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
                    {lock.bypass_user_ids && lock.bypass_user_ids.length > 0 && (
                      <div className="text-sm">
                        <strong>Bypass users:</strong>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {lock.bypass_user_ids.map((userId) => {
                            const user = allUsers.find(u => u.id === userId);
                            return user ? (
                              <Badge key={userId} variant="outline" className="text-xs">
                                {user.username}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
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