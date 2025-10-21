import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface Notification {
  id: string;
  type: string;
  from_user_id: string | null;
  post_id: string | null;
  reel_id: string | null;
  message: string | null;
  read: boolean;
  created_at: string;
  from_profile?: {
    username: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
}

interface NotificationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}

const NotificationsDialog = ({
  open,
  onOpenChange,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
}: NotificationsDialogProps) => {
  const navigate = useNavigate();

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }

    if (notification.type === "follow" && notification.from_user_id) {
      navigate(`/profile/${notification.from_user_id}`);
      onOpenChange(false);
    } else if (notification.type === "like" && notification.post_id) {
      // Navigate to post
      onOpenChange(false);
    } else if (notification.type === "comment" && notification.post_id) {
      // Navigate to post
      onOpenChange(false);
    }
  };

  const getNotificationMessage = (notification: Notification) => {
    const username = notification.from_profile?.username || "Someone";
    switch (notification.type) {
      case "follow":
        return `${username} started following you`;
      case "like":
        return `${username} liked your post`;
      case "comment":
        return `${username} commented on your post`;
      default:
        return notification.message || "New notification";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Notifications</DialogTitle>
            {notifications.some(n => !n.read) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onMarkAllAsRead}
                className="text-xs"
              >
                Mark all as read
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-2 overflow-y-auto max-h-[60vh]">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  notification.read ? "bg-muted/30" : "bg-primary/10 hover:bg-primary/20"
                }`}
              >
                <Avatar className="h-10 w-10 border-2 border-border">
                  <AvatarImage src={notification.from_profile?.avatar_url || undefined} />
                  <AvatarFallback>
                    {notification.from_profile?.username?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-medium truncate">
                      {notification.from_profile?.username}
                    </p>
                    {notification.from_profile?.is_verified && (
                      <Check size={14} className="text-primary flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {getNotificationMessage(notification)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </p>
                </div>

                {!notification.read && (
                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationsDialog;
