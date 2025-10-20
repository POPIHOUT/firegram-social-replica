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
import { Shield, Grid, Film, Loader2, LogOut, Heart, MessageCircle, UserPlus, UserMinus, Flame, Check, Bookmark, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import firegramLogo from "@/assets/firegram-logo.png";
import ProfileEffect from "@/components/ProfileEffect";

interface Profile {
  id: string;
  username: string;
  full_name: string;
  bio: string;
  avatar_url: string;
  is_admin: boolean;
  is_verified: boolean;
  is_premium?: boolean;
  show_own_fire_effect?: boolean;
  custom_background_url?: string;
  show_custom_background?: boolean;
  selected_effect_id?: string;
  effects?: {
    effect_type: string;
    icon: string;
  };
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
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [savedReels, setSavedReels] = useState<Reel[]>([]);
  const [postsCount, setPostsCount] = useState(0);
  const [reelsCount, setReelsCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"posts" | "reels" | "saved">("posts");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [followersDialogOpen, setFollowersDialogOpen] = useState(false);
  const [followingDialogOpen, setFollowingDialogOpen] = useState(false);
  const [showFireEffect, setShowFireEffect] = useState(false);
  const [fireInBackground, setFireInBackground] = useState(false);
  const [selectedEffect, setSelectedEffect] = useState<{type: string, icon: string} | null>(null);
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
        .select("*, effects(*)")
        .eq("id", profileId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Set selected effect only if profile has premium
      if (profileData.is_premium && profileData.effects) {
        setSelectedEffect({
          type: profileData.effects.effect_type,
          icon: profileData.effects.icon
        });
      } else {
        setSelectedEffect(null);
      }

      // Show fire effect for premium profiles
      // Show to others always, show to self unless explicitly disabled
      const shouldShowFire = profileData.is_premium && (
        profileId !== currentUserId || (profileData.show_own_fire_effect !== false)
      );
      
      if (shouldShowFire) {
        setShowFireEffect(true);
        setFireInBackground(false);
        setTimeout(() => {
          setShowFireEffect(false);
          setFireInBackground(true);
        }, 5000);
      }

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

      // Fetch saved items if it's the user's own profile
      if (profileId === currentUserId) {
        await fetchSavedItems(profileId);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedItems = async (userId: string) => {
    try {
      // Fetch saved posts
      const { data: savedPostsData } = await supabase
        .from("saved")
        .select("post_id")
        .eq("user_id", userId)
        .not("post_id", "is", null);

      if (savedPostsData && savedPostsData.length > 0) {
        const postIds = savedPostsData.map(item => item.post_id);
        const { data: postsData } = await supabase
          .from("posts")
          .select("*")
          .in("id", postIds)
          .order("created_at", { ascending: false });

        setSavedPosts(postsData || []);
      }

      // Fetch saved reels
      const { data: savedReelsData } = await supabase
        .from("saved")
        .select("reel_id")
        .eq("user_id", userId)
        .not("reel_id", "is", null);

      if (savedReelsData && savedReelsData.length > 0) {
        const reelIds = savedReelsData.map(item => item.reel_id);
        const { data: reelsData } = await supabase
          .from("reels")
          .select("*")
          .in("id", reelIds)
          .order("created_at", { ascending: false });

        setSavedReels(reelsData || []);
      }
    } catch (error) {
      console.error("Error fetching saved items:", error);
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
    <div className="min-h-screen pb-safe">
      <Navigation />
      
      {/* Custom background for premium profiles */}
      {profile?.custom_background_url && profile?.show_custom_background && (
        <>
          {profile.custom_background_url.includes('.mp4') || 
           profile.custom_background_url.includes('.webm') || 
           profile.custom_background_url.includes('.mov') ? (
            <video
              className="fixed inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
              style={{ zIndex: -1 }}
              autoPlay
              loop
              muted
              playsInline
            >
              <source src={profile.custom_background_url} />
            </video>
          ) : (
            <div 
              className="fixed inset-0 bg-cover bg-center opacity-20 pointer-events-none"
              style={{ backgroundImage: `url(${profile.custom_background_url})`, zIndex: -1 }}
            />
          )}
        </>
      )}
      
      {/* Fire Effect Overlay */}
      {(showFireEffect || fireInBackground) && (
        <div 
          className={`fixed inset-0 pointer-events-none transition-all duration-1000 ${
            fireInBackground ? 'z-0 opacity-30' : 'z-50 opacity-100'
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-orange-500/20 via-red-500/10 to-transparent animate-pulse" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(251,146,60,0.3),transparent_70%)] animate-pulse" 
               style={{ animationDuration: '2s' }} />
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute bottom-0 w-2 h-16 bg-gradient-to-t from-orange-500 via-red-500 to-transparent rounded-full animate-[float_2s_ease-in-out_infinite]"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                opacity: 0.6 + Math.random() * 0.4,
              }}
            />
          ))}
        </div>
      )}

      {/* Selected Profile Effect */}
      {selectedEffect && (
        <ProfileEffect effectType={selectedEffect.type} icon={selectedEffect.icon} />
      )}

      <main className="max-w-4xl mx-auto pt-16 sm:pt-20 px-3 sm:px-4 pb-20 sm:pb-24">
        <div className="space-y-4 sm:space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8">
            <Avatar className="w-20 h-20 sm:w-32 sm:h-32 border-2 sm:border-4 border-primary/20 mx-auto sm:mx-0">
              <AvatarImage src={profile.avatar_url} />
              <AvatarFallback className="bg-muted text-2xl sm:text-3xl">
                {profile.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 w-full space-y-3 sm:space-y-4">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold">{profile.username}</h1>
                {profile.is_verified && (
                  <Check size={18} className="text-primary sm:w-5 sm:h-5" />
                )}
                {profile.is_premium && (
                  <div className="relative group">
                    <img 
                      src={firegramLogo} 
                      alt="Premium" 
                      className="w-6 h-6 sm:w-7 sm:h-7 animate-pulse" 
                    />
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      Premium Member
                    </div>
                  </div>
                )}
                {profile.is_admin && (
                  <Badge variant="secondary" className="flex items-center gap-1 px-2 py-0.5 sm:py-1 text-xs">
                    <Shield size={12} className="sm:w-3.5 sm:h-3.5" />
                    CEO
                  </Badge>
                )}
              </div>

              <div className="flex gap-4 sm:gap-8 justify-center sm:justify-start">
                <div className="text-center">
                  <p className="font-bold text-base sm:text-xl">{postsCount + reelsCount}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">posts</p>
                </div>
                <button 
                  className="text-center hover:opacity-70 transition-opacity touch-manipulation"
                  onClick={() => setFollowersDialogOpen(true)}
                >
                  <p className="font-bold text-base sm:text-xl">{followersCount}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">followers</p>
                </button>
                <button 
                  className="text-center hover:opacity-70 transition-opacity touch-manipulation"
                  onClick={() => setFollowingDialogOpen(true)}
                >
                  <p className="font-bold text-base sm:text-xl">{followingCount}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">following</p>
                </button>
              </div>

              {profile.full_name && (
                <p className="font-semibold text-sm sm:text-base text-center sm:text-left">{profile.full_name}</p>
              )}
              {profile.bio && <p className="text-xs sm:text-sm text-center sm:text-left">{profile.bio}</p>}

              <div className="flex gap-2 w-full">
                {isOwnProfile ? (
                  <>
                    <Button 
                      variant="outline" 
                      className="flex-1 text-xs sm:text-sm h-8 sm:h-9"
                      onClick={() => setEditDialogOpen(true)}
                    >
                      Edit profile
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => navigate("/settings")}
                      className="h-8 w-8 sm:h-9 sm:w-9"
                    >
                      <Settings size={16} className="sm:w-5 sm:h-5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleLogout}
                      className="text-destructive hover:text-destructive h-8 w-8 sm:h-9 sm:w-9"
                    >
                      <LogOut size={16} className="sm:w-5 sm:h-5" />
                    </Button>
                  </>
                ) : (
                  <Button 
                    variant={isFollowing ? "outline" : "default"}
                    className="flex-1 text-xs sm:text-sm h-8 sm:h-9"
                    onClick={handleFollow}
                  >
                    {isFollowing ? (
                      <>
                        <UserMinus className="mr-1 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
                        <span className="hidden xs:inline">Unfollow</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-1 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
                        <span className="hidden xs:inline">Follow</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-border">
            <div className="flex justify-center gap-6 sm:gap-12 overflow-x-auto pb-px">
              <button 
                className={`flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold py-3 sm:py-4 whitespace-nowrap touch-manipulation transition-colors ${
                  activeTab === "posts" 
                    ? "border-b-2 border-primary" 
                    : "text-muted-foreground border-b-2 border-transparent"
                }`}
                onClick={() => setActiveTab("posts")}
              >
                <Grid size={14} className="sm:w-4 sm:h-4" />
                POSTS
              </button>
              <button 
                className={`flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm py-3 sm:py-4 whitespace-nowrap touch-manipulation transition-colors ${
                  activeTab === "reels" 
                    ? "border-b-2 border-primary font-semibold" 
                    : "text-muted-foreground border-b-2 border-transparent"
                }`}
                onClick={() => setActiveTab("reels")}
              >
                <Film size={14} className="sm:w-4 sm:h-4" />
                REELS
              </button>
              {isOwnProfile && (
                <button 
                className={`flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm py-3 sm:py-4 whitespace-nowrap touch-manipulation transition-colors ${
                  activeTab === "saved" 
                    ? "border-b-2 border-primary font-semibold" 
                    : "text-muted-foreground border-b-2 border-transparent"
                }`}
                onClick={() => setActiveTab("saved")}
              >
                <Bookmark size={14} className="sm:w-4 sm:h-4" />
                SAVED
              </button>
              )}
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
            ) : activeTab === "reels" ? (
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
            ) : (
              // Saved tab
              savedPosts.length === 0 && savedReels.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-muted-foreground">No saved items</p>
                </div>
              ) : (
                <div>
                  <h3 className="text-sm font-semibold mb-4">Saved Posts</h3>
                  <div className="grid grid-cols-3 gap-1">
                    {savedPosts.map((post) => {
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
                        </div>
                      );
                    })}
                    {savedReels.map((reel) => (
                      <div 
                        key={reel.id} 
                        className="relative aspect-square group cursor-pointer bg-black"
                        onClick={() => navigate('/reels', { state: { initialReelId: reel.id } })}
                      >
                        <video
                          src={reel.video_url}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <div className="flex items-center gap-2">
                            <Flame className="fill-white" size={20} />
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
