import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Shield, Users, FileText, Film, Ban, Clock, Trash2, CheckCircle, XCircle, Loader2, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface User {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  is_admin: boolean;
  is_verified: boolean;
  is_support: boolean;
  banned: boolean;
  suspended: boolean;
  suspended_until: string | null;
  ban_reason: string | null;
  suspended_reason: string | null;
  created_at: string;
}

interface Post {
  id: string;
  image_url: string;
  caption: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string;
  };
}

interface Reel {
  id: string;
  video_url: string;
  caption: string;
  likes_count: number;
  views_count: number;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string;
  };
}

const Admin = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [suspendReason, setSuspendReason] = useState("");
  const [suspendDays, setSuspendDays] = useState(7);
  const [rolesDialogOpen, setRolesDialogOpen] = useState(false);
  const [stats, setStats] = useState({ users: 0, posts: 0, reels: 0 });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_support")
      .eq("id", session.user.id)
      .single();

    if (!profile?.is_support) {
      toast({
        title: "Access Denied",
        description: "You don't have admin access",
        variant: "destructive",
      });
      navigate("/feed");
      return;
    }

    fetchData();
  };

  const fetchData = async () => {
    try {
      const [usersRes, postsRes, reelsRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("posts").select("*, profiles(username, avatar_url)").order("created_at", { ascending: false }),
        supabase.from("reels").select("*, profiles(username, avatar_url)").order("created_at", { ascending: false }),
      ]);

      if (usersRes.data) setUsers(usersRes.data);
      if (postsRes.data) setPosts(postsRes.data);
      if (reelsRes.data) setReels(reelsRes.data);

      setStats({
        users: usersRes.data?.length || 0,
        posts: postsRes.data?.length || 0,
        reels: reelsRes.data?.length || 0,
      });
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async () => {
    if (!selectedUser || !banReason.trim()) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ banned: true, ban_reason: banReason })
        .eq("id", selectedUser.id);

      if (error) throw error;

      toast({
        title: "User Banned",
        description: `${selectedUser.username} has been banned`,
      });

      setBanDialogOpen(false);
      setBanReason("");
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSuspendUser = async () => {
    if (!selectedUser || !suspendReason.trim()) return;

    const suspendUntil = new Date();
    suspendUntil.setDate(suspendUntil.getDate() + suspendDays);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          suspended: true,
          suspended_until: suspendUntil.toISOString(),
          suspended_reason: suspendReason,
        })
        .eq("id", selectedUser.id);

      if (error) throw error;

      toast({
        title: "User Suspended",
        description: `${selectedUser.username} has been suspended for ${suspendDays} days`,
      });

      setSuspendDialogOpen(false);
      setSuspendReason("");
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUnbanUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ banned: false, ban_reason: null })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "User Unbanned",
        description: "User has been unbanned successfully",
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUnsuspendUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ suspended: false, suspended_until: null, suspended_reason: null })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "User Unsuspended",
        description: "User has been unsuspended successfully",
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    try {
      const { error } = await supabase.from("posts").delete().eq("id", postId);

      if (error) throw error;

      toast({
        title: "Post Deleted",
        description: "Post has been deleted successfully",
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteReel = async (reelId: string) => {
    if (!confirm("Are you sure you want to delete this reel?")) return;

    try {
      const { error } = await supabase.from("reels").delete().eq("id", reelId);

      if (error) throw error;

      toast({
        title: "Reel Deleted",
        description: "Reel has been deleted successfully",
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateRoles = async (userId: string, roles: { is_admin?: boolean; is_verified?: boolean; is_support?: boolean }) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update(roles)
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Roles Updated",
        description: "User roles have been updated successfully",
      });

      await fetchData();
      
      // Update selected user after refresh
      const updatedUser = users.find(u => u.id === userId);
      if (updatedUser) {
        setSelectedUser(updatedUser);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="max-w-7xl mx-auto pt-20 px-4 pb-24">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Admin Panel</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.users}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.posts}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Reels</CardTitle>
                <Film className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.reels}</div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="users" className="w-full">
            <TabsList>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="posts">Posts</TabsTrigger>
              <TabsTrigger value="reels">Reels</TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="space-y-4">
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />

              <div className="grid gap-4">
                {filteredUsers.map((user) => (
                  <Card key={user.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={user.avatar_url} />
                            <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">{user.username}</p>
                              {user.is_admin && <Badge variant="secondary">Admin</Badge>}
                              {user.is_verified && <Badge variant="default">Verified</Badge>}
                              {user.is_support && <Badge className="bg-purple-500">Support</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground">{user.full_name}</p>
                            {user.banned && (
                              <p className="text-sm text-destructive">Banned: {user.ban_reason}</p>
                            )}
                            {user.suspended && (
                              <p className="text-sm text-orange-500">
                                Suspended until {user.suspended_until && new Date(user.suspended_until).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setRolesDialogOpen(true);
                            }}
                          >
                            <Settings className="w-4 h-4 mr-2" />
                            Roles
                          </Button>

                          {user.banned ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUnbanUser(user.id)}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Unban
                            </Button>
                          ) : (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setBanDialogOpen(true);
                              }}
                            >
                              <Ban className="w-4 h-4 mr-2" />
                              Ban
                            </Button>
                          )}

                          {user.suspended ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUnsuspendUser(user.id)}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Unsuspend
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setSuspendDialogOpen(true);
                              }}
                            >
                              <Clock className="w-4 h-4 mr-2" />
                              Suspend
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="posts" className="space-y-4">
              <div className="grid gap-4">
                {posts.map((post) => (
                  <Card key={post.id}>
                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        <img
                          src={post.image_url}
                          alt="Post"
                          className="w-24 h-24 object-cover rounded"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={post.profiles.avatar_url} />
                              <AvatarFallback>{post.profiles.username.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="font-semibold">{post.profiles.username}</span>
                          </div>
                          <p className="text-sm mb-2">{post.caption}</p>
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            <span>{post.likes_count} likes</span>
                            <span>{post.comments_count} comments</span>
                            <span>{formatDistanceToNow(new Date(post.created_at))} ago</span>
                          </div>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeletePost(post.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="reels" className="space-y-4">
              <div className="grid gap-4">
                {reels.map((reel) => (
                  <Card key={reel.id}>
                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        <video
                          src={reel.video_url}
                          className="w-24 h-24 object-cover rounded"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={reel.profiles.avatar_url} />
                              <AvatarFallback>{reel.profiles.username.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="font-semibold">{reel.profiles.username}</span>
                          </div>
                          <p className="text-sm mb-2">{reel.caption}</p>
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            <span>{reel.likes_count} likes</span>
                            <span>{reel.views_count} views</span>
                            <span>{formatDistanceToNow(new Date(reel.created_at))} ago</span>
                          </div>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteReel(reel.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban User</DialogTitle>
            <DialogDescription>
              Ban {selectedUser?.username}. This will prevent them from accessing the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="ban-reason">Ban Reason</Label>
              <Textarea
                id="ban-reason"
                placeholder="Enter reason for ban..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBanUser}>
              Ban User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend User</DialogTitle>
            <DialogDescription>
              Suspend {selectedUser?.username} temporarily.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="suspend-days">Suspension Duration (days)</Label>
              <Input
                id="suspend-days"
                type="number"
                min="1"
                value={suspendDays}
                onChange={(e) => setSuspendDays(parseInt(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="suspend-reason">Suspension Reason</Label>
              <Textarea
                id="suspend-reason"
                placeholder="Enter reason for suspension..."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSuspendUser}>
              Suspend User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rolesDialogOpen} onOpenChange={setRolesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage User Roles</DialogTitle>
            <DialogDescription>
              Update roles for {selectedUser?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="admin-role">Admin</Label>
                <p className="text-sm text-muted-foreground">
                  Full access to platform management
                </p>
              </div>
              <Switch
                id="admin-role"
                checked={selectedUser?.is_admin || false}
                onCheckedChange={(checked) => {
                  if (selectedUser) {
                    handleUpdateRoles(selectedUser.id, { is_admin: checked });
                  }
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="verified-role">Verified</Label>
                <p className="text-sm text-muted-foreground">
                  Verified badge on profile
                </p>
              </div>
              <Switch
                id="verified-role"
                checked={selectedUser?.is_verified || false}
                onCheckedChange={(checked) => {
                  if (selectedUser) {
                    handleUpdateRoles(selectedUser.id, { is_verified: checked });
                  }
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="support-role">Support</Label>
                <p className="text-sm text-muted-foreground">
                  Access to admin panel
                </p>
              </div>
              <Switch
                id="support-role"
                checked={selectedUser?.is_support || false}
                onCheckedChange={(checked) => {
                  if (selectedUser) {
                    handleUpdateRoles(selectedUser.id, { is_support: checked });
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRolesDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
