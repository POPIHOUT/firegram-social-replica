import React from "react";

interface ProfileEffectProps {
  effectType: string;
  icon: string;
  scope?: "screen" | "avatar";
}

// ProfileEffect can render either full-screen particles (scope="screen")
// or a subtle animated ring around an avatar (scope="avatar").
const ProfileEffect = ({ effectType, icon, scope = "screen" }: ProfileEffectProps) => {
  if (scope === "avatar") {
    // Edge-only ring around the avatar
    return (
      <div className="absolute inset-0 z-30 pointer-events-none">
        {/* Animated gradient ring clipped to edges only */}
        <div
          className="absolute inset-0 rounded-full animate-spin"
          style={{
            background:
              "conic-gradient(from 0deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 25%, hsl(var(--primary)) 50%, hsl(var(--accent)) 75%, hsl(var(--primary)) 100%)",
            WebkitMask:
              "radial-gradient(farthest-side, transparent calc(100% - 6px), black 0)",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 6px), black 0)",
            animationDuration: "6s",
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
                background: "hsl(var(--primary))",
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

  // Default: legacy full-screen particle overlay (kept for compatibility)
  return (
    <div className="fixed inset-0 z-40 pointer-events-none overflow-hidden">
      {[...Array(30)].map((_, idx) => (
        <div
          key={idx}
          className="absolute text-primary/80 animate-[float_4s_ease-in-out_infinite]"
          style={{
            left: `${Math.random() * 100}%`,
            bottom: "-20px",
            animationDelay: `${Math.random() * 3}s`,
            filter: "drop-shadow(0 0 10px hsl(var(--primary)))",
          }}
        >
          {icon}
        </div>
      ))}
    </div>
  );
};

export default ProfileEffect;
