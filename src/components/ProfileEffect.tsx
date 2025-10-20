import { useEffect, useState } from "react";

interface ProfileEffectProps {
  effectType: string;
  icon: string;
}

const ProfileEffect = ({ effectType, icon }: ProfileEffectProps) => {
  const [particles, setParticles] = useState<Array<{ id: number; left: number; delay: number; duration: number }>>([]);

  useEffect(() => {
    // Generate 40 particles with random positions and timings for more lively effect
    const newParticles = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 2 + Math.random() * 3,
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
    // Snow falls with gentle sway
    if (type === 'snow') {
      return 'animate-[float_3s_ease-in-out_infinite,sway_2s_ease-in-out_infinite]';
    }
    // Leaves fall and rotate
    if (type === 'leaves') {
      return 'animate-[float_3.5s_ease-in-out_infinite,spin_3s_linear_infinite]';
    }
    // Sakura petals float gently
    if (type === 'sakura') {
      return 'animate-[float_4s_ease-in-out_infinite,sway_3s_ease-in-out_infinite]';
    }
    // Money falls straight down fast
    if (type === 'money') {
      return 'animate-[float_2s_linear_infinite]';
    }
    // Confetti falls with spin and wobble
    if (type === 'confetti') {
      return 'animate-[float_2.5s_ease-in-out_infinite,spin_1.5s_linear_infinite]';
    }
    // Hearts float up with gentle sway
    if (type === 'hearts') {
      return 'animate-[float_4s_ease-in-out_infinite_reverse,sway_2.5s_ease-in-out_infinite]';
    }
    // Bubbles float up with wobble
    if (type === 'bubbles') {
      return 'animate-[float_5s_ease-in-out_infinite_reverse,sway_3s_ease-in-out_infinite]';
    }
    // Stars twinkle intensely
    if (type === 'stars') {
      return 'animate-[pulse_1s_ease-in-out_infinite,spin_4s_linear_infinite]';
    }
    // Lightning flashes rapidly
    if (type === 'lightning') {
      return 'animate-[pulse_0.3s_ease-in-out_infinite]';
    }
    // Emojis spin and bounce wildly
    if (type === 'emojis') {
      return 'animate-[spin_2s_linear_infinite,bounce_1s_ease-in-out_infinite]';
    }
    return 'animate-float';
  };

  return (
    <div className="fixed inset-0 z-40 pointer-events-none overflow-hidden">
      {particles.map((particle) => {
        const randomRotation = Math.random() * 360;
        const randomScale = 0.7 + Math.random() * 0.6;
        
        return (
          <div
            key={particle.id}
            className={`absolute transition-all will-change-transform ${getParticleStyles(effectType)} ${getAnimationClass(effectType)}`}
            style={{
              left: `${particle.left}%`,
              ...( ['stars', 'lightning', 'emojis'].includes(effectType)
                ? { top: `${Math.random() * 80 + 5}%` }
                : { bottom: '-20px' }
              ),
              animationDelay: `${particle.delay}s`,
              animationDuration: `${particle.duration}s`,
              opacity: 0.7 + Math.random() * 0.3,
              transform: effectType === 'confetti' 
                ? `rotate(${randomRotation}deg) scale(${randomScale})`
                : `scale(${randomScale})`,
              filter: ['stars', 'lightning'].includes(effectType) 
                ? `brightness(${1 + Math.random() * 0.5})`
                : 'none',
            }}
          >
            {icon}
          </div>
        );
      })}
    </div>
  );
};

export default ProfileEffect;