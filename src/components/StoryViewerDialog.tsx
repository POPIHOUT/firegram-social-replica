import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { X, ChevronLeft, ChevronRight, Trash2, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  created_at: string;
  expires_at: string;
  views_count: number;
}

interface StoryGroup {
  user_id: string;
  username: string;
  avatar_url: string | null;
  is_verified: boolean;
  stories: Story[];
  hasViewed: boolean;
}

interface StoryViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  storyGroups: StoryGroup[];
  onStoriesUpdate: () => void;
}

const StoryViewerDialog = ({ 
  open, 
  onOpenChange, 
  userId, 
  storyGroups,
  onStoriesUpdate 
}: StoryViewerDialogProps) => {
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    const index = storyGroups.findIndex(g => g.user_id === userId);
    if (index !== -1) {
      setCurrentGroupIndex(index);
      setCurrentStoryIndex(0);
    }
  }, [userId, storyGroups]);

  useEffect(() => {
    if (open && currentGroup) {
      markAsViewed();
      startProgress();
    } else {
      stopProgress();
    }

    return () => stopProgress();
  }, [open, currentGroupIndex, currentStoryIndex]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const currentGroup = storyGroups[currentGroupIndex];
  const currentStory = currentGroup?.stories[currentStoryIndex];
  const isOwnStory = currentUserId === currentGroup?.user_id;

  const startProgress = () => {
    stopProgress();
    setProgress(0);

    const duration = currentStory?.media_type === 'video' ? 
      (videoRef.current?.duration || 15) * 1000 : 5000;

    const increment = 100 / (duration / 50);
    
    progressInterval.current = setInterval(() => {
      if (!isPaused) {
        setProgress(prev => {
          if (prev >= 100) {
            nextStory();
            return 0;
          }
          return prev + increment;
        });
      }
    }, 50);
  };

  const stopProgress = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  };

  const markAsViewed = async () => {
    if (!currentStory || !currentUserId || isOwnStory) return;

    try {
      // Use the simplified version with viewer_id (required by TypeScript, set by trigger)
      await supabase
        .from("story_views")
        .insert([{
          story_id: currentStory.id,
          viewer_id: currentUserId, // Required by TypeScript, will be overridden by trigger
        }]);

      await supabase
        .from("stories")
        .update({ views_count: currentStory.views_count + 1 })
        .eq("id", currentStory.id);
    } catch (error) {
      console.error("Error marking story as viewed:", error);
    }
  };

  const nextStory = () => {
    if (currentStoryIndex < currentGroup.stories.length - 1) {
      setCurrentStoryIndex(prev => prev + 1);
    } else if (currentGroupIndex < storyGroups.length - 1) {
      setCurrentGroupIndex(prev => prev + 1);
      setCurrentStoryIndex(0);
    } else {
      onOpenChange(false);
    }
  };

  const previousStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
    } else if (currentGroupIndex > 0) {
      setCurrentGroupIndex(prev => prev - 1);
      const prevGroup = storyGroups[currentGroupIndex - 1];
      setCurrentStoryIndex(prevGroup.stories.length - 1);
    }
  };

  const handleDeleteStory = async () => {
    if (!currentStory || !isOwnStory) return;

    try {
      const { error } = await supabase
        .from("stories")
        .delete()
        .eq("id", currentStory.id);

      if (error) throw error;

      toast({
        title: "Story deleted",
        description: "Your story has been removed",
      });

      onStoriesUpdate();
      
      // Move to next story or close
      if (currentGroup.stories.length > 1) {
        if (currentStoryIndex < currentGroup.stories.length - 1) {
          setCurrentStoryIndex(prev => prev + 1);
        } else {
          setCurrentStoryIndex(prev => prev - 1);
        }
      } else {
        onOpenChange(false);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!currentGroup || !currentStory) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md h-[80vh] p-0 bg-black">
        <div className="relative h-full w-full">
          {/* Progress bars */}
          <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-2">
            {currentGroup.stories.map((_, index) => (
              <div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-100"
                  style={{
                    width: index < currentStoryIndex ? '100%' : 
                           index === currentStoryIndex ? `${progress}%` : '0%'
                  }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="absolute top-4 left-0 right-0 z-20 flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <Avatar 
                className="h-10 w-10 border-2 border-white cursor-pointer"
                onClick={() => {
                  navigate(`/profile/${currentGroup.user_id}`);
                  onOpenChange(false);
                }}
              >
                <AvatarImage src={currentGroup.avatar_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {currentGroup.username[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-1">
                <span className="text-white font-semibold text-sm">
                  {currentGroup.username}
                </span>
                {currentGroup.is_verified && (
                  <Check size={14} className="text-white" />
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isOwnStory && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleDeleteStory}
                  className="h-8 w-8 text-white hover:bg-white/20"
                >
                  <Trash2 size={18} />
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 text-white hover:bg-white/20"
              >
                <X size={20} />
              </Button>
            </div>
          </div>

          {/* Story content */}
          <div 
            className="h-full w-full flex items-center justify-center"
            onMouseDown={() => setIsPaused(true)}
            onMouseUp={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
          >
            {currentStory.media_type === 'video' ? (
              <video
                ref={videoRef}
                src={currentStory.media_url}
                className="max-h-full max-w-full object-contain"
                autoPlay
                muted
                onEnded={nextStory}
                onLoadedMetadata={() => startProgress()}
              />
            ) : (
              <img
                src={currentStory.media_url}
                alt="Story"
                className="max-h-full max-w-full object-contain"
              />
            )}
          </div>

          {/* Navigation */}
          <button
            onClick={previousStory}
            className="absolute left-0 top-0 bottom-0 w-1/3 z-10"
            disabled={currentGroupIndex === 0 && currentStoryIndex === 0}
          />
          <button
            onClick={nextStory}
            className="absolute right-0 top-0 bottom-0 w-1/3 z-10"
          />

          {/* Navigation arrows */}
          {currentGroupIndex > 0 || currentStoryIndex > 0 ? (
            <Button
              size="icon"
              variant="ghost"
              onClick={previousStory}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 text-white hover:bg-white/20"
            >
              <ChevronLeft size={24} />
            </Button>
          ) : null}

          {currentGroupIndex < storyGroups.length - 1 || currentStoryIndex < currentGroup.stories.length - 1 ? (
            <Button
              size="icon"
              variant="ghost"
              onClick={nextStory}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 text-white hover:bg-white/20"
            >
              <ChevronRight size={24} />
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StoryViewerDialog;
