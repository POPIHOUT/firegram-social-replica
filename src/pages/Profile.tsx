import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import EditProfileDialog from "@/components/EditProfileDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Shield, Grid, Film, Loader2, LogOut, Heart, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  username: string;
  full_name: string;
  bio: string;
  avatar_url: string;
  is_admin: boolean;
}

interface Post {
  id: string;
  image_url: string;
  images?: string[];
  likes_count: number;
  comments_count: number;
}

const Profile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsCount, setPostsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    fetchProfile();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch posts with count
      const { data: postsData, error: postsError, count } = await supabase
        .from("posts")
        .select("*", { count: "exact" })
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (postsError) throw postsError;
      
      setPosts(postsData || []);
      setPostsCount(count || 0);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out",
      description: "See you soon! 🔥",
    });
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="max-w-4xl mx-auto pt-20 px-4 pb-24">
        <div className="space-y-8">
          <div className="flex items-center gap-8">
            <Avatar className="w-32 h-32 border-4 border-primary/20">
              <AvatarImage src={profile.avatar_url} />
              <AvatarFallback className="bg-muted text-3xl">
                {profile.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{profile.username}</h1>
                {profile.is_admin && (
                  <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-accent/20">
                    <Shield size={16} className="text-accent" />
                    <span className="text-sm font-medium text-accent">Owner</span>
                  </div>
                )}
              </div>

              <div className="flex gap-8">
                <div className="text-center">
                  <p className="font-bold text-xl">{postsCount}</p>
                  <p className="text-sm text-muted-foreground">posts</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-xl">0</p>
                  <p className="text-sm text-muted-foreground">followers</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-xl">0</p>
                  <p className="text-sm text-muted-foreground">following</p>
                </div>
              </div>

              {profile.full_name && (
                <p className="font-semibold">{profile.full_name}</p>
              )}
              {profile.bio && <p className="text-sm">{profile.bio}</p>}

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1 sm:flex-initial"
                  onClick={() => setEditDialogOpen(true)}
                >
                  Edit Profile
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleLogout}
                  className="text-destructive hover:text-destructive"
                >
                  <LogOut size={20} />
                </Button>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-8">
            <div className="flex justify-center gap-12 mb-6">
              <button className="flex items-center gap-2 text-sm font-semibold border-t-2 border-primary pt-2 -mt-8">
                <Grid size={16} />
                POSTS
              </button>
              <button className="flex items-center gap-2 text-sm text-muted-foreground pt-2 -mt-8">
                <Film size={16} />
                REELS
              </button>
            </div>

            {posts.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground">No posts yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {posts.map((post) => {
                  const displayImage = post.images && post.images.length > 0 
                    ? post.images[0] 
                    : post.image_url;
                  
                  return (
                    <div key={post.id} className="relative aspect-square group cursor-pointer">
                      <img
                        src={displayImage}
                        alt="Post"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white">
                        <div className="flex items-center gap-2">
                          <Heart className="fill-white" size={20} />
                          <span className="font-semibold">{post.likes_count}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MessageCircle className="fill-white" size={20} />
                          <span className="font-semibold">{post.comments_count}</span>
                        </div>
                      </div>
                      {post.images && post.images.length > 1 && (
                        <div className="absolute top-2 right-2">
                          <div className="bg-black/70 rounded-full p-1">
                            <Grid size={16} className="text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <EditProfileDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        profile={profile}
        onUpdate={fetchProfile}
      />
    </div>
  );
};

export default Profile;
