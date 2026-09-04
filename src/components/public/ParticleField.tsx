import React, { useEffect, useRef } from 'react';

interface TheatricalDustMote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseVx: number;
  baseVy: number;
  size: number;
  color: string;
  alpha: number;
  baseAlpha: number;
  alphaSpeed: number;
  seed: number;
  speedMultiplier: number;
  hasGlow: boolean;
}

interface ParticleFieldProps {
  enabled?: boolean;
}

export const ParticleField: React.FC<ParticleFieldProps> = ({ enabled = true }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const isTouch = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768;
    const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;

    // Fix Pass 5: Major density increase (Desktop: 100-160, Tablet: 70-110, Mobile: 45-80)
    const particleCount = isTouch ? 58 : isTablet ? 90 : 138;

    const mouse = {
      x: -3000,
      y: -3000,
      targetX: -3000,
      targetY: -3000,
      radius: 230, // Influence radius 150-250px
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      if (isTouch) return;
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.targetX = -3000;
      mouse.targetY = -3000;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    // Theatrical illuminated dust colors (Section 11 & 12)
    const colors = [
      '#D4AF37', // Warm theatrical gold
      '#FDF6D8', // Bright gold stardust
      '#FF8FC7', // Luminous rose blossom
      '#FFB3D9', // Soft blossom halo
      '#F0E6FA', // Moonlit silver
      '#FFFFFF', // Crisp theatrical highlight
      '#E066FF', // Celestial magenta
    ];

    const particles: TheatricalDustMote[] = [];

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 0.55 + 0.2; // Noticeably moving speeds
      const baseVx = Math.cos(angle) * speed * 0.8;
      const baseVy = Math.sin(angle) * speed * 0.6 - 0.2; // Ambient upward-biased drift

      // Varied dust sizes: fine (1.2px) to luminous larger motes (3.8px)
      const sizeTier = Math.random();
      const size = sizeTier > 0.88 ? Math.random() * 1.5 + 2.6 : sizeTier > 0.5 ? Math.random() * 1.0 + 1.8 : Math.random() * 0.8 + 1.2;

      // Higher contrast opacity: 0.35 to 0.90
      const baseAlpha = Math.random() * 0.45 + 0.35;

      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: baseVx,
        vy: baseVy,
        baseVx,
        baseVy,
        size,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: baseAlpha,
        baseAlpha,
        alphaSpeed: (Math.random() * 0.01 + 0.004) * (Math.random() > 0.5 ? 1 : -1),
        seed: Math.random() * 300,
        speedMultiplier: Math.random() * 0.7 + 0.8,
        hasGlow: size > 2.0,
      });
    }

    let time = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      time += 0.018;

      // Smooth mouse spring interpolation
      if (!isTouch) {
        mouse.x += (mouse.targetX - mouse.x) * 0.075;
        mouse.y += (mouse.targetY - mouse.y) * 0.075;
      }

      const isFieldActive = enabledRef.current;

      if (isFieldActive && !prefersReducedMotion) {
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];

          // 1. Visible organic twinkle
          p.alpha += p.alphaSpeed;
          if (p.alpha > p.baseAlpha + 0.28 || p.alpha < 0.20) {
            p.alphaSpeed = -p.alphaSpeed;
          }

          // 2. Clearly noticeable continuous slow movement across different directions
          p.x += p.vx + Math.sin(time + p.seed) * 0.45 * p.speedMultiplier;
          p.y += p.vy + Math.cos(time * 0.85 + p.seed) * 0.35 * p.speedMultiplier;

          // 3. Mouse gathering attraction with soft inertia (Section 15)
          if (!isTouch && mouse.x > -1000) {
            const dx = mouse.x - p.x;
            const dy = mouse.y - p.y;
            const distance = Math.hypot(dx, dy);

            if (distance < mouse.radius && distance > 4) {
              const normalizedDist = distance / mouse.radius;
              const gatherStrength = (1 - normalizedDist) * 0.75;

              p.vx += (dx / distance) * gatherStrength * 0.5;
              p.vy += (dy / distance) * gatherStrength * 0.5;
            }
          }

          // 4. Inertial return: slowly returns to natural drift when mouse departs
          p.vx = p.vx * 0.95 + p.baseVx * 0.05;
          p.vy = p.vy * 0.95 + p.baseVy * 0.05;

          // 5. Wrap bounds seamlessly
          if (p.y > height + 25) {
            p.y = -25;
            p.x = Math.random() * width;
          } else if (p.y < -25) {
            p.y = height + 25;
            p.x = Math.random() * width;
          }

          if (p.x < -25) {
            p.x = width + 25;
          } else if (p.x > width + 25) {
            p.x = -25;
          }

          // 6. Draw illuminated theatrical dust mote with soft luminous halo
          ctx.save();
          ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
          ctx.fillStyle = p.color;

          if (p.hasGlow) {
            ctx.shadowColor = p.color;
            ctx.shadowBlur = p.size * 3.5;
          }

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-15 w-full h-full"
    />
  );
};
