import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Megaphone, Eye, EyeOff, Trash2 } from "lucide-react";

interface UpdateAnnouncement {
  id: string;
  title: string;
  content: string;
  created_by: string;
  active: boolean;
  created_at: string;
  creator?: {
    username: string;
  };
}

export const UpdateAnnouncementManagement = () => {
  const [announcements, setAnnouncements] = useState<UpdateAnnouncement[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from("update_announcements")
      .select(`
        *,
        creator:profiles!update_announcements_created_by_fkey(username)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch announcements");
      return;
    }

    setAnnouncements(data || []);
  };

  const deactivateAnnouncement = async (announcementId: string) => {
    const { error } = await supabase
      .from("update_announcements")
      .update({ active: false })
      .eq("id", announcementId);

    if (error) {
      toast.error("Failed to deactivate announcement");
      return;
    }

    toast.success("Announcement deactivated");
    fetchAnnouncements();
  };

  const deleteAnnouncement = async (announcementId: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;

    const { error } = await supabase
      .from("update_announcements")
      .delete()
      .eq("id", announcementId);

    if (error) {
      toast.error("Failed to delete announcement");
      return;
    }

    toast.success("Announcement deleted");
    fetchAnnouncements();
  };

  const createAnnouncement = async () => {
    if (!title || !content) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("You must be logged in");
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("update_announcements")
      .insert({
        title,
        content,
        created_by: user.id,
        active: true
      });

    setLoading(false);

    if (error) {
      toast.error("Failed to create announcement");
      return;
    }

    toast.success("Announcement created successfully");
    setTitle("");
    setContent("");
    fetchAnnouncements();
  };

  const toggleActive = async (announcementId: string, currentActive: boolean) => {
    const { error } = await supabase
      .from("update_announcements")
      .update({ active: !currentActive })
      .eq("id", announcementId);

    if (error) {
      toast.error("Failed to update announcement");
      return;
    }

    toast.success(`Announcement ${!currentActive ? "activated" : "deactivated"}`);
    fetchAnnouncements();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5" />
            Create Update Announcement
          </CardTitle>
          <CardDescription>
            Create announcements that users will see when they log in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g., New Features Released!"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              placeholder="Describe the new update..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
            />
          </div>
          <Button onClick={createAnnouncement} disabled={loading}>
            <Megaphone className="w-4 h-4 mr-2" />
            Create Announcement
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">All Announcements</h3>
        {announcements.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No announcements found
            </CardContent>
          </Card>
        ) : (
          announcements.map((announcement) => (
            <Card key={announcement.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      {announcement.active ? (
                        <Eye className="w-4 h-4 text-primary" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                      )}
                      <h4 className="font-semibold">{announcement.title}</h4>
                    </div>
                    <p className="text-sm">{announcement.content}</p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Created by:</strong> {announcement.creator?.username || "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Created:</strong> {new Date(announcement.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`active-${announcement.id}`} className="text-sm">
                        {announcement.active ? "Active" : "Inactive"}
                      </Label>
                      <Switch
                        id={`active-${announcement.id}`}
                        checked={announcement.active}
                        onCheckedChange={() => toggleActive(announcement.id, announcement.active)}
                      />
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteAnnouncement(announcement.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};