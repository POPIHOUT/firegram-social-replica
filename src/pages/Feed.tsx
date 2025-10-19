import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import PostCard from "@/components/PostCard";
import VideoPostCard from "@/components/VideoPostCard";
import { Loader2 } from "lucide-react";

interface Post {
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
}

interface Reel {
  id: string;
  video_url: string;
  caption: string | null;
  likes_count: number;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

type FeedItem = 
  | { type: 'post'; data: Post }
  | { type: 'reel'; data: Reel };

const Feed = () => {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    fetchFeed();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchFeed = async () => {
    try {
      const [postsResult, reelsResult] = await Promise.all([
        supabase
          .from("posts")
          .select(`
            *,
            profiles (
              username,
              avatar_url,
              is_admin
            )
          `)
          .order("created_at", { ascending: false }),
        supabase
          .from("reels")
          .select(`
            *,
            profiles (
              username,
              avatar_url
            )
          `)
          .order("created_at", { ascending: false })
      ]);

      if (postsResult.error) throw postsResult.error;
      if (reelsResult.error) throw reelsResult.error;

      const posts: FeedItem[] = (postsResult.data || []).map(post => ({
        type: 'post' as const,
        data: post
      }));

      const reels: FeedItem[] = (reelsResult.data || []).map(reel => ({
        type: 'reel' as const,
        data: reel
      }));

      const combined = [...posts, ...reels].sort((a, b) => 
        new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime()
      );

      setFeedItems(combined);
    } catch (error) {
      console.error("Error fetching feed:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="max-w-2xl mx-auto pt-20 px-4 pb-24">
        <div className="space-y-6">
          {feedItems.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">Zatiaľ žiadny obsah</p>
              <p className="text-sm text-muted-foreground mt-2">Buďte prvý, kto pridá obsah! 🔥</p>
            </div>
          ) : (
            feedItems.map((item) => 
              item.type === 'post' ? (
                <PostCard key={item.data.id} post={item.data} onUpdate={fetchFeed} />
              ) : (
                <VideoPostCard key={item.data.id} reel={item.data} onUpdate={fetchFeed} />
              )
            )
          )}
        </div>
      </main>
    </div>
  );
};

export default Feed;
