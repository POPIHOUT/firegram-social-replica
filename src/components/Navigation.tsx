import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Film, PlusSquare, User, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import firegramLogo from "@/assets/firegram-logo.png";

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out",
      description: "See you soon! 🔥",
    });
    navigate("/auth");
  };

  const navItems = [
    { path: "/feed", icon: Home, label: "Feed" },
    { path: "/reels", icon: Film, label: "Reels" },
    { path: "/create", icon: PlusSquare, label: "Create" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/feed" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full fire-gradient p-0.5">
            <img src={firegramLogo} alt="Firegram" className="w-full h-full rounded-full" />
          </div>
          <span className="text-xl font-bold fire-text hidden sm:inline">Firegram</span>
        </Link>

        <div className="flex items-center gap-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 transition-all ${
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={isActive ? "fill-primary" : ""} size={24} />
                <span className="hidden sm:inline text-sm">{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={handleLogout}
            className="text-muted-foreground hover:text-destructive transition-colors"
          >
            <LogOut size={24} />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
