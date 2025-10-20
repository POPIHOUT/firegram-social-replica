import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import ReelCard from "@/components/ReelCard";
import { Loader2 } from "lucide-react";

interface Reel {
  id: string;
  video_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  likes_count: number;
  views_count: number;
  user_id: string;
  created_at: string;
  type?: "reel" | "ad";
}

interface Profile {
  username: string;
  avatar_url: string | null;
  is_verified: boolean;
}

const Reels = () => {
  const [loading, setLoading] = useState(true);
  const [reels, setReels] = useState<Reel[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    checkAuth();
    fetchReelsWithAds();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const clientHeight = container.clientHeight;
      const newIndex = Math.round(scrollTop / clientHeight);
      
      if (newIndex !== currentIndex) {
        // Pause previous video
        const prevVideo = videoRefs.current[currentIndex];
        if (prevVideo) {
          prevVideo.pause();
        }
        
        // Play new video
        const newVideo = videoRefs.current[newIndex];
        if (newVideo) {
          newVideo.play();
        }
        
        setCurrentIndex(newIndex);
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [currentIndex]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchReelsWithAds = async () => {
    try {
      // Fetch reels
      const { data: reelsData, error: reelsError } = await supabase
        .from("reels")
        .select("*")
        .order("created_at", { ascending: false });

      if (reelsError) throw reelsError;

      // Fetch active advertisements
      const { data: adsData, error: adsError } = await supabase
        .from("advertisements")
        .select("*")
        .eq("active", true)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (adsError) throw adsError;

      if (reelsData && reelsData.length > 0) {
        // Mark reels as type "reel"
        const markedReels = reelsData.map(r => ({ ...r, type: "reel" as const }));
        
        // Mark ads as type "ad" and format them like reels
        const markedAds = (adsData || []).map(ad => ({
          id: ad.id,
          video_url: ad.type === "video" ? ad.media_url : "",
          thumbnail_url: ad.thumbnail_url,
          caption: ad.caption,
          likes_count: 0,
          views_count: 0,
          user_id: ad.user_id,
          created_at: ad.created_at,
          type: "ad" as const,
          image_url: ad.type === "image" ? ad.media_url : null,
        }));

        // Insert ads every 2 reels
        const mixedContent: Reel[] = [];
        let adIndex = 0;
        
        for (let i = 0; i < markedReels.length; i++) {
          mixedContent.push(markedReels[i]);
          
          // After every 2nd reel, insert an ad
          if ((i + 1) % 2 === 0 && adIndex < markedAds.length) {
            mixedContent.push(markedAds[adIndex] as any);
            adIndex++;
            
            // Loop through ads if we have more slots than ads
            if (adIndex >= markedAds.length) {
              adIndex = 0;
            }
          }
        }

        setReels(mixedContent);

        // Fetch profiles for all users
        const userIds = [...new Set(mixedContent.map(item => item.user_id))];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, is_verified")
          .in("id", userIds);

        if (profilesData) {
          const profilesMap: Record<string, Profile> = {};
          profilesData.forEach(profile => {
            profilesMap[profile.id] = {
              username: profile.username,
              avatar_url: profile.avatar_url,
              is_verified: profile.is_verified || false,
            };
          });
          setProfiles(profilesMap);
        }

        // Scroll to initial reel if specified
        const state = location.state as { initialReelId?: string } | null;
        if (state?.initialReelId) {
          const index = mixedContent.findIndex(r => r.id === state.initialReelId);
          if (index !== -1) {
            setCurrentIndex(index);
            setTimeout(() => {
              if (containerRef.current) {
                containerRef.current.scrollTop = index * containerRef.current.clientHeight;
              }
            }, 100);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching reels:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="min-h-screen bg-black">
        <Navigation />
        <main className="flex items-center justify-center h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">No reels yet</h2>
            <p className="text-white/60">Be the first to add a reel 🔥</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Navigation />
      <div
        ref={containerRef}
        className="h-screen overflow-y-scroll snap-y snap-mandatory"
        style={{ 
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none',
          scrollBehavior: 'smooth',
          overscrollBehavior: 'contain'
        }}
      >
        <style>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        {reels.map((reel, index) => (
          <ReelCard
            key={reel.id}
            reel={reel}
            profile={profiles[reel.user_id] || { username: "User", avatar_url: null, is_verified: false }}
            isActive={index === currentIndex}
            videoRef={(el) => { videoRefs.current[index] = el; }}
          />
        ))}
      </div>
    </div>
  );
};

export default Reels;