import { useState, useEffect, useRef } from "react";
import { Flame, MessageCircle, Share2, Play, Pause, Check, Bookmark } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import CommentsDialog from "./CommentsDialog";

interface ReelCardProps {
  reel: {
    id: string;
    video_url: string;
    thumbnail_url: string | null;
    caption: string | null;
    likes_count: number;
    views_count: number;
    user_id: string;
    created_at: string;
    type?: "reel" | "ad";
    image_url?: string | null;
  };
  profile: {
    username: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
  isActive: boolean;
  onUpdate?: () => void;
  videoRef?: (el: HTMLVideoElement | null) => void;
}

const ReelCard = ({ reel, profile, isActive, onUpdate, videoRef }: ReelCardProps) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(reel.likes_count);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const internalVideoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const isAd = reel.type === "ad";

  useEffect(() => {
    checkAuth();
    checkIfLiked();
    checkIfSaved();
  }, []);

  useEffect(() => {
    const video = internalVideoRef.current;
    if (video) {
      if (isActive && !isAd) {
        video.play();
        setIsPlaying(true);
      } else {
        video.pause();
        setIsPlaying(false);
      }
    }
  }, [isActive, isAd]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const checkIfLiked = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("likes")
      .select()
      .eq("reel_id", reel.id)
      .eq("user_id", user.id)
      .maybeSingle();

    setIsLiked(!!data);
  };

  const checkIfSaved = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("saved")
      .select()
      .eq("reel_id", reel.id)
      .eq("user_id", user.id)
      .maybeSingle();

    setIsSaved(!!data);
  };

  const handleLike = async () => {
    if (!currentUser) {
      toast({
        title: "Login required",
        description: "You must be logged in to like",
        variant: "destructive",
      });
      return;
    }

    if (isLiked) {
      await supabase
        .from("likes")
        .delete()
        .eq("reel_id", reel.id)
        .eq("user_id", currentUser.id);

      await supabase
        .from("reels")
        .update({ likes_count: Math.max(0, likesCount - 1) })
        .eq("id", reel.id);

      setIsLiked(false);
      setLikesCount(Math.max(0, likesCount - 1));
    } else {
      await supabase
        .from("likes")
        .insert({ reel_id: reel.id, user_id: currentUser.id });

      await supabase
        .from("reels")
        .update({ likes_count: likesCount + 1 })
        .eq("id", reel.id);

      setIsLiked(true);
      setLikesCount(likesCount + 1);
    }
  };

  const handleSave = async () => {
    if (!currentUser) {
      toast({
        title: "Login required",
        description: "You must be logged in to save",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isSaved) {
        const { error } = await supabase
          .from("saved")
          .delete()
          .eq("reel_id", reel.id)
          .eq("user_id", currentUser.id);

        if (error) throw error;

        setIsSaved(false);
        toast({
          title: "Removed from saved",
          description: "Reel removed from your saved items",
        });
      } else {
        const { error } = await supabase
          .from("saved")
          .insert({ reel_id: reel.id, user_id: currentUser.id });

        if (error) {
          if (error.code === '23505') {
            setIsSaved(true);
            return;
          }
          throw error;
        }

        setIsSaved(true);
        toast({
          title: "Saved",
          description: "Reel saved to your profile",
        });
      }
    } catch (error: any) {
      console.error("Error saving reel:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save reel",
        variant: "destructive",
      });
    }
  };

  const togglePlay = () => {
    if (isAd) return; // Don't allow play/pause for ads
    
    if (internalVideoRef.current) {
      if (isPlaying) {
        internalVideoRef.current.pause();
        setIsPlaying(false);
      } else {
        internalVideoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  return (
    <div className="relative h-screen w-full snap-start snap-always bg-black">
      {isAd && reel.image_url ? (
        <img
          src={reel.image_url}
          alt="Advertisement"
          className="h-full w-full object-contain"
        />
      ) : (
        <video
          ref={(el) => {
            internalVideoRef.current = el;
            if (videoRef) videoRef(el);
          }}
          src={reel.video_url}
          loop
          playsInline
          className="h-full w-full object-contain"
          onClick={togglePlay}
          poster={reel.thumbnail_url || undefined}
        />
      )}
      
      {isAd && (
        <div className="absolute top-4 right-4 bg-orange-500/90 px-3 py-1 rounded-full">
          <span className="text-xs font-bold text-white">AD</span>
        </div>
      )}

      {!isPlaying && !isAd && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Button
            size="icon"
            variant="ghost"
            className="h-16 w-16 rounded-full bg-black/40 hover:bg-black/60"
            onClick={togglePlay}
          >
            <Play className="h-8 w-8 text-white fill-white" />
          </Button>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
            <Avatar 
              className="h-10 w-10 border-2 border-white cursor-pointer"
              onClick={() => navigate(`/profile/${reel.user_id}`)}
            >
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {profile.username[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-1">
              <span 
                className="font-semibold text-white cursor-pointer hover:opacity-70"
                onClick={() => navigate(`/profile/${reel.user_id}`)}
              >
                {profile.username}
              </span>
              {profile.is_verified && (
                <Check size={16} className="text-white" />
              )}
            </div>
            </div>
            {reel.caption && (
              <p className="text-sm text-white/90">{reel.caption}</p>
            )}
          </div>

          {!isAd && (
            <div className="flex flex-col items-center gap-4 ml-4">
              <Button
                size="icon"
                variant="ghost"
                onClick={handleLike}
                className="h-12 w-12 rounded-full hover:bg-white/20"
              >
                <Flame
                  className={`h-7 w-7 transition-colors ${
                    isLiked ? "fill-orange-500 text-orange-500" : "text-white"
                  }`}
                />
              </Button>
              <span className="text-xs text-white font-semibold">{likesCount}</span>

              <Button
                size="icon"
                variant="ghost"
                onClick={() => setCommentsOpen(true)}
                className="h-12 w-12 rounded-full hover:bg-white/20"
              >
                <MessageCircle className="h-7 w-7 text-white" />
              </Button>

              <Button
                size="icon"
                variant="ghost"
                onClick={handleSave}
                className="h-12 w-12 rounded-full hover:bg-white/20"
              >
                <Bookmark className={`h-7 w-7 ${isSaved ? "fill-white text-white" : "text-white"}`} />
              </Button>
            </div>
          )}
        </div>
      </div>

      {!isAd && (
        <CommentsDialog
          open={commentsOpen}
          onOpenChange={setCommentsOpen}
          reelId={reel.id}
          onCommentAdded={() => onUpdate?.()}
        />
      )}
    </div>
  );
};

export default ReelCard;
