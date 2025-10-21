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
import { Shield, Users, FileText, Film, Ban, Clock, Trash2, CheckCircle, XCircle, Loader2, Settings, Megaphone, Flame, DollarSign, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import FlamePurchaseCard from "@/components/FlamePurchaseCard";
import SACCodesManagement from "@/components/SACCodesManagement";
import { UpdateLockManagement } from "@/components/UpdateLockManagement";
import { UpdateAnnouncementManagement } from "@/components/UpdateAnnouncementManagement";

interface User {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  email: string;
  flames: number;
  is_admin: boolean;
  is_verified: boolean;
  is_support: boolean;
  is_premium: boolean;
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

interface Advertisement {
  id: string;
  user_id: string;
  media_url: string;
  type: string;
  caption: string;
  thumbnail_url: string | null;
  expires_at: string;
  active: boolean;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string;
  };
}

interface FlamePurchase {
  id: string;
  user_id: string;
  flame_amount: number;
  price_usd: number;
  status: string;
  card_type: string;
  card_last4: string;
  card_holder_name: string;
  created_at: string;
  sac_code?: string | null;
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
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [suspendReason, setSuspendReason] = useState("");
  const [suspendDays, setSuspendDays] = useState(7);
  const [rolesDialogOpen, setRolesDialogOpen] = useState(false);
  const [flamesDialogOpen, setFlamesDialogOpen] = useState(false);
  const [flamesAmount, setFlamesAmount] = useState("");
  const [followersDialogOpen, setFollowersDialogOpen] = useState(false);
  const [followersAmount, setFollowersAmount] = useState("");
  const [flamePurchases, setFlamePurchases] = useState<FlamePurchase[]>([]);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<FlamePurchase | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [stats, setStats] = useState({ users: 0, posts: 0, reels: 0, ads: 0, pending_purchases: 0 });
  const [consoleMode, setConsoleMode] = useState(false);
  const [consoleInput, setConsoleInput] = useState("");
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAccess();
    fetchUserRole();
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

  const fetchUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (roles && roles.length > 0) {
      const systemManager = roles.find(r => r.role === 'system_manager');
      if (systemManager) {
        setUserRole('System Manager');
      }
    }
  };

  const handleAddFlames = async (userId?: string, amount?: number) => {
    const targetUserId = userId || selectedUser?.id;
    const targetAmount = amount || parseInt(flamesAmount);
    const targetUser = users.find(u => u.id === targetUserId) || selectedUser;

    if (!targetUserId || !targetAmount || isNaN(targetAmount)) {
      toast({ title: "Invalid amount", description: "Please enter a valid number", variant: "destructive" });
      return;
    }

    try {
      const currentFlames = targetUser?.flames || 0;
      const newAmount = currentFlames + targetAmount;
      const { error } = await supabase.from("profiles").update({ flames: newAmount }).eq("id", targetUserId);
      if (error) throw error;

      toast({ title: "Flames Added", description: `Added ${targetAmount} flames to ${targetUser?.username}` });
      
      if (selectedUser && selectedUser.id === targetUserId) {
        setSelectedUser({ ...selectedUser, flames: newAmount });
      }
      setFlamesAmount("");
      await fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleRemoveFlames = async (userId?: string, amount?: number) => {
    const targetUserId = userId || selectedUser?.id;
    const targetAmount = amount || parseInt(flamesAmount);
    const targetUser = users.find(u => u.id === targetUserId) || selectedUser;

    if (!targetUserId || !targetAmount || isNaN(targetAmount)) {
      toast({ title: "Invalid amount", description: "Please enter a valid number", variant: "destructive" });
      return;
    }

    try {
      const currentFlames = targetUser?.flames || 0;
      const newAmount = Math.max(0, currentFlames - targetAmount);
      const { error } = await supabase.from("profiles").update({ flames: newAmount }).eq("id", targetUserId);
      if (error) throw error;

      toast({ title: "Flames Removed", description: `Removed ${targetAmount} flames from ${targetUser?.username}` });
      
      if (selectedUser && selectedUser.id === targetUserId) {
        setSelectedUser({ ...selectedUser, flames: newAmount });
      }
      setFlamesAmount("");
      await fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleGiveFakeFollowers = async (userId?: string, amount?: number) => {
    const targetUserId = userId || selectedUser?.id;
    const targetAmount = amount || parseInt(followersAmount);
    const targetUser = users.find(u => u.id === targetUserId) || selectedUser;

    if (!targetUserId || !targetAmount || isNaN(targetAmount)) {
      toast({ title: "Invalid amount", description: "Please enter a valid number", variant: "destructive" });
      return;
    }

    const count = targetAmount;
    try {
      // Create fake user profiles and follow relationships
      const fakeUsers = [];
      for (let i = 0; i < count; i++) {
        const randomId = crypto.randomUUID();
        const randomUsername = `user_${Math.random().toString(36).substring(2, 10)}`;
        
        // Create fake profile
        const { error: profileError } = await supabase
          .from("profiles")
          .insert({
            id: randomId,
            username: randomUsername,
            full_name: `Fake User ${i + 1}`,
            avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${randomUsername}`,
          });

        if (profileError) {
          console.error("Error creating fake profile:", profileError);
          continue;
        }

        // Create follow relationship
        const { error: followError } = await supabase
          .from("follows")
          .insert({
            follower_id: randomId,
            following_id: targetUserId,
          });

        if (followError) {
          console.error("Error creating follow relationship:", followError);
        }

        fakeUsers.push(randomUsername);
      }

      toast({ 
        title: "Fake Followers Added", 
        description: `Successfully added ${fakeUsers.length} fake followers to ${targetUser?.username}`,
        duration: 5000,
      });
      
      setFollowersAmount("");
      setFollowersDialogOpen(false);
      await fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const fetchData = async () => {
    try {
      const [usersRes, postsRes, reelsRes, adsRes, emailsRes, purchasesRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("posts").select("*, profiles(username, avatar_url)").order("created_at", { ascending: false }),
        supabase.from("reels").select("*, profiles(username, avatar_url)").order("created_at", { ascending: false }),
        supabase.from("advertisements").select("*, profiles(username, avatar_url)").order("created_at", { ascending: false }),
        supabase.rpc("get_user_emails"),
        supabase.from("flame_purchases").select("*, profiles!user_id(username, avatar_url)").order("created_at", { ascending: false }),
      ]);

      // Merge email data with user profiles
      if (usersRes.data && emailsRes.data) {
        const emailMap = new Map(emailsRes.data.map((e: any) => [e.user_id, e.email]));
        const usersWithEmails = usersRes.data.map((user: any) => ({
          ...user,
          email: emailMap.get(user.id) || "",
        }));
        setUsers(usersWithEmails);
      }

      if (postsRes.data) setPosts(postsRes.data);
      if (reelsRes.data) setReels(reelsRes.data);
      if (adsRes.data) setAdvertisements(adsRes.data);
      if (purchasesRes.data) setFlamePurchases(purchasesRes.data as any);

      const pendingPurchases = purchasesRes.data?.filter((p: any) => p.status === 'pending').length || 0;

      setStats({
        users: usersRes.data?.length || 0,
        posts: postsRes.data?.length || 0,
        reels: reelsRes.data?.length || 0,
        ads: adsRes.data?.length || 0,
        pending_purchases: pendingPurchases,
      });
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBan = async (userId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ banned: true, ban_reason: reason })
        .eq("id", userId);

      if (error) throw error;

      const user = users.find(u => u.id === userId);
      toast({
        title: "User Banned",
        description: `${user?.username} has been banned`,
      });

      await fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleBanUser = async () => {
    if (!selectedUser || !banReason.trim()) return;
    await handleBan(selectedUser.id, banReason);
    setBanDialogOpen(false);
    setBanReason("");
  };

  const handleSuspend = async (userId: string, days: number, reason: string) => {
    const suspendUntil = new Date();
    suspendUntil.setDate(suspendUntil.getDate() + days);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          suspended: true,
          suspended_until: suspendUntil.toISOString(),
          suspended_reason: reason,
        })
        .eq("id", userId);

      if (error) throw error;

      const user = users.find(u => u.id === userId);
      toast({
        title: "User Suspended",
        description: `${user?.username} has been suspended for ${days} days`,
      });

      await fetchData();
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
    await handleSuspend(selectedUser.id, suspendDays, suspendReason);
    setSuspendDialogOpen(false);
    setSuspendReason("");
  };

  const handleUnban = async (userId: string) => {
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

      await fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUnbanUser = async (userId: string) => {
    await handleUnban(userId);
  };

  const handleUnsuspend = async (userId: string) => {
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

      await fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUnsuspendUser = async (userId: string) => {
    await handleUnsuspend(userId);
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

  const handleUpdateRoles = async (userId: string, roles: { is_admin?: boolean; is_verified?: boolean; is_support?: boolean; is_premium?: boolean }) => {
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

  const handleToggleAd = async (adId: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from("advertisements")
        .update({ active: !active })
        .eq("id", adId);

      if (error) throw error;

      toast({
        title: active ? "Ad Deactivated" : "Ad Activated",
        description: `Advertisement has been ${active ? "deactivated" : "activated"}`,
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

  const handleDeleteAd = async (adId: string) => {
    if (!confirm("Are you sure you want to delete this advertisement?")) return;

    try {
      const { error } = await supabase.from("advertisements").delete().eq("id", adId);

      if (error) throw error;

      toast({
        title: "Ad Deleted",
        description: "Advertisement has been deleted successfully",
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

  const handleApprovePurchase = async (purchaseId: string) => {
    try {
      const { error } = await supabase.rpc("approve_flame_purchase", {
        purchase_id: purchaseId,
      });

      if (error) throw error;

      toast({
        title: "Purchase Approved",
        description: "Flames have been added to the user's account",
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

  const handleRejectPurchase = async () => {
    if (!selectedPurchase || !rejectReason.trim()) return;

    try {
      const { error } = await supabase.rpc("reject_flame_purchase", {
        purchase_id: selectedPurchase.id,
        reason: rejectReason,
      });

      if (error) throw error;

      toast({
        title: "Purchase Rejected",
        description: "The purchase has been rejected",
      });

      setRejectDialogOpen(false);
      setRejectReason("");
      setSelectedPurchase(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const executeCommand = async (command: string) => {
    const parts = command.trim().split(" ");
    const cmd = parts[0].toLowerCase();
    
    setConsoleOutput(prev => [...prev, `> ${command}`]);

    try {
      if (cmd === "/addflames" && parts.length >= 3) {
        const username = parts[1];
        const amount = parseInt(parts[2]);
        const user = users.find(u => u.username === username);
        if (!user) {
          setConsoleOutput(prev => [...prev, "Error: User not found"]);
          return;
        }
        await handleAddFlames(user.id, amount);
        setConsoleOutput(prev => [...prev, `Success: Added ${amount} flames to ${username}`]);
      } else if (cmd === "/removeflames" && parts.length >= 3) {
        const username = parts[1];
        const amount = parseInt(parts[2]);
        const user = users.find(u => u.username === username);
        if (!user) {
          setConsoleOutput(prev => [...prev, "Error: User not found"]);
          return;
        }
        await handleRemoveFlames(user.id, amount);
        setConsoleOutput(prev => [...prev, `Success: Removed ${amount} flames from ${username}`]);
      } else if (cmd === "/givefakefollowers" && parts.length >= 3) {
        const username = parts[1];
        const amount = parseInt(parts[2]);
        const user = users.find(u => u.username === username);
        if (!user) {
          setConsoleOutput(prev => [...prev, "Error: User not found"]);
          return;
        }
        await handleGiveFakeFollowers(user.id, amount);
        setConsoleOutput(prev => [...prev, `Success: Added ${amount} fake followers to ${username}`]);
      } else if (cmd === "/ban" && parts.length >= 3) {
        const username = parts[1];
        const reason = parts.slice(2).join(" ");
        const user = users.find(u => u.username === username);
        if (!user) {
          setConsoleOutput(prev => [...prev, "Error: User not found"]);
          return;
        }
        await handleBan(user.id, reason);
        setConsoleOutput(prev => [...prev, `Success: Banned ${username}`]);
      } else if (cmd === "/suspend" && parts.length >= 4) {
        const username = parts[1];
        const days = parseInt(parts[2]);
        const reason = parts.slice(3).join(" ");
        const user = users.find(u => u.username === username);
        if (!user) {
          setConsoleOutput(prev => [...prev, "Error: User not found"]);
          return;
        }
        await handleSuspend(user.id, days, reason);
        setConsoleOutput(prev => [...prev, `Success: Suspended ${username} for ${days} days`]);
      } else if (cmd === "/unban" && parts.length >= 2) {
        const username = parts[1];
        const user = users.find(u => u.username === username);
        if (!user) {
          setConsoleOutput(prev => [...prev, "Error: User not found"]);
          return;
        }
        await handleUnban(user.id);
        setConsoleOutput(prev => [...prev, `Success: Unbanned ${username}`]);
      } else if (cmd === "/unsuspend" && parts.length >= 2) {
        const username = parts[1];
        const user = users.find(u => u.username === username);
        if (!user) {
          setConsoleOutput(prev => [...prev, "Error: User not found"]);
          return;
        }
        await handleUnsuspend(user.id);
        setConsoleOutput(prev => [...prev, `Success: Unsuspended ${username}`]);
      } else if (cmd === "/deletepost" && parts.length >= 2) {
        const postId = parts[1];
        await handleDeletePost(postId);
        setConsoleOutput(prev => [...prev, `Success: Deleted post ${postId}`]);
      } else if (cmd === "/deletereel" && parts.length >= 2) {
        const reelId = parts[1];
        await handleDeleteReel(reelId);
        setConsoleOutput(prev => [...prev, `Success: Deleted reel ${reelId}`]);
      } else if (cmd === "/togglead" && parts.length >= 2) {
        const adId = parts[1];
        const ad = advertisements.find(a => a.id === adId);
        if (!ad) {
          setConsoleOutput(prev => [...prev, "Error: Advertisement not found"]);
          return;
        }
        await handleToggleAd(adId, ad.active);
        setConsoleOutput(prev => [...prev, `Success: Toggled advertisement ${adId}`]);
      } else if (cmd === "/deletead" && parts.length >= 2) {
        const adId = parts[1];
        await handleDeleteAd(adId);
        setConsoleOutput(prev => [...prev, `Success: Deleted advertisement ${adId}`]);
      } else if (cmd === "/help") {
        setConsoleOutput(prev => [...prev, 
          "Available commands:",
          "/addflames <username> <amount>",
          "/removeflames <username> <amount>",
          "/givefakefollowers <username> <amount>",
          "/ban <username> <reason>",
          "/suspend <username> <days> <reason>",
          "/unban <username>",
          "/unsuspend <username>",
          "/deletepost <postid>",
          "/deletereel <reelid>",
          "/togglead <adid>",
          "/deletead <adid>",
          "/clear - Clear console output",
          "/help - Show this help"
        ]);
      } else if (cmd === "/clear") {
        setConsoleOutput([]);
      } else {
        setConsoleOutput(prev => [...prev, "Error: Unknown command. Type /help for available commands"]);
      }
    } catch (error: any) {
      setConsoleOutput(prev => [...prev, `Error: ${error.message}`]);
    }
  };

  const handleConsoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (consoleInput.trim()) {
      executeCommand(consoleInput);
      setConsoleInput("");
    }
  };

  const handleSendAnnouncement = async () => {
    if (!announcementMessage.trim()) {
      toast({
        title: "Error",
        description: "Announcement message cannot be empty",
        variant: "destructive",
      });
      return;
    }

    setSendingAnnouncement(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("send-announcement", {
        body: { message: announcementMessage },
      });

      if (error) throw error;

      toast({
        title: "Announcement Sent",
        description: data.message || "Announcement sent to all users",
      });

      setAnnouncementMessage("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSendingAnnouncement(false);
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
    <div className="min-h-screen pb-safe">
      <Navigation />
      
      <Button
        variant="outline"
        size="sm"
        className="fixed top-20 right-4 z-50"
        onClick={() => setConsoleMode(!consoleMode)}
      >
        {consoleMode ? "Normal Mode" : "Console Mode"}
      </Button>

      <main className="max-w-7xl mx-auto pt-16 sm:pt-20 px-3 sm:px-4 pb-20 sm:pb-24">
        <div className="space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              <h1 className="text-2xl sm:text-3xl font-bold">Admin Panel</h1>
            </div>
            {userRole && (
              <Badge variant="default" className="flex items-center gap-2 px-3 py-1.5 text-sm">
                <Crown className="w-4 h-4" />
                {userRole}
              </Badge>
            )}
          </div>

          {consoleMode && (
            <Card className="bg-black text-green-400 font-mono border-green-500">
              <CardHeader>
                <CardTitle className="text-green-400">Console Mode</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-black p-4 rounded border border-green-400 mb-4 h-64 overflow-y-auto">
                  {consoleOutput.map((line, i) => (
                    <div key={i} className="text-sm">{line}</div>
                  ))}
                </div>
                <form onSubmit={handleConsoleSubmit} className="flex gap-2">
                  <Input
                    value={consoleInput}
                    onChange={(e) => setConsoleInput(e.target.value)}
                    placeholder="Type /help for available commands"
                    className="bg-black border-green-400 text-green-400 placeholder:text-green-400/50"
                    autoFocus
                  />
                  <Button type="submit" variant="outline" className="border-green-400 text-green-400 hover:bg-green-400 hover:text-black">
                    Execute
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {!consoleMode && (
            <>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium">Total Users</CardTitle>
                <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                <div className="text-xl sm:text-2xl font-bold">{stats.users}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium">Total Posts</CardTitle>
                <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                <div className="text-xl sm:text-2xl font-bold">{stats.posts}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium">Total Reels</CardTitle>
                <Film className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                <div className="text-xl sm:text-2xl font-bold">{stats.reels}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium">Total Ads</CardTitle>
                <Megaphone className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                <div className="text-xl sm:text-2xl font-bold">{stats.ads}</div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="users" className="w-full">
            <TabsList className="w-full grid grid-cols-9 h-9 sm:h-10">
              <TabsTrigger value="users" className="text-xs sm:text-sm">Users</TabsTrigger>
              <TabsTrigger value="posts" className="text-xs sm:text-sm">Posts</TabsTrigger>
              <TabsTrigger value="reels" className="text-xs sm:text-sm">Reels</TabsTrigger>
              <TabsTrigger value="ads" className="text-xs sm:text-sm">Ads</TabsTrigger>
              <TabsTrigger value="purchases" className="text-xs sm:text-sm flex items-center gap-1">
                <Flame className="w-3 h-3" />
                <span className="hidden sm:inline">Purchases</span>
                {stats.pending_purchases > 0 && (
                  <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">
                    {stats.pending_purchases}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="announcements" className="text-xs sm:text-sm flex items-center gap-1">
                <Megaphone className="w-3 h-3" />
                <span className="hidden sm:inline">Announce</span>
              </TabsTrigger>
              <TabsTrigger value="sac" className="text-xs sm:text-sm">
                SAC
              </TabsTrigger>
              <TabsTrigger value="update-lock" className="text-xs sm:text-sm">
                Server Lock
              </TabsTrigger>
              <TabsTrigger value="update-info" className="text-xs sm:text-sm">
                Info
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="space-y-3 sm:space-y-4">
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:max-w-sm text-sm"
              />

              <div className="grid gap-3 sm:gap-4">
                {filteredUsers.map((user) => (
                  <Card key={user.id}>
                    <CardContent className="p-3 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0 sm:justify-between">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <Avatar className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0">
                            <AvatarImage src={user.avatar_url} />
                            <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                              <p className="font-semibold text-sm sm:text-base truncate">{user.username}</p>
                              {user.is_admin && <Badge variant="secondary" className="text-xs">Admin</Badge>}
                              {user.is_verified && <Badge variant="default" className="text-xs">Verified</Badge>}
                              {user.is_support && <Badge className="bg-purple-500 text-xs">Support</Badge>}
                              {user.is_premium && <Badge className="bg-orange-500 text-xs">Premium</Badge>}
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">{user.full_name}</p>
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">{user.email}</p>
                            <p className="text-xs sm:text-sm font-semibold flex items-center gap-1">
                              <span className="text-lg">🔥</span> {user.flames} flames
                            </p>
                            {user.banned && (
                              <p className="text-xs sm:text-sm text-destructive truncate">Banned: {user.ban_reason}</p>
                            )}
                            {user.suspended && (
                              <p className="text-xs sm:text-sm text-orange-500 truncate">
                                Suspended until {user.suspended_until && new Date(user.suspended_until).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-8 flex-1 sm:flex-initial bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20"
                            onClick={() => {
                              setSelectedUser(user);
                              setFlamesDialogOpen(true);
                            }}
                          >
                            <span className="text-sm mr-1">🔥</span>
                            <span className="hidden sm:inline">Flames</span>
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-8 flex-1 sm:flex-initial bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20"
                            onClick={() => {
                              setSelectedUser(user);
                              setFollowersDialogOpen(true);
                            }}
                          >
                            <span className="text-sm mr-1">👥</span>
                            <span className="hidden sm:inline">Followers</span>
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-8 flex-1 sm:flex-initial"
                            onClick={() => {
                              setSelectedUser(user);
                              setRolesDialogOpen(true);
                            }}
                          >
                            <Settings className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                            <span className="hidden sm:inline">Roles</span>
                          </Button>

                          {user.banned ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-8 flex-1 sm:flex-initial"
                              onClick={() => handleUnbanUser(user.id)}
                            >
                              <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                              <span className="hidden sm:inline">Unban</span>
                            </Button>
                          ) : (
                            <Button
                              variant="destructive"
                              size="sm"
                              className="text-xs h-8 flex-1 sm:flex-initial"
                              onClick={() => {
                                setSelectedUser(user);
                                setBanDialogOpen(true);
                              }}
                            >
                              <Ban className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                              <span className="hidden sm:inline">Ban</span>
                            </Button>
                          )}

                          {user.suspended ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-8 flex-1 sm:flex-initial"
                              onClick={() => handleUnsuspendUser(user.id)}
                            >
                              <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                              <span className="hidden sm:inline">Unsuspend</span>
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-8 flex-1 sm:flex-initial"
                              onClick={() => {
                                setSelectedUser(user);
                                setSuspendDialogOpen(true);
                              }}
                            >
                              <Clock className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                              <span className="hidden sm:inline">Suspend</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="posts" className="space-y-3 sm:space-y-4">
              <div className="grid gap-3 sm:gap-4">
                {posts.map((post) => (
                  <Card key={post.id}>
                    <CardContent className="p-3 sm:p-6">
                      <div className="flex gap-3 sm:gap-4">
                        <img
                          src={post.image_url}
                          alt="Post"
                          className="w-16 h-16 sm:w-24 sm:h-24 object-cover rounded flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 sm:mb-2">
                            <Avatar className="w-5 h-5 sm:w-6 sm:h-6">
                              <AvatarImage src={post.profiles.avatar_url} />
                              <AvatarFallback>{post.profiles.username.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="font-semibold text-xs sm:text-sm truncate">{post.profiles.username}</span>
                          </div>
                          <p className="text-xs sm:text-sm mb-1 sm:mb-2 line-clamp-2">{post.caption}</p>
                          <div className="flex gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground flex-wrap">
                            <span>{post.likes_count} likes</span>
                            <span>{post.comments_count} comments</span>
                            <span className="hidden sm:inline">{formatDistanceToNow(new Date(post.created_at))} ago</span>
                          </div>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-8 w-8 sm:h-9 sm:w-9 p-0 flex-shrink-0"
                          onClick={() => handleDeletePost(post.id)}
                        >
                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="reels" className="space-y-3 sm:space-y-4">
              <div className="grid gap-3 sm:gap-4">
                {reels.map((reel) => (
                  <Card key={reel.id}>
                    <CardContent className="p-3 sm:p-6">
                      <div className="flex gap-3 sm:gap-4">
                        <video
                          src={reel.video_url}
                          className="w-16 h-16 sm:w-24 sm:h-24 object-cover rounded flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 sm:mb-2">
                            <Avatar className="w-5 h-5 sm:w-6 sm:h-6">
                              <AvatarImage src={reel.profiles.avatar_url} />
                              <AvatarFallback>{reel.profiles.username.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="font-semibold text-xs sm:text-sm truncate">{reel.profiles.username}</span>
                          </div>
                          <p className="text-xs sm:text-sm mb-1 sm:mb-2 line-clamp-2">{reel.caption}</p>
                          <div className="flex gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground flex-wrap">
                            <span>{reel.likes_count} likes</span>
                            <span>{reel.views_count} views</span>
                            <span className="hidden sm:inline">{formatDistanceToNow(new Date(reel.created_at))} ago</span>
                          </div>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-8 w-8 sm:h-9 sm:w-9 p-0 flex-shrink-0"
                          onClick={() => handleDeleteReel(reel.id)}
                        >
                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="ads" className="space-y-3 sm:space-y-4">
              <div className="grid gap-3 sm:gap-4">
                {advertisements.map((ad) => (
                  <Card key={ad.id}>
                    <CardContent className="p-3 sm:p-6">
                      <div className="flex gap-3 sm:gap-4">
                        {ad.type === 'video' ? (
                          <video
                            src={ad.media_url}
                            className="w-16 h-16 sm:w-24 sm:h-24 object-cover rounded flex-shrink-0"
                          />
                        ) : (
                          <img
                            src={ad.media_url}
                            alt="Ad"
                            className="w-16 h-16 sm:w-24 sm:h-24 object-cover rounded flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 sm:mb-2">
                            <Avatar className="w-5 h-5 sm:w-6 sm:h-6">
                              <AvatarImage src={ad.profiles.avatar_url} />
                              <AvatarFallback>{ad.profiles.username.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="font-semibold text-xs sm:text-sm truncate">{ad.profiles.username}</span>
                            <Badge variant={ad.active ? "default" : "secondary"} className="text-xs">
                              {ad.active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <p className="text-xs sm:text-sm mb-1 sm:mb-2 line-clamp-2">{ad.caption}</p>
                          <div className="flex gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground flex-wrap">
                            <span>Expires: {new Date(ad.expires_at).toLocaleDateString()}</span>
                            <span className="hidden sm:inline">{formatDistanceToNow(new Date(ad.created_at))} ago</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 sm:h-9 sm:w-9 p-0 flex-shrink-0"
                            onClick={() => handleToggleAd(ad.id, ad.active)}
                          >
                            {ad.active ? <XCircle className="w-3 h-3 sm:w-4 sm:h-4" /> : <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-8 w-8 sm:h-9 sm:w-9 p-0 flex-shrink-0"
                            onClick={() => handleDeleteAd(ad.id)}
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="purchases" className="space-y-4">
              <div className="grid gap-4">
                {flamePurchases.map((purchase) => (
                  <FlamePurchaseCard
                    key={purchase.id}
                    purchase={purchase}
                    onApprove={handleApprovePurchase}
                    onReject={(p) => {
                      setSelectedPurchase(p);
                      setRejectDialogOpen(true);
                    }}
                  />
                ))}
                {flamePurchases.length === 0 && (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      No flame purchases yet
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="announcements" className="space-y-3 sm:space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Megaphone className="w-5 h-5" />
                    Send Announcement
                  </CardTitle>
                  <CardDescription>
                    Send a notification to all users from the official FireGram account
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="announcement-message">Message</Label>
                    <Textarea
                      id="announcement-message"
                      placeholder="Enter your announcement message..."
                      value={announcementMessage}
                      onChange={(e) => setAnnouncementMessage(e.target.value)}
                      rows={6}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      This message will be sent to all users as a notification from FireGram Official
                    </p>
                  </div>
                  <Button
                    onClick={handleSendAnnouncement}
                    disabled={sendingAnnouncement || !announcementMessage.trim()}
                    className="w-full"
                  >
                    {sendingAnnouncement ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Megaphone className="w-4 h-4 mr-2" />
                        Send Announcement
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sac" className="space-y-3 sm:space-y-4">
              <SACCodesManagement />
            </TabsContent>

            <TabsContent value="update-lock" className="space-y-3 sm:space-y-4">
              <UpdateLockManagement />
            </TabsContent>

            <TabsContent value="update-info" className="space-y-3 sm:space-y-4">
              <UpdateAnnouncementManagement />
            </TabsContent>
          </Tabs>
          </>
          )}
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
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="premium-role">Premium</Label>
                <p className="text-sm text-muted-foreground">
                  FireGram Premium membership
                </p>
              </div>
              <Switch
                id="premium-role"
                checked={selectedUser?.is_premium || false}
                onCheckedChange={(checked) => {
                  if (selectedUser) {
                    handleUpdateRoles(selectedUser.id, { is_premium: checked });
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

      <Dialog open={flamesDialogOpen} onOpenChange={(open) => {
        setFlamesDialogOpen(open);
        if (!open) setFlamesAmount("");
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Flames 🔥</DialogTitle>
            <DialogDescription>
              Add or remove flames for {selectedUser?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Current Balance:</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🔥</span>
                  <span className="text-xl font-bold">{selectedUser?.flames || 0}</span>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="flames-amount">Amount</Label>
              <Input
                id="flames-amount"
                type="number"
                placeholder="Enter amount..."
                value={flamesAmount}
                onChange={(e) => setFlamesAmount(e.target.value)}
                min="0"
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setFlamesDialogOpen(false);
                setFlamesAmount("");
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => handleRemoveFlames()}
              disabled={!flamesAmount}
            >
              Remove
            </Button>
            <Button 
              onClick={() => handleAddFlames()}
              disabled={!flamesAmount}
              className="bg-orange-500 hover:bg-orange-600"
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={followersDialogOpen} onOpenChange={(open) => {
        setFollowersDialogOpen(open);
        if (!open) setFollowersAmount("");
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Give Fake Followers 👥</DialogTitle>
            <DialogDescription>
              Troll feature - give fake followers to {selectedUser?.username}
              <br />
              <span className="text-xs text-muted-foreground">(Won't appear in follower list, just for fun 😈)</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Troll Mode Active:</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">😈</span>
                  <span className="text-xl font-bold">Unlimited</span>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="followers-amount">Amount</Label>
              <Input
                id="followers-amount"
                type="number"
                placeholder="Enter amount..."
                value={followersAmount}
                onChange={(e) => setFollowersAmount(e.target.value)}
                min="0"
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setFollowersDialogOpen(false);
                setFollowersAmount("");
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => handleGiveFakeFollowers()}
              disabled={!followersAmount}
              className="bg-purple-500 hover:bg-purple-600"
            >
              Give Fake Followers 😈
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Purchase</DialogTitle>
            <DialogDescription>
              Reject flame purchase from {selectedPurchase?.profiles.username}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="reject-reason">Rejection Reason</Label>
            <Textarea
              id="reject-reason"
              placeholder="Enter reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRejectPurchase}>
              Reject Purchase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
