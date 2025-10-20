import { useState, useEffect, useRef } from "react";
import { Heart, MessageCircle, Play, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import CommentsDialog from "./CommentsDialog";

interface VideoPostCardProps {
  reel: {
    id: string;
    user_id: string;
    video_url: string;
    caption: string | null;
    likes_count: number;
    created_at: string;
    profiles: {
      username: string;
      avatar_url: string | null;
      is_verified: boolean;
    };
  };
  onUpdate: () => void;
}

const VideoPostCard = ({ reel, onUpdate }: VideoPostCardProps) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(reel.likes_count);
  const [checkingLike, setCheckingLike] = useState(true);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkIfLiked();
  }, []);

  const checkIfLiked = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setCheckingLike(false);
      return;
    }

    const { data } = await supabase
      .from("likes")
      .select()
      .eq("reel_id", reel.id)
      .eq("user_id", user.id)
      .maybeSingle();

    setIsLiked(!!data);
    setCheckingLike(false);
  };

  const handleLike = async () => {
    if (checkingLike) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Login required",
        description: "You must be logged in",
        variant: "destructive",
      });
      return;
    }

    if (isLiked) {
      await supabase
        .from("likes")
        .delete()
        .eq("reel_id", reel.id)
        .eq("user_id", user.id);

      await supabase
        .from("reels")
        .update({ likes_count: Math.max(0, likesCount - 1) })
        .eq("id", reel.id);

      setIsLiked(false);
      setLikesCount(Math.max(0, likesCount - 1));
    } else {
      await supabase
        .from("likes")
        .insert({ reel_id: reel.id, user_id: user.id });

      await supabase
        .from("reels")
        .update({ likes_count: likesCount + 1 })
        .eq("id", reel.id);

      setIsLiked(true);
      setLikesCount(likesCount + 1);
    }

    onUpdate();
  };

  return (
    <Card className="overflow-hidden">
      <div className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <Avatar 
            className="cursor-pointer" 
            onClick={() => navigate(`/profile/${reel.user_id}`)}
          >
            <AvatarImage src={reel.profiles.avatar_url || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {reel.profiles.username[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-2">
            <p 
              className="font-semibold cursor-pointer hover:opacity-70"
              onClick={() => navigate(`/profile/${reel.user_id}`)}
            >
              {reel.profiles.username}
            </p>
            {reel.profiles.is_verified && (
              <Check size={16} className="text-primary" />
            )}
            <p className="text-xs text-muted-foreground">
              {new Date(reel.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="relative bg-black rounded-lg overflow-hidden aspect-video group">
          <video
            ref={videoRef}
            src={reel.video_url}
            controls
            className="w-full h-full object-contain"
            playsInline
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <Play className="w-16 h-16 text-white/80" />
          </div>
        </div>

        {reel.caption && (
          <p className="mt-4 text-sm">{reel.caption}</p>
        )}

        <div className="flex items-center gap-4 mt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            disabled={checkingLike}
            className="flex items-center gap-2"
          >
            <Heart
              className={`w-5 h-5 transition-colors ${
                isLiked ? "fill-red-500 text-red-500" : ""
              }`}
            />
            <span className="text-sm font-semibold">{likesCount}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCommentsOpen(true)}
            className="flex items-center gap-2"
          >
            <MessageCircle className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <CommentsDialog
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
        reelId={reel.id}
        onCommentAdded={onUpdate}
      />
    </Card>
  );
};

export default VideoPostCard;
