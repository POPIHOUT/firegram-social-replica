import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  is_verified: boolean;
}

interface FollowingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

const FollowingDialog = ({ open, onOpenChange, userId }: FollowingDialogProps) => {
  const [following, setFollowing] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (open && userId) {
      fetchFollowing();
    }
  }, [open, userId]);

  const fetchFollowing = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("follows")
        .select("following_id, profiles!follows_following_id_fkey(id, username, full_name, avatar_url, is_verified)")
        .eq("follower_id", userId);

      if (error) throw error;

      const profilesData = data
        .map((item: any) => item.profiles)
        .filter((profile: any) => profile !== null);

      setFollowing(profilesData);
    } catch (error) {
      console.error("Error fetching following:", error);
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
          <DialogTitle>Following</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[400px] pr-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : following.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Not following anyone yet</p>
          ) : (
            <div className="space-y-4">
              {following.map((followedUser) => (
                <div
                  key={followedUser.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => handleProfileClick(followedUser.id)}
                >
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={followedUser.avatar_url} />
                    <AvatarFallback>
                      {followedUser.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="font-semibold truncate">{followedUser.username}</p>
                      {followedUser.is_verified && (
                        <Check size={14} className="text-primary" />
                      )}
                    </div>
                    {followedUser.full_name && (
                      <p className="text-sm text-muted-foreground truncate">
                        {followedUser.full_name}
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

export default FollowingDialog;
