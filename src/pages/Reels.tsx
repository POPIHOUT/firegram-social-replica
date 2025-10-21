import { useEffect, useState, useRef, useCallback } from "react";
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
  const [activeReelId, setActiveReelId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const reelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    checkAuth();
    fetchReelsWithAds();
  }, []);

  useEffect(() => {
    // Setup IntersectionObserver for autoplay
    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Find the entry with the highest intersection ratio
        let mostVisibleEntry = entries[0];
        let maxRatio = 0;
        
        entries.forEach((entry) => {
          if (entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            mostVisibleEntry = entry;
          }
        });

        // Activate the most visible reel if it's at least 50% visible
        if (mostVisibleEntry && mostVisibleEntry.intersectionRatio >= 0.5) {
          const reelId = mostVisibleEntry.target.getAttribute('data-reel-id');
          if (reelId && reelId !== activeReelId) {
            setActiveReelId(reelId);
          }
        }
      },
      {
        root: null,
        threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
        rootMargin: '0px',
      }
    );

    // Observe all reel elements
    Object.values(reelRefs.current).forEach((ref) => {
      if (ref && observerRef.current) {
        observerRef.current.observe(ref);
      }
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [reels, activeReelId]);

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
          video_url: ad.type === "video" ? ad.media_url : ad.media_url, // Use media_url for both
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

        // Set initial active reel
        const state = location.state as { initialReelId?: string } | null;
        if (state?.initialReelId) {
          setActiveReelId(state.initialReelId);
          const index = mixedContent.findIndex(r => r.id === state.initialReelId);
          if (index !== -1) {
            setTimeout(() => {
              if (containerRef.current) {
                containerRef.current.scrollTop = index * containerRef.current.clientHeight;
              }
            }, 100);
          }
        } else if (mixedContent.length > 0) {
          // Auto-activate first reel on load
          setActiveReelId(mixedContent[0].id);
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
        {reels.map((reel) => (
          <div
            key={reel.id}
            ref={(el) => { reelRefs.current[reel.id] = el; }}
            data-reel-id={reel.id}
          >
            <ReelCard
              reel={reel}
              profile={profiles[reel.user_id] || { username: "User", avatar_url: null, is_verified: false }}
              isActive={activeReelId === reel.id}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Reels;