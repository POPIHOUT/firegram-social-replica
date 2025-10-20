import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AddStoryDialog from "./AddStoryDialog";
import StoryViewerDialog from "./StoryViewerDialog";

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

const StoriesBar = () => {
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [hasOwnStory, setHasOwnStory] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    fetchStories();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const fetchStories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all active stories
      const { data: storiesData, error } = await supabase
        .from("stories")
        .select(`
          *,
          profiles (
            username,
            avatar_url,
            is_verified
          )
        `)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!storiesData) return;

      // Fetch story views for current user
      const { data: viewsData } = await supabase
        .from("story_views")
        .select("story_id")
        .eq("viewer_id", user.id);

      const viewedStoryIds = new Set(viewsData?.map(v => v.story_id) || []);

      // Group stories by user
      const grouped = storiesData.reduce((acc, story) => {
        if (!acc[story.user_id]) {
          acc[story.user_id] = {
            user_id: story.user_id,
            username: (story.profiles as any).username,
            avatar_url: (story.profiles as any).avatar_url,
            is_verified: (story.profiles as any).is_verified,
            stories: [],
            hasViewed: false,
          };
        }
        acc[story.user_id].stories.push(story);
        return acc;
      }, {} as Record<string, StoryGroup>);

      // Check if all stories in a group have been viewed
      Object.values(grouped).forEach(group => {
        group.hasViewed = group.stories.every(s => viewedStoryIds.has(s.id));
      });

      // Separate own stories and others
      const ownStories = grouped[user.id];
      const otherGroups = Object.values(grouped).filter(g => g.user_id !== user.id);

      setHasOwnStory(!!ownStories);

      // Put own stories first, then sort others by viewed status
      const sortedGroups = [
        ...(ownStories ? [ownStories] : []),
        ...otherGroups.sort((a, b) => {
          if (a.hasViewed === b.hasViewed) return 0;
          return a.hasViewed ? 1 : -1;
        })
      ];

      setStoryGroups(sortedGroups);
    } catch (error) {
      console.error("Error fetching stories:", error);
    }
  };

  const handleStoryClick = (userId: string) => {
    setSelectedUserId(userId);
    setViewerOpen(true);
  };

  if (storyGroups.length === 0 && !currentUserId) return null;

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4 px-2 scrollbar-hide border-b border-border">
        {/* Add story button */}
        <div className="flex flex-col items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setAddDialogOpen(true)}
            className="relative"
          >
            <Avatar className={`h-16 w-16 border-2 ${hasOwnStory ? 'border-primary' : 'border-muted'}`}>
              <AvatarImage src={storyGroups.find(g => g.user_id === currentUserId)?.avatar_url || undefined} />
              <AvatarFallback className="bg-muted">
                {storyGroups.find(g => g.user_id === currentUserId)?.username?.[0]?.toUpperCase() || 'Y'}
              </AvatarFallback>
            </Avatar>
            <div className="absolute bottom-0 right-0 bg-primary rounded-full p-1">
              <Plus size={12} className="text-primary-foreground" />
            </div>
          </button>
          <p className="text-xs text-center w-16 truncate">Your story</p>
        </div>

        {/* Stories from others */}
        {storyGroups.filter(g => g.user_id !== currentUserId).map((group) => (
          <div key={group.user_id} className="flex flex-col items-center gap-2 flex-shrink-0">
            <button
              onClick={() => handleStoryClick(group.user_id)}
              className="relative"
            >
              <Avatar 
                className={`h-16 w-16 border-2 ${
                  group.hasViewed ? 'border-muted' : 'border-primary'
                }`}
              >
                <AvatarImage src={group.avatar_url || undefined} />
                <AvatarFallback className="bg-muted">
                  {group.username[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </button>
            <p className="text-xs text-center w-16 truncate">{group.username}</p>
          </div>
        ))}
      </div>

      <AddStoryDialog 
        open={addDialogOpen} 
        onOpenChange={setAddDialogOpen}
        onStoryAdded={fetchStories}
      />

      {selectedUserId && (
        <StoryViewerDialog
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          userId={selectedUserId}
          storyGroups={storyGroups}
          onStoriesUpdate={fetchStories}
        />
      )}
    </>
  );
};

export default StoriesBar;
