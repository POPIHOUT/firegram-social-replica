import React from "react";

interface ProfileEffectProps {
  effectType: string;
  icon: string;
}

// ProfileEffect renders particle animation overlays based on effectType
const ProfileEffect = ({ effectType, icon }: ProfileEffectProps) => {
  // Full-screen particle overlay with varied effects
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
