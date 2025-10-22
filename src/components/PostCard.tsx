import { useState, useEffect } from "react";
import { Flame, MessageCircle, Bookmark, Shield, ChevronLeft, ChevronRight, Check } from "lucide-react";
import firegramLogo from "@/assets/firegram-logo.png";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import CommentsDialog from "./CommentsDialog";
import ImageViewerDialog from "./ImageViewerDialog";

interface PostCardProps {
  post: {
    id: string;
    user_id: string;
    image_url: string;
    images?: string[];
    caption: string;
    likes_count: number;
    comments_count: number;
    created_at: string;
    profiles: {
      username: string;
      avatar_url: string;
      is_admin: boolean;
      is_verified: boolean;
      is_premium?: boolean;
    };
  };
  onUpdate: () => void;
}

const PostCard = ({ post, onUpdate }: PostCardProps) => {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isCheckingLike, setIsCheckingLike] = useState(true);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const images = post.images && post.images.length > 0 ? post.images : [post.image_url];

  // Check if user already liked this post
  useEffect(() => {
    const checkIfLiked = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsCheckingLike(false);
          return;
        }

        const { data, error } = await supabase
          .from("likes")
          .select("id")
          .eq("user_id", user.id)
          .eq("post_id", post.id)
          .maybeSingle();

        if (!error && data) {
          setLiked(true);
        }
      } catch (error) {
        console.error("Error checking like status:", error);
      } finally {
        setIsCheckingLike(false);
      }
    };

    const checkIfSaved = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("saved")
          .select("id")
          .eq("user_id", user.id)
          .eq("post_id", post.id)
          .maybeSingle();

        if (!error && data) {
          setSaved(true);
        }
      } catch (error) {
        console.error("Error checking saved status:", error);
      }
    };

    checkIfLiked();
    checkIfSaved();
  }, [post.id]);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleLike = async () => {
    if (isCheckingLike) return; // Prevent action while checking
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (liked) {
        // Unlike
        const { error: deleteError } = await supabase
          .from("likes")
          .delete()
          .eq("user_id", user.id)
          .eq("post_id", post.id);
        
        if (deleteError) throw deleteError;

        const { error: updateError } = await supabase
          .from("posts")
          .update({ likes_count: Math.max(0, post.likes_count - 1) })
          .eq("id", post.id);

        if (updateError) throw updateError;
        
        setLiked(false);
      } else {
        // Like
        const { error: insertError } = await supabase
          .from("likes")
          .insert({ user_id: user.id, post_id: post.id });

        if (insertError) {
          // Check if it's a duplicate key error (user already liked)
          if (insertError.code === '23505') {
            toast({
              title: "Already liked",
              description: "You already liked this post",
            });
            setLiked(true);
            return;
          }
          throw insertError;
        }

        const { error: updateError } = await supabase
          .from("posts")
          .update({ likes_count: post.likes_count + 1 })
          .eq("id", post.id);

        if (updateError) throw updateError;
        
        setLiked(true);
      }

      onUpdate();
    } catch (error: any) {
      console.error("Error liking post:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to like post",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Login required",
          description: "You must be logged in to save posts",
          variant: "destructive",
        });
        return;
      }

      if (saved) {
        // Unsave
        const { error } = await supabase
          .from("saved")
          .delete()
          .eq("user_id", user.id)
          .eq("post_id", post.id);
        
        if (error) throw error;
        
        setSaved(false);
        toast({
          title: "Removed from saved",
          description: "Post removed from your saved items",
        });
      } else {
        // Save
        const { error } = await supabase
          .from("saved")
          .insert({ user_id: user.id, post_id: post.id });

        if (error) {
          if (error.code === '23505') {
            setSaved(true);
            return;
          }
          throw error;
        }
        
        setSaved(true);
        toast({
          title: "Saved",
          description: "Post saved to your profile",
        });
      }
    } catch (error: any) {
      console.error("Error saving post:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save post",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="border-border bg-card overflow-hidden">
      <div className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
        <Avatar 
          className="w-9 h-9 sm:w-10 sm:h-10 border-2 border-primary/20 cursor-pointer touch-manipulation"
          onClick={() => navigate(`/profile/${post.user_id}`)}
        >
          <AvatarImage src={post.profiles.avatar_url} />
          <AvatarFallback className="bg-muted text-sm">
            {post.profiles.username.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
          <span 
            className="font-semibold cursor-pointer hover:opacity-70 text-sm sm:text-base truncate touch-manipulation"
            onClick={() => navigate(`/profile/${post.user_id}`)}
          >
            {post.profiles.username}
          </span>
          {post.profiles.is_verified && (
            <Check size={14} className="text-primary flex-shrink-0 sm:w-4 sm:h-4" />
          )}
          {post.profiles.is_premium && (
            <img 
              src={firegramLogo} 
              alt="Premium" 
              className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse flex-shrink-0" 
            />
          )}
          {post.profiles.is_admin && (
            <div className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-accent/20 flex-shrink-0">
              <Shield size={10} className="text-accent sm:w-3 sm:h-3" />
              <span className="text-[10px] sm:text-xs font-medium text-accent">CEO</span>
            </div>
          )}
        </div>
      </div>

      <div className="relative">
        <img
          src={images[currentImageIndex]}
          alt={post.caption || "Post"}
          className="w-full aspect-square object-cover cursor-pointer touch-manipulation"
          onClick={() => setImageViewerOpen(true)}
        />
        
        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 sm:p-2 transition-colors touch-manipulation active:scale-95"
            >
              <ChevronLeft size={18} className="sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 sm:p-2 transition-colors touch-manipulation active:scale-95"
            >
              <ChevronRight size={18} className="sm:w-5 sm:h-5" />
            </button>
            <div className="absolute bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 flex gap-1 sm:gap-1.5">
              {images.map((_, index) => (
                <div
                  key={index}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    index === currentImageIndex
                      ? "bg-white w-5 sm:w-6"
                      : "bg-white/50"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <button onClick={handleLike} className="transition-transform active:scale-90 touch-manipulation">
              <Flame
                size={22}
                className={`sm:w-6 sm:h-6 ${liked ? "fill-orange-500 text-orange-500" : "text-foreground"}`}
              />
            </button>
            <button 
              onClick={() => setCommentsOpen(true)}
              className="transition-transform active:scale-90 touch-manipulation"
            >
              <MessageCircle size={22} className="sm:w-6 sm:h-6" />
            </button>
          </div>
          <button onClick={handleSave} className="transition-transform active:scale-90 touch-manipulation">
            <Bookmark size={22} className={`sm:w-6 sm:h-6 ${saved ? "fill-foreground" : ""}`} />
          </button>
        </div>

        <div className="space-y-1">
          <p className="font-semibold text-sm sm:text-base">{post.likes_count.toLocaleString()} likes</p>
          {post.caption && (
            <p className="text-xs sm:text-sm">
              <span className="font-semibold mr-2">{post.profiles.username}</span>
              {post.caption}
            </p>
          )}
          {post.comments_count > 0 && (
            <button 
              onClick={() => setCommentsOpen(true)}
              className="text-xs sm:text-sm text-muted-foreground hover:text-foreground touch-manipulation"
            >
              View all {post.comments_count} comments
            </button>
          )}
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>

      <CommentsDialog
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
        postId={post.id}
        onCommentAdded={onUpdate}
      />

      <ImageViewerDialog
        open={imageViewerOpen}
        onOpenChange={setImageViewerOpen}
        images={images}
        currentIndex={currentImageIndex}
        onNavigate={(direction) => {
          if (direction === "prev") {
            setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
          } else {
            setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
          }
        }}
      />
    </Card>
  );
};

export default PostCard;
