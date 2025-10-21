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
  const [scrollBlocked, setScrollBlocked] = useState(false);
  const [activeTab, setActiveTab] = useState<"foryou" | "friends">("foryou");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const reelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchReelsWithAds();
    }
  }, [activeTab, currentUserId]);

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
    } else {
      setCurrentUserId(session.user.id);
    }
  };

  const fetchReelsWithAds = async () => {
    if (!currentUserId) return;
    
    try {
      let reelsData;
      
      if (activeTab === "friends") {
        // Fetch reels only from followed users
        const { data: followedUsers } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", currentUserId);

        if (!followedUsers || followedUsers.length === 0) {
          setReels([]);
          setLoading(false);
          return;
        }

        const followedIds = followedUsers.map(f => f.following_id);
        
        const { data, error: reelsError } = await supabase
          .from("reels")
          .select("*")
          .in("user_id", followedIds)
          .order("created_at", { ascending: false });

        if (reelsError) throw reelsError;
        reelsData = data;
      } else {
        // For You - fetch all reels and use AI to rank them
        const { data, error: reelsError } = await supabase
          .from("reels")
          .select("*")
          .order("created_at", { ascending: false });

        if (reelsError) throw reelsError;
        
        // Get user's interaction history for algorithm
        const { data: userLikes } = await supabase
          .from("likes")
          .select("reel_id")
          .eq("user_id", currentUserId);

        const { data: userFollows } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", currentUserId);

        const likedReelIds = userLikes?.map(l => l.reel_id) || [];
        const followedUserIds = userFollows?.map(f => f.following_id) || [];

        // Simple algorithm: prioritize followed users' content and recently liked content
        reelsData = data?.sort((a, b) => {
          const aScore = 
            (followedUserIds.includes(a.user_id) ? 100 : 0) +
            (likedReelIds.includes(a.id) ? 50 : 0) +
            a.likes_count * 2 +
            a.views_count * 0.5;
          
          const bScore = 
            (followedUserIds.includes(b.user_id) ? 100 : 0) +
            (likedReelIds.includes(b.id) ? 50 : 0) +
            b.likes_count * 2 +
            b.views_count * 0.5;

          return bScore - aScore;
        });
      }

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
          // Auto-activate first reel on load and force play
          const firstReel = mixedContent[0];
          setActiveReelId(firstReel.id);
          
          // Force initial scroll position
          setTimeout(() => {
            if (containerRef.current) {
              containerRef.current.scrollTop = 0;
            }
          }, 50);
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
        
        {/* Tab Navigation */}
        <div className="fixed top-16 left-0 right-0 z-30 bg-black/80 backdrop-blur-sm border-b border-border">
          <div className="flex">
            <button
              onClick={() => setActiveTab("foryou")}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                activeTab === "foryou"
                  ? "text-white border-b-2 border-primary"
                  : "text-white/60 hover:text-white/80"
              }`}
            >
              For You
            </button>
            <button
              onClick={() => setActiveTab("friends")}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                activeTab === "friends"
                  ? "text-white border-b-2 border-primary"
                  : "text-white/60 hover:text-white/80"
              }`}
            >
              Friends
            </button>
          </div>
        </div>
        
        <main className="flex items-center justify-center h-screen pt-16">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">
              {activeTab === "friends" ? "No reels from friends" : "No reels yet"}
            </h2>
            <p className="text-white/60">
              {activeTab === "friends" 
                ? "Follow people to see their reels here 👥" 
                : "Be the first to add a reel 🔥"}
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Navigation />
      
      {/* Tab Navigation */}
      <div className="fixed top-16 left-0 right-0 z-30 bg-black/80 backdrop-blur-sm border-b border-border">
        <div className="flex">
          <button
            onClick={() => setActiveTab("foryou")}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              activeTab === "foryou"
                ? "text-white border-b-2 border-primary"
                : "text-white/60 hover:text-white/80"
            }`}
          >
            For You
          </button>
          <button
            onClick={() => setActiveTab("friends")}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              activeTab === "friends"
                ? "text-white border-b-2 border-primary"
                : "text-white/60 hover:text-white/80"
            }`}
          >
            Friends
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="h-screen overflow-y-scroll snap-y snap-mandatory pt-16"
        style={{
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none',
          scrollBehavior: 'smooth',
          overscrollBehavior: 'contain',
          overflow: scrollBlocked ? 'hidden' : 'scroll'
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
              onAdTimerComplete={() => setScrollBlocked(false)}
              onAdTimerStart={(shouldBlock) => setScrollBlocked(shouldBlock)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Reels;