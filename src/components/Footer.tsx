import { Link } from "react-router-dom";
import firegramLogo from "@/assets/firegram-logo.png";

const Footer = () => {
  return (
    <footer className="w-full bg-card/80 backdrop-blur-md border-t border-border mt-8">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col items-center gap-4">
          <Link to="/feed" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full fire-gradient p-0.5">
              <img src={firegramLogo} alt="Firegram" className="w-full h-full rounded-full" />
            </div>
            <span className="text-xl font-bold fire-text">Firegram</span>
          </Link>
          
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
            <Link to="/feed" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <span>•</span>
            <Link to="/shop" className="hover:text-foreground transition-colors">
              Shop
            </Link>
            <span>•</span>
            <Link to="/settings" className="hover:text-foreground transition-colors">
              Settings
            </Link>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Copyright © 2025 - Firegram
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
