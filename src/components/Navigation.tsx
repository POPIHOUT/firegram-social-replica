import { Link, useLocation } from "react-router-dom";
import { Home, Film, PlusSquare, Search, MessageCircle, User } from "lucide-react";
import firegramLogo from "@/assets/firegram-logo.png";

const Navigation = () => {
  const location = useLocation();

  const navItems = [
    { path: "/feed", icon: Home, label: "Feed" },
    { path: "/reels", icon: Film, label: "Reels" },
    { path: "/create", icon: PlusSquare, label: "Vytvoriť" },
    { path: "/profile", icon: User, label: "Profil" },
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
    </>
  );
};

export default Navigation;
