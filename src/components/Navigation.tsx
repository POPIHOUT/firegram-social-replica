import { Link, useLocation } from "react-router-dom";
import { Home, Film, PlusSquare, Search, MessageCircle, User } from "lucide-react";
import firegramLogo from "@/assets/firegram-logo.png";

const Navigation = () => {
  const location = useLocation();

  const navItems = [
    { path: "/feed", icon: Home, label: "Feed" },
    { path: "/search", icon: Search, label: "Hľadať" },
    { path: "/create", icon: PlusSquare, label: "Vytvoriť" },
    { path: "/messages", icon: MessageCircle, label: "Správy" },
    { path: "/profile", icon: User, label: "Profil" },
  ];

  return (
    <>
      {/* Top Header with Logo */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-center">
          <Link to="/feed" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full fire-gradient p-0.5">
              <img src={firegramLogo} alt="Firegram" className="w-full h-full rounded-full" />
            </div>
            <span className="text-xl font-bold fire-text">Firegram</span>
          </Link>
        </div>
      </header>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-2">
          <div className="flex items-center justify-around">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center gap-1 py-2 px-4 transition-all ${
                    isActive 
                      ? "text-primary" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className={isActive ? "fill-primary" : ""} size={24} />
                  <span className="text-xs font-medium">{item.label}</span>
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
