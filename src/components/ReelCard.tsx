import { useState, useEffect, useRef } from "react";
import { Heart, MessageCircle, Share2, Play, Pause } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

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
  };
  profile: {
    username: string;
    avatar_url: string | null;
  };
  isActive: boolean;
}

const ReelCard = ({ reel, profile, isActive }: ReelCardProps) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(reel.likes_count);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    checkIfLiked();
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [isActive]);

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

  const handleLike = async () => {
    if (!currentUser) {
      toast({
        title: "Prihlásenie potrebné",
        description: "Musíte byť prihlásený pre lajkovanie",
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

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  return (
    <div className="relative h-screen w-full snap-start snap-always bg-black">
      <video
        ref={videoRef}
        src={reel.video_url}
        loop
        playsInline
        className="h-full w-full object-contain"
        onClick={togglePlay}
        poster={reel.thumbnail_url || undefined}
      />

      {!isPlaying && (
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
            <span 
              className="font-semibold text-white cursor-pointer hover:opacity-70"
              onClick={() => navigate(`/profile/${reel.user_id}`)}
            >
              {profile.username}
            </span>
            </div>
            {reel.caption && (
              <p className="text-sm text-white/90">{reel.caption}</p>
            )}
          </div>

          <div className="flex flex-col items-center gap-4 ml-4">
            <Button
              size="icon"
              variant="ghost"
              onClick={handleLike}
              className="h-12 w-12 rounded-full hover:bg-white/20"
            >
              <Heart
                className={`h-7 w-7 transition-colors ${
                  isLiked ? "fill-red-500 text-red-500" : "text-white"
                }`}
              />
            </Button>
            <span className="text-xs text-white font-semibold">{likesCount}</span>

            <Button
              size="icon"
              variant="ghost"
              className="h-12 w-12 rounded-full hover:bg-white/20"
            >
              <MessageCircle className="h-7 w-7 text-white" />
            </Button>

            <Button
              size="icon"
              variant="ghost"
              className="h-12 w-12 rounded-full hover:bg-white/20"
            >
              <Share2 className="h-7 w-7 text-white" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReelCard;
