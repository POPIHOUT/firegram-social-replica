import { useEffect, useState } from "react";

interface ProfileEffectProps {
  effectType: string;
  icon: string;
}

interface Particle {
  id: number;
  left: number;
  top: number;
  visible: boolean;
  delay: number;
}

const ProfileEffect = ({ effectType, icon }: ProfileEffectProps) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    // Initial spawn of particles
    const initialParticles = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      visible: false,
      delay: Math.random() * 2,
    }));
    setParticles(initialParticles);

    // Strike interval - particles appear, strike, and disappear
    const strikeInterval = setInterval(() => {
      setParticles(prev => prev.map(p => ({
        ...p,
        left: Math.random() * 100,
        top: Math.random() * 100,
        visible: true,
      })));

      // Hide after strike duration
      setTimeout(() => {
        setParticles(prev => prev.map(p => ({
          ...p,
          visible: false,
        })));
      }, getStrikeDuration(effectType));
    }, getStrikeInterval(effectType));

    return () => clearInterval(strikeInterval);
  }, [effectType]);

  const getStrikeInterval = (type: string) => {
    switch (type) {
      case 'lightning': return 800; // Fast strikes
      case 'stars': return 1500; // Medium twinkle
      case 'hearts': return 2000; // Slow pulses
      case 'bubbles': return 2500;
      case 'confetti': return 1000;
      case 'emojis': return 1200;
      default: return 1500;
    }
  };

  const getStrikeDuration = (type: string) => {
    switch (type) {
      case 'lightning': return 300; // Quick flash
      case 'stars': return 800;
      case 'hearts': return 1000;
      case 'bubbles': return 1200;
      case 'confetti': return 600;
      case 'emojis': return 700;
      default: return 800;
    }
  };

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
    switch (type) {
      case 'lightning':
        return 'animate-[flash_0.3s_ease-in-out]';
      case 'stars':
        return 'animate-[twinkle_0.8s_ease-in-out]';
      case 'hearts':
        return 'animate-[pulse_1s_ease-in-out]';
      case 'bubbles':
        return 'animate-[bubble_1.2s_ease-in-out]';
      case 'confetti':
        return 'animate-[pop_0.6s_ease-out]';
      case 'emojis':
        return 'animate-[bounce_0.7s_ease-in-out]';
      default:
        return 'animate-[fade-in_0.5s_ease-in-out]';
    }
  };

  return (
    <div className="fixed inset-0 z-40 pointer-events-none overflow-hidden">
      {particles.map((particle) => {
        const randomRotation = Math.random() * 360;
        const randomScale = 0.7 + Math.random() * 0.6;
        
        return (
          <div
            key={particle.id}
            className={`absolute transition-all duration-300 ${getParticleStyles(effectType)} ${getAnimationClass(effectType)}`}
            style={{
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              opacity: particle.visible ? (0.8 + Math.random() * 0.2) : 0,
              transform: effectType === 'confetti' 
                ? `rotate(${randomRotation}deg) scale(${particle.visible ? randomScale : 0})`
                : `scale(${particle.visible ? randomScale : 0})`,
              filter: ['stars', 'lightning'].includes(effectType) 
                ? `brightness(${particle.visible ? 1.5 + Math.random() * 0.5 : 0})`
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