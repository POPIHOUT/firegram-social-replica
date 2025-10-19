import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Flame } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  is_verified: boolean;
}

interface FollowersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

const FollowersDialog = ({ open, onOpenChange, userId }: FollowersDialogProps) => {
  const [followers, setFollowers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (open && userId) {
      fetchFollowers();
    }
  }, [open, userId]);

  const fetchFollowers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("follows")
        .select("follower_id, profiles!follows_follower_id_fkey(id, username, full_name, avatar_url, is_verified)")
        .eq("following_id", userId);

      if (error) throw error;

      const profilesData = data
        .map((item: any) => item.profiles)
        .filter((profile: any) => profile !== null);

      setFollowers(profilesData);
    } catch (error) {
      console.error("Error fetching followers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileClick = (profileId: string) => {
    onOpenChange(false);
    navigate(`/profile/${profileId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Followers</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[400px] pr-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : followers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No followers yet</p>
          ) : (
            <div className="space-y-4">
              {followers.map((follower) => (
                <div
                  key={follower.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => handleProfileClick(follower.id)}
                >
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={follower.avatar_url} />
                    <AvatarFallback>
                      {follower.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="font-semibold truncate">{follower.username}</p>
                      {follower.is_verified && (
                        <Flame size={16} className="text-primary fill-primary flex-shrink-0" />
                      )}
                    </div>
                    {follower.full_name && (
                      <p className="text-sm text-muted-foreground truncate">
                        {follower.full_name}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default FollowersDialog;
