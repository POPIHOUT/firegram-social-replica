import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import EditProfileDialog from "@/components/EditProfileDialog";
import ImageViewerDialog from "@/components/ImageViewerDialog";
import FollowersDialog from "@/components/FollowersDialog";
import FollowingDialog from "@/components/FollowingDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Grid, Film, Loader2, LogOut, Heart, MessageCircle, UserPlus, UserMinus, Flame, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  username: string;
  full_name: string;
  bio: string;
  avatar_url: string;
  is_admin: boolean;
  is_verified: boolean;
}

interface Post {
  id: string;
  image_url: string;
  images?: string[];
  likes_count: number;
  comments_count: number;
}

interface Reel {
  id: string;
  video_url: string;
  thumbnail_url: string | null;
  likes_count: number;
}

const Profile = () => {
  const { userId } = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [postsCount, setPostsCount] = useState(0);
  const [reelsCount, setReelsCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"posts" | "reels">("posts");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [followersDialogOpen, setFollowersDialogOpen] = useState(false);
  const [followingDialogOpen, setFollowingDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, [userId]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setCurrentUserId(session.user.id);
    const profileId = userId || session.user.id;
    setIsOwnProfile(!userId || userId === session.user.id);
    fetchProfile(profileId, session.user.id);
  };

  const fetchProfile = async (profileId: string, currentUserId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profileId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch posts with count
      const { data: postsData, error: postsError, count: postsTotal } = await supabase
        .from("posts")
        .select("*", { count: "exact" })
        .eq("user_id", profileId)
        .order("created_at", { ascending: false });

      if (postsError) throw postsError;
      setPosts(postsData || []);
      setPostsCount(postsTotal || 0);

      // Fetch reels with count
      const { data: reelsData, error: reelsError, count: reelsTotal } = await supabase
        .from("reels")
        .select("*", { count: "exact" })
        .eq("user_id", profileId)
        .order("created_at", { ascending: false });

      if (reelsError) throw reelsError;
      setReels(reelsData || []);
      setReelsCount(reelsTotal || 0);

      // Fetch followers count
      const { count: followersTotal } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", profileId);

      setFollowersCount(followersTotal || 0);

      // Fetch following count
      const { count: followingTotal } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", profileId);

      setFollowingCount(followingTotal || 0);

      // Check if current user is following this profile
      if (profileId !== currentUserId) {
        const { data: followData } = await supabase
          .from("follows")
          .select()
          .eq("follower_id", currentUserId)
          .eq("following_id", profileId)
          .maybeSingle();

        setIsFollowing(!!followData);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!currentUserId || !profile) return;

    try {
      if (isFollowing) {
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUserId)
          .eq("following_id", profile.id);

        setIsFollowing(false);
        setFollowersCount(prev => Math.max(0, prev - 1));
      } else {
        await supabase
          .from("follows")
          .insert({
            follower_id: currentUserId,
            following_id: profile.id,
          });

        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
      toast({
        title: "Error",
        description: "Failed to update following",
        variant: "destructive",
      });
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
                {profile.is_verified && (
                  <Badge variant="default" className="rounded-full p-1.5 relative">
                    <Flame size={20} className="text-orange-500" />
                    <Check size={10} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white" />
                  </Badge>
                )}
                {profile.is_admin && (
                  <Badge variant="secondary" className="flex items-center gap-1 px-2 py-1">
                    <Shield size={14} />
                    Owner
                  </Badge>
                )}
              </div>

              <div className="flex gap-8">
                <div className="text-center">
                  <p className="font-bold text-xl">{postsCount + reelsCount}</p>
                  <p className="text-sm text-muted-foreground">posts</p>
                </div>
                <button 
                  className="text-center hover:opacity-70 transition-opacity"
                  onClick={() => setFollowersDialogOpen(true)}
                >
                  <p className="font-bold text-xl">{followersCount}</p>
                  <p className="text-sm text-muted-foreground">followers</p>
                </button>
                <button 
                  className="text-center hover:opacity-70 transition-opacity"
                  onClick={() => setFollowingDialogOpen(true)}
                >
                  <p className="font-bold text-xl">{followingCount}</p>
                  <p className="text-sm text-muted-foreground">following</p>
                </button>
              </div>

              {profile.full_name && (
                <p className="font-semibold">{profile.full_name}</p>
              )}
              {profile.bio && <p className="text-sm">{profile.bio}</p>}

              <div className="flex gap-2">
                {isOwnProfile ? (
                  <>
                    <Button 
                      variant="outline" 
                      className="flex-1 sm:flex-initial"
                      onClick={() => setEditDialogOpen(true)}
                    >
                      Edit profile
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleLogout}
                      className="text-destructive hover:text-destructive"
                    >
                      <LogOut size={20} />
                    </Button>
                  </>
                ) : (
                  <Button 
                    variant={isFollowing ? "outline" : "default"}
                    className="flex-1"
                    onClick={handleFollow}
                  >
                    {isFollowing ? (
                      <>
                        <UserMinus className="mr-2 h-4 w-4" />
                        Unfollow
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Follow
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-8">
            <div className="flex justify-center gap-12 mb-6">
              <button 
                className={`flex items-center gap-2 text-sm font-semibold pt-2 -mt-8 ${
                  activeTab === "posts" 
                    ? "border-t-2 border-primary" 
                    : "text-muted-foreground"
                }`}
                onClick={() => setActiveTab("posts")}
              >
                <Grid size={16} />
                POSTS
              </button>
              <button 
                className={`flex items-center gap-2 text-sm pt-2 -mt-8 ${
                  activeTab === "reels" 
                    ? "border-t-2 border-primary font-semibold" 
                    : "text-muted-foreground"
                }`}
                onClick={() => setActiveTab("reels")}
              >
                <Film size={16} />
                REELS
              </button>
            </div>

            {activeTab === "posts" ? (
              posts.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-muted-foreground">No posts</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1">
                  {posts.map((post) => {
                    const displayImage = post.images && post.images.length > 0 
                      ? post.images[0] 
                      : post.image_url;
                    const allImages = post.images && post.images.length > 0 
                      ? post.images 
                      : [post.image_url];
                    
                    return (
                      <div 
                        key={post.id} 
                        className="relative aspect-square group cursor-pointer"
                        onClick={() => {
                          setSelectedImages(allImages);
                          setSelectedImageIndex(0);
                          setImageViewerOpen(true);
                        }}
                      >
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
              )
            ) : (
              reels.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-muted-foreground">No reels</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1">
                  {reels.map((reel) => (
                    <div 
                      key={reel.id} 
                      className="relative aspect-[9/16] group cursor-pointer bg-black"
                      onClick={() => navigate('/reels', { state: { initialReelId: reel.id } })}
                    >
                      <video
                        src={reel.video_url}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <div className="flex items-center gap-2">
                          <Heart className="fill-white" size={20} />
                          <span className="font-semibold">{reel.likes_count}</span>
                        </div>
                      </div>
                      <div className="absolute top-2 right-2">
                        <div className="bg-black/70 rounded-full p-1">
                          <Film size={16} className="text-white" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </main>

      <EditProfileDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        profile={profile}
        onUpdate={() => profile && currentUserId && fetchProfile(profile.id, currentUserId)}
      />

      <ImageViewerDialog
        open={imageViewerOpen}
        onOpenChange={setImageViewerOpen}
        images={selectedImages}
        currentIndex={selectedImageIndex}
        onNavigate={(direction) => {
          if (direction === "prev") {
            setSelectedImageIndex((prev) => (prev === 0 ? selectedImages.length - 1 : prev - 1));
          } else {
            setSelectedImageIndex((prev) => (prev === selectedImages.length - 1 ? 0 : prev + 1));
          }
        }}
      />

      <FollowersDialog
        open={followersDialogOpen}
        onOpenChange={setFollowersDialogOpen}
        userId={profile?.id || ""}
      />

      <FollowingDialog
        open={followingDialogOpen}
        onOpenChange={setFollowingDialogOpen}
        userId={profile?.id || ""}
      />
    </div>
  );
};

export default Profile;
