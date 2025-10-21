import React from "react";

interface ProfileEffectProps {
  effectType: string;
  icon: string;
  scope?: "screen" | "avatar";
}

// ProfileEffect can render different effect types based on effectType
const ProfileEffect = ({ effectType, icon, scope = "screen" }: ProfileEffectProps) => {
  if (scope === "avatar") {
    // Edge-only ring around the avatar with effect-specific styling
    return (
      <div className="absolute inset-0 z-30 pointer-events-none">
        {/* Animated gradient ring clipped to edges only */}
        <div
          className="absolute inset-0 rounded-full animate-spin"
          style={{
            background:
              effectType === 'neon' 
                ? "conic-gradient(from 0deg, hsl(280 100% 60%) 0%, hsl(200 100% 60%) 25%, hsl(280 100% 60%) 50%, hsl(200 100% 60%) 75%, hsl(280 100% 60%) 100%)"
                : effectType === 'lightning'
                ? "conic-gradient(from 0deg, hsl(50 100% 60%) 0%, hsl(200 100% 60%) 50%, hsl(50 100% 60%) 100%)"
                : "conic-gradient(from 0deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 25%, hsl(var(--primary)) 50%, hsl(var(--accent)) 75%, hsl(var(--primary)) 100%)",
            WebkitMask:
              "radial-gradient(farthest-side, transparent calc(100% - 6px), black 0)",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 6px), black 0)",
            animationDuration: effectType === 'lightning' ? "3s" : "6s",
            opacity: 0.8,
          }}
        />

        {/* Small glow pulses distributed around the edge */}
        {[...Array(8)].map((_, i) => {
          const angle = (i / 8) * 2 * Math.PI;
          const x = 50 + Math.cos(angle) * 44; // keep inside padding
          const y = 50 + Math.sin(angle) * 44;
          return (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full shadow-[0_0_10px_hsl(var(--primary))]"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: "translate(-50%, -50%)",
                background: effectType === 'neon' ? "hsl(280 100% 60%)" : effectType === 'lightning' ? "hsl(50 100% 60%)" : "hsl(var(--primary))",
                opacity: 0.9,
                animation: "pulse 2s ease-in-out infinite",
                animationDelay: `${i * 0.2}s`,
              }}
            />
          );
        })}
      </div>
    );
  }

  // Default: full-screen particle overlay with varied effects
  const getEffectStyles = () => {
    switch (effectType) {
      case 'hearts':
        return { size: '24px', animation: 'float 5s ease-in-out infinite' };
      case 'stars':
        return { size: '20px', animation: 'float 6s ease-in-out infinite, spin 8s linear infinite' };
      case 'lightning':
        return { size: '28px', animation: 'flash 1s ease-in-out infinite' };
      case 'bubbles':
        return { size: '18px', animation: 'float 7s ease-in-out infinite' };
      case 'confetti':
        return { size: '16px', animation: 'fall 4s linear infinite' };
      case 'snowflakes':
        return { size: '22px', animation: 'fall 8s linear infinite' };
      case 'sparkles':
        return { size: '20px', animation: 'float 4s ease-in-out infinite, twinkle 2s ease-in-out infinite' };
      case 'neon':
        return { size: '26px', animation: 'float 5s ease-in-out infinite, neon-pulse 2s ease-in-out infinite' };
      default:
        return { size: '24px', animation: 'float 4s ease-in-out infinite' };
    }
  };

  const effectStyles = getEffectStyles();
  
  return (
    <div className="fixed inset-0 z-40 pointer-events-none overflow-hidden">
      {[...Array(30)].map((_, idx) => (
        <div
          key={idx}
          className="absolute text-primary/80"
          style={{
            left: `${Math.random() * 100}%`,
            bottom: "-20px",
            fontSize: effectStyles.size,
            animation: effectStyles.animation,
            animationDelay: `${Math.random() * 3}s`,
            filter: effectType === 'neon' ? "drop-shadow(0 0 15px hsl(280 100% 60%))" : "drop-shadow(0 0 10px hsl(var(--primary)))",
          }}
        >
          {icon}
        </div>
      ))}
    </div>
  );
};

export default ProfileEffect;
