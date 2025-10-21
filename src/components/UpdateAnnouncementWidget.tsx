import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Sparkles } from "lucide-react";
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
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-5">
      <Card className="border-primary shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-primary" />
              New Update!
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-6 w-6 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <h4 className="font-semibold">{announcement.title}</h4>
          <p className="text-sm text-muted-foreground">{announcement.content}</p>
          <p className="text-xs text-muted-foreground">
            — {announcement.creator?.username || "Admin"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};