import React, { useEffect, useRef } from 'react';

interface DustMote {
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

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const isTouch = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768;
    // Fix Pass 4: Density 60-90 on desktop, 25-45 on mobile
    const particleCount = isTouch ? 35 : 82;

    const mouse = {
      x: -3000,
      y: -3000,
      targetX: -3000,
      targetY: -3000,
      radius: 220, // Fix 4: Influence radius 150-250px
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

    // Initialize atmospheric dust motes with varied directions (Fix 4: Sections 9, 10, 13)
    const particles: DustMote[] = [];
    const colors = ['#D4AF37', '#FF8FC7', '#E066FF', '#F0E6FA', '#FFF5F8'];

    for (let i = 0; i < particleCount; i++) {
      // Directions varied: some float upward, some downward, some diagonally (Section 13)
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 0.45 + 0.15;
      const baseVx = Math.cos(angle) * speed * 0.7;
      const baseVy = (Math.sin(angle) * 0.35) - 0.25; // Gentle upward/ambient drift
      const baseAlpha = Math.random() * 0.5 + 0.25; // Fix 4: More visible contrast (0.25 to 0.75)

      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: baseVx,
        vy: baseVy,
        baseVx,
        baseVy,
        size: Math.random() * 2.2 + 1.2, // Visible dust sizes: 1.2px to 3.4px
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: baseAlpha,
        baseAlpha,
        alphaSpeed: (Math.random() * 0.009 + 0.003) * (Math.random() > 0.5 ? 1 : -1),
        seed: Math.random() * 200,
        speedMultiplier: Math.random() * 0.6 + 0.7,
      });
    }

    let time = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      time += 0.015;

      // Smooth mouse spring interpolation (no React state updates)
      if (!isTouch) {
        mouse.x += (mouse.targetX - mouse.x) * 0.07;
        mouse.y += (mouse.targetY - mouse.y) * 0.07;
      }

      // Check if dust is active on current public view (Section 7: Separate from initial intro)
      const isFieldActive = enabledRef.current;

      if (isFieldActive && !prefersReducedMotion) {
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];

          // 1. Organic opacity shimmer / breathing
          p.alpha += p.alphaSpeed;
          if (p.alpha > p.baseAlpha + 0.3 || p.alpha < 0.15) {
            p.alphaSpeed = -p.alphaSpeed;
          }

          // 2. Visible continuous slow movement with sine wave turbulence (Section 10)
          p.x += p.vx + Math.sin(time + p.seed) * 0.3 * p.speedMultiplier;
          p.y += p.vy + Math.cos(time * 0.8 + p.seed) * 0.25 * p.speedMultiplier;

          // 3. Fix 4: Enhanced yet soft mouse gathering attraction with inertia
          if (!isTouch && mouse.x > -1000) {
            const dx = mouse.x - p.x;
            const dy = mouse.y - p.y;
            const distance = Math.hypot(dx, dy);

            if (distance < mouse.radius && distance > 4) {
              // Smooth falloff attraction
              const normalizedDist = distance / mouse.radius;
              const gatherStrength = (1 - normalizedDist) * 0.65;

              p.vx += (dx / distance) * gatherStrength * 0.45;
              p.vy += (dy / distance) * gatherStrength * 0.45;
            }
          }

          // 4. Inertial return: slowly settles back into natural drift when cursor departs
          p.vx = p.vx * 0.95 + p.baseVx * 0.05;
          p.vy = p.vy * 0.95 + p.baseVy * 0.05;

          // 5. Wrap screen bounds smoothly
          if (p.y > height + 20) {
            p.y = -20;
            p.x = Math.random() * width;
          } else if (p.y < -20) {
            p.y = height + 20;
            p.x = Math.random() * width;
          }

          if (p.x < -20) {
            p.x = width + 20;
          } else if (p.x > width + 20) {
            p.x = -20;
          }

          // 6. Draw illuminated dust mote with soft luminous halo
          ctx.save();
          ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = p.size > 2.2 ? 8 : 4;

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
