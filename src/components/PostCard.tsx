import { useState, useEffect } from "react";
import { Heart, MessageCircle, Bookmark, Shield, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import CommentsDialog from "./CommentsDialog";

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

    checkIfLiked();
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

  return (
    <Card className="border-border bg-card overflow-hidden">
      <div className="p-4 flex items-center gap-3">
        <Avatar 
          className="w-10 h-10 border-2 border-primary/20 cursor-pointer"
          onClick={() => navigate(`/profile/${post.user_id}`)}
        >
          <AvatarImage src={post.profiles.avatar_url} />
          <AvatarFallback className="bg-muted">
            {post.profiles.username.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex items-center gap-2">
          <span 
            className="font-semibold cursor-pointer hover:opacity-70"
            onClick={() => navigate(`/profile/${post.user_id}`)}
          >
            {post.profiles.username}
          </span>
          {post.profiles.is_admin && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/20">
              <Shield size={12} className="text-accent" />
              <span className="text-xs font-medium text-accent">Owner</span>
            </div>
          )}
        </div>
      </div>

      <div className="relative">
        <img
          src={images[currentImageIndex]}
          alt={post.caption || "Post"}
          className="w-full aspect-square object-cover"
        />
        
        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, index) => (
                <div
                  key={index}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    index === currentImageIndex
                      ? "bg-white w-6"
                      : "bg-white/50"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={handleLike} className="transition-transform active:scale-90">
              <Heart
                size={24}
                className={liked ? "fill-destructive text-destructive" : "text-foreground"}
              />
            </button>
            <button 
              onClick={() => setCommentsOpen(true)}
              className="transition-transform active:scale-90"
            >
              <MessageCircle size={24} />
            </button>
          </div>
          <button onClick={() => setSaved(!saved)} className="transition-transform active:scale-90">
            <Bookmark size={24} className={saved ? "fill-foreground" : ""} />
          </button>
        </div>

        <div className="space-y-1">
          <p className="font-semibold">{post.likes_count.toLocaleString()} likes</p>
          {post.caption && (
            <p className="text-sm">
              <span className="font-semibold mr-2">{post.profiles.username}</span>
              {post.caption}
            </p>
          )}
          {post.comments_count > 0 && (
            <button 
              onClick={() => setCommentsOpen(true)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Zobraziť všetkých {post.comments_count} komentárov
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
    </Card>
  );
};

export default PostCard;
