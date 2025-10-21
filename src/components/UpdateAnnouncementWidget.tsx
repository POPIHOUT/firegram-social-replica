import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { X, Megaphone } from "lucide-react";
import { toast } from "sonner";

interface UpdateAnnouncement {
  id: string;
  title: string;
  content: string;
  creator?: {
    username: string;
  };
}

export const UpdateAnnouncementWidget = () => {
  const [announcement, setAnnouncement] = useState<UpdateAnnouncement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    checkForNewAnnouncements();
  }, []);

  const checkForNewAnnouncements = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get active announcements
    const { data: announcements } = await supabase
      .from("update_announcements")
      .select(`
        *,
        creator:profiles!update_announcements_created_by_fkey(username)
      `)
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!announcements || announcements.length === 0) return;

    const latestAnnouncement = announcements[0];

    // Check if user has already seen this announcement
    const { data: viewed } = await supabase
      .from("user_announcement_views")
      .select("id")
      .eq("user_id", user.id)
      .eq("announcement_id", latestAnnouncement.id)
      .single();

    if (!viewed) {
      setAnnouncement(latestAnnouncement);
      setVisible(true);
    }
  };

  const handleClose = async () => {
    if (!announcement) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Mark as viewed
    const { error } = await supabase
      .from("user_announcement_views")
      .insert({
        user_id: user.id,
        announcement_id: announcement.id
      });

    if (error) {
      toast.error("Failed to mark announcement as viewed");
      return;
    }

    setVisible(false);
  };

  if (!visible || !announcement) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-br from-background/95 to-secondary/20 backdrop-blur-sm animate-in fade-in-0">
      <div className="max-w-2xl w-full bg-background border-2 border-primary rounded-lg shadow-2xl animate-in zoom-in-95">
        <div className="p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-full">
                <Megaphone className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{announcement.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  New Update from {announcement.creator?.username || "Admin"}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          <div className="bg-secondary/50 p-6 rounded-lg">
            <p className="text-base leading-relaxed whitespace-pre-wrap">{announcement.content}</p>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleClose} size="lg">
              Got it!
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};