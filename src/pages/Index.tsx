import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Flame } from "lucide-react";
import firegramLogo from "@/assets/firegram-logo.png";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-card to-background">
      <div className="text-center space-y-8 max-w-2xl">
        <div className="flex justify-center mb-8">
          <div className="relative w-32 h-32 rounded-full fire-gradient p-2 animate-pulse-slow glow-fire">
            <img 
              src={firegramLogo} 
              alt="Firegram" 
              className="w-full h-full rounded-full object-cover"
            />
          </div>
        </div>
        
        <h1 className="text-6xl sm:text-7xl font-bold mb-4">
          <span className="fire-text">Firegram</span>
        </h1>
        
        <p className="text-xl text-muted-foreground max-w-lg mx-auto">
          Share your moments, connect with friends, and set your feed on fire 🔥
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-12">
          <Button
            onClick={() => navigate("/auth")}
            size="lg"
            className="fire-gradient hover:opacity-90 transition-opacity font-semibold text-lg px-8 py-6 glow-fire"
          >
            Get Started
          </Button>
          <Button
            onClick={() => navigate("/feed")}
            size="lg"
            variant="outline"
            className="border-primary/30 hover:border-primary hover:bg-primary/10 text-lg px-8 py-6"
          >
            Explore Feed
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-8 mt-16 text-center">
          <div className="space-y-2">
            <div className="text-3xl font-bold fire-text">Share</div>
            <p className="text-sm text-muted-foreground">Post photos & videos</p>
          </div>
          <div className="space-y-2">
            <div className="text-3xl font-bold fire-text">Connect</div>
            <p className="text-sm text-muted-foreground">Follow your friends</p>
          </div>
          <div className="space-y-2">
            <div className="text-3xl font-bold fire-text">Discover</div>
            <p className="text-sm text-muted-foreground">Explore trending reels</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
