import React, { useMemo } from 'react';

interface Particle {
  id: number;
  x: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
  type: 'sparkle' | 'dot' | 'petal';
}

export const ParticleField: React.FC = () => {
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100, // percentage 0-100vw
      size: Math.random() * 4 + 2, // 2px to 6px
      duration: Math.random() * 6 + 7, // 7s to 13s
      delay: Math.random() * 8, // 0s to 8s
      drift: (Math.random() - 0.5) * 40, // -20px to +20px
      type: i % 5 === 0 ? 'petal' : i % 3 === 0 ? 'sparkle' : 'dot',
    }));
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-10 overflow-hidden"
      style={{ perspective: '1000px' }}
    >
      {particles.map((p) => (
        <span
          key={p.id}
          className={`absolute rounded-full will-change-transform ${
            p.type === 'petal'
              ? 'bg-[#FF8FC7]/70 shadow-[0_0_8px_#FF8FC7]'
              : p.type === 'sparkle'
              ? 'bg-[#D4AF37]/90 shadow-[0_0_10px_#D4AF37]'
              : 'bg-[#F0E6FA]/60 shadow-[0_0_6px_#E066FF]'
          }`}
          style={{
            left: `${p.x}%`,
            top: '-20px',
            width: `${p.size}px`,
            height: p.type === 'petal' ? `${p.size * 1.5}px` : `${p.size}px`,
            borderRadius: p.type === 'petal' ? '60% 40% 60% 40%' : '50%',
            animation: `floatDown ${p.duration}s infinite linear`,
            animationDelay: `${p.delay}s`,
            transform: `translateX(${p.drift}px)`,
          }}
        />
      ))}

      <style>{`
        @keyframes floatDown {
          0% {
            transform: translateY(-20px) translateX(0px) rotate(0deg);
            opacity: 0;
          }
          15% {
            opacity: 0.85;
          }
          85% {
            opacity: 0.85;
          }
          100% {
            transform: translateY(105vh) translateX(25px) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};
