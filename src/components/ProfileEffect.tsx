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
        return 'text-white text-2xl';
      case 'hearts':
        return 'text-pink-500 text-xl';
      case 'stars':
        return 'text-yellow-300 text-xl';
      case 'bubbles':
        return 'text-blue-300 text-2xl';
      case 'leaves':
        return 'text-orange-600 text-xl';
      case 'confetti':
        return 'text-primary text-lg';
      case 'lightning':
        return 'text-yellow-400 text-3xl';
      case 'sakura':
        return 'text-pink-300 text-xl';
      case 'money':
        return 'text-green-500 text-xl';
      case 'emojis':
        return 'text-2xl';
      default:
        return 'text-primary text-xl';
    }
  };

  const getAnimationClass = (type: string) => {
    // Most effects fall down
    if (['snow', 'leaves', 'sakura', 'money', 'confetti'].includes(type)) {
      return 'animate-float';
    }
    // Hearts and bubbles float up
    if (['hearts', 'bubbles'].includes(type)) {
      return 'animate-[float_3s_ease-in-out_infinite_reverse]';
    }
    // Stars and lightning sparkle
    if (['stars', 'lightning'].includes(type)) {
      return 'animate-pulse';
    }
    // Emojis spin
    if (type === 'emojis') {
      return 'animate-spin';
    }
    return 'animate-float';
  };

  return (
    <div className="fixed inset-0 z-40 pointer-events-none overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className={`absolute ${getParticleStyles(effectType)} ${getAnimationClass(effectType)}`}
          style={{
            left: `${particle.left}%`,
            bottom: '-20px',
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
            opacity: 0.7,
          }}
        >
          {icon}
        </div>
      ))}
    </div>
  );
};

export default ProfileEffect;