import { useState } from "react";
import { Heart, MessageCircle, Bookmark, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface PostCardProps {
  post: {
    id: string;
    user_id: string;
    image_url: string;
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
  const { toast } = useToast();

  const handleLike = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (liked) {
        await supabase
          .from("likes")
          .delete()
          .eq("user_id", user.id)
          .eq("post_id", post.id);
        
        await supabase
          .from("posts")
          .update({ likes_count: Math.max(0, post.likes_count - 1) })
          .eq("id", post.id);
      } else {
        await supabase
          .from("likes")
          .insert({ user_id: user.id, post_id: post.id });

        await supabase
          .from("posts")
          .update({ likes_count: post.likes_count + 1 })
          .eq("id", post.id);
      }

      setLiked(!liked);
      onUpdate();
    } catch (error) {
      console.error("Error liking post:", error);
      toast({
        title: "Error",
        description: "Failed to like post",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="border-border bg-card overflow-hidden">
      <div className="p-4 flex items-center gap-3">
        <Avatar className="w-10 h-10 border-2 border-primary/20">
          <AvatarImage src={post.profiles.avatar_url} />
          <AvatarFallback className="bg-muted">
            {post.profiles.username.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex items-center gap-2">
          <span className="font-semibold">{post.profiles.username}</span>
          {post.profiles.is_admin && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/20">
              <Shield size={12} className="text-accent" />
              <span className="text-xs font-medium text-accent">Owner</span>
            </div>
          )}
        </div>
      </div>

      <img
        src={post.image_url}
        alt={post.caption || "Post"}
        className="w-full aspect-square object-cover"
      />

      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={handleLike} className="transition-transform active:scale-90">
              <Heart
                size={24}
                className={liked ? "fill-destructive text-destructive" : "text-foreground"}
              />
            </button>
            <button className="transition-transform active:scale-90">
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
            <button className="text-sm text-muted-foreground hover:text-foreground">
              View all {post.comments_count} comments
            </button>
          )}
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>
    </Card>
  );
};

export default PostCard;
