import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Film, PlusSquare, Search, MessageCircle, User, Bell } from "lucide-react";
import firegramLogo from "@/assets/firegram-logo.png";
import { supabase } from "@/integrations/supabase/client";
import NotificationsDialog from "./NotificationsDialog";

const Navigation = () => {
  const location = useLocation();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchNotifications();
      
      // Setup realtime subscription
      const channel = supabase
        .channel('notifications-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${currentUserId}`
          },
          async (payload) => {
            // Fetch the new notification with profile data
            const { data: newNotification } = await supabase
              .from("notifications")
              .select("*, from_profile:profiles!notifications_from_user_id_fkey(username, avatar_url, is_verified)")
              .eq("id", payload.new.id)
              .single();

            if (newNotification) {
              // Add to notifications list
              setNotifications(prev => [newNotification, ...prev]);
              setUnreadCount(prev => prev + 1);

              // Send browser notification
              if ('Notification' in window && Notification.permission === 'granted') {
              const username = newNotification.from_profile?.username || "Someone";
                let message = "";
                
                switch (newNotification.type) {
                  case "follow":
                    message = `${username} started following you`;
                    break;
                  case "like":
                    message = `${username} liked your post`;
                    break;
                  case "comment":
                    message = `${username} commented on your post`;
                    break;
                  case "message":
                    message = `${username} sent you a message`;
                    break;
                  default:
                    message = newNotification.message || "New notification";
                }

                new Notification("Firegram", {
                  body: message,
                  icon: "/favicon.png",
                  badge: "/favicon.png",
                });
              }
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentUserId]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const fetchNotifications = async () => {
    if (!currentUserId) return;

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*, from_profile:profiles!notifications_from_user_id_fkey(username, avatar_url, is_verified)")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.read).length);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId);

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUserId) return;

    try {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", currentUserId)
        .eq("read", false);

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const navItems = [
    { path: "/feed", icon: Home, label: "Feed" },
    { path: "/reels", icon: Film, label: "Reels" },
    { path: "/create", icon: PlusSquare, label: "Create" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <>
      {/* Top Header with Logo and Actions */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border safe-top">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between">
          <Link to="/feed" className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full fire-gradient p-0.5">
              <img src={firegramLogo} alt="Firegram" className="w-full h-full rounded-full" />
            </div>
            <span className="text-lg sm:text-xl font-bold fire-text">Firegram</span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              to="/search"
              className={`transition-colors touch-manipulation ${
                location.pathname === "/search"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground active:text-primary"
              }`}
            >
              <Search size={22} className="sm:w-6 sm:h-6" />
            </Link>
            
            <button
              onClick={() => setNotificationsOpen(true)}
              className="relative transition-colors touch-manipulation text-muted-foreground hover:text-foreground active:text-primary"
            >
              <Bell size={22} className="sm:w-6 sm:h-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            
            <Link
              to="/messages"
              className={`transition-colors touch-manipulation ${
                location.pathname === "/messages" || location.pathname.startsWith("/messages/")
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground active:text-primary"
              }`}
            >
              <MessageCircle size={22} className="sm:w-6 sm:h-6" />
            </Link>
          </div>
        </div>
      </header>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border safe-bottom">
        <div className="max-w-6xl mx-auto px-2 sm:px-4 py-1.5 sm:py-2">
          <div className="flex items-center justify-around">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center gap-0.5 sm:gap-1 py-1.5 sm:py-2 px-2 sm:px-4 transition-all touch-manipulation min-w-[60px] sm:min-w-[72px] ${
                    isActive 
                      ? "text-primary" 
                      : "text-muted-foreground hover:text-foreground active:text-primary"
                  }`}
                >
                  <Icon className={isActive ? "fill-primary" : ""} size={22} />
                  <span className="text-[10px] sm:text-xs font-medium truncate max-w-full">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
      
      <NotificationsDialog
        open={notificationsOpen}
        onOpenChange={setNotificationsOpen}
        notifications={notifications}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
      />
    </>
  );
};

export default Navigation;
