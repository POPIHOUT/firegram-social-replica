import { useEffect, useState } from "react";

interface ProfileEffectProps {
  effectType: string;
  icon: string;
}

const ProfileEffect = ({ effectType, icon }: ProfileEffectProps) => {
  const [particles, setParticles] = useState<Array<{ id: number; left: number; delay: number; duration: number }>>([]);

  useEffect(() => {
    // Generate 20 particles with random positions and timings
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 3 + Math.random() * 2,
    }));
    setParticles(newParticles);
  }, [effectType]);

  const getParticleStyles = (type: string) => {
    switch (type) {
      case 'snow':
        return 'text-white text-3xl drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]';
      case 'hearts':
        return 'text-pink-500 text-2xl drop-shadow-[0_0_12px_rgba(236,72,153,0.8)]';
      case 'stars':
        return 'text-yellow-300 text-2xl drop-shadow-[0_0_15px_rgba(253,224,71,1)]';
      case 'bubbles':
        return 'text-blue-400 text-3xl drop-shadow-[0_0_10px_rgba(96,165,250,0.6)]';
      case 'leaves':
        return 'text-orange-500 text-2xl drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]';
      case 'confetti':
        return 'text-primary text-2xl drop-shadow-[0_0_10px_rgba(255,100,100,0.8)]';
      case 'lightning':
        return 'text-yellow-300 text-4xl drop-shadow-[0_0_20px_rgba(253,224,71,1)]';
      case 'sakura':
        return 'text-pink-300 text-2xl drop-shadow-[0_0_12px_rgba(249,168,212,0.8)]';
      case 'money':
        return 'text-green-400 text-2xl drop-shadow-[0_0_12px_rgba(74,222,128,0.8)]';
      case 'emojis':
        return 'text-3xl drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]';
      default:
        return 'text-primary text-2xl drop-shadow-[0_0_10px_rgba(255,100,100,0.6)]';
    }
  };

  const getAnimationClass = (type: string) => {
    // Most effects fall down with gentle sway
    if (['snow', 'leaves', 'sakura'].includes(type)) {
      return 'animate-[float_4s_ease-in-out_infinite]';
    }
    // Money falls straight down
    if (type === 'money') {
      return 'animate-[float_3s_linear_infinite]';
    }
    // Confetti falls with spin
    if (type === 'confetti') {
      return 'animate-[float_3s_ease-in-out_infinite] animate-[spin_2s_linear_infinite]';
    }
    // Hearts and bubbles float up gently
    if (['hearts', 'bubbles'].includes(type)) {
      return 'animate-[float_5s_ease-in-out_infinite_reverse]';
    }
    // Stars twinkle and pulse
    if (type === 'stars') {
      return 'animate-[pulse_2s_ease-in-out_infinite]';
    }
    // Lightning flashes
    if (type === 'lightning') {
      return 'animate-[pulse_0.5s_ease-in-out_infinite]';
    }
    // Emojis spin and bounce
    if (type === 'emojis') {
      return 'animate-[spin_4s_linear_infinite] animate-[bounce_2s_ease-in-out_infinite]';
    }
    return 'animate-float';
  };

  return (
    <div className="fixed inset-0 z-40 pointer-events-none overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className={`absolute transition-all ${getParticleStyles(effectType)} ${getAnimationClass(effectType)}`}
          style={{
            left: `${particle.left}%`,
            bottom: '-20px',
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
            opacity: 0.8 + Math.random() * 0.2,
            transform: effectType === 'confetti' ? `rotate(${Math.random() * 360}deg)` : undefined,
          }}
        >
          {icon}
        </div>
      ))}
    </div>
  );
};

export default ProfileEffect;