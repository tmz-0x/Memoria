import React, { useEffect, useRef } from 'react';

interface DustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseVy: number;
  size: number;
  color: string;
  alpha: number;
  baseAlpha: number;
  alphaSpeed: number;
  seed: number;
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
    if (prefersReducedMotion) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const isTouch = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768;
    // Fix Pass 3: 40-60 particles on desktop, 20-35 on mobile
    const particleCount = isTouch ? 26 : 52;

    const mouse = {
      x: -2000,
      y: -2000,
      targetX: -2000,
      targetY: -2000,
      radius: 190, // Fix 3: Influence radius ~120-220px
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
      mouse.targetX = -2000;
      mouse.targetY = -2000;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    // Initialize fine atmospheric dust particles (Fix Pass 3: Rule 5 - Tiny illuminated dust)
    const particles: DustParticle[] = [];
    const colors = ['#D4AF37', '#FF8FC7', '#E066FF', '#F0E6FA'];

    for (let i = 0; i < particleCount; i++) {
      const baseAlpha = Math.random() * 0.45 + 0.2;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() * 0.35 + 0.2),
        baseVy: Math.random() * 0.35 + 0.2,
        size: Math.random() * 1.6 + 1.0, // Very fine dust motes: 1.0px to 2.6px
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: baseAlpha,
        baseAlpha,
        alphaSpeed: (Math.random() * 0.008 + 0.003) * (Math.random() > 0.5 ? 1 : -1),
        seed: Math.random() * 100,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Smooth mouse spring/lerp
      if (!isTouch) {
        mouse.x += (mouse.targetX - mouse.x) * 0.06;
        mouse.y += (mouse.targetY - mouse.y) * 0.06;
      }

      // If particles are temporarily disabled during initial intro, skip drawing
      const isFieldActive = enabledRef.current;

      if (isFieldActive) {
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];

          // 1. Natural twinkle / opacity fluctuation
          p.alpha += p.alphaSpeed;
          if (p.alpha > p.baseAlpha + 0.25 || p.alpha < 0.12) {
            p.alphaSpeed = -p.alphaSpeed;
          }

          // 2. Base natural atmospheric drift (Section 19: natural drift + subtle mouse attraction)
          p.y += p.vy;
          p.x += Math.sin((p.y + p.seed) * 0.015) * 0.35 + p.vx;

          // 3. Fix Pass 3: Rule 5 - Soft gathering toward mouse pointer with inertia
          if (!isTouch && mouse.x > 0) {
            const dx = mouse.x - p.x;
            const dy = mouse.y - p.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < mouse.radius && distance > 2) {
              // Gentle attraction force: particles slowly gather, forming a soft cluster
              const normalizedDist = distance / mouse.radius;
              const attractionForce = (1 - normalizedDist) * 0.45;

              p.vx += (dx / distance) * attractionForce * 0.4;
              p.vy += (dy / distance) * attractionForce * 0.4;
            }
          }

          // 4. Inertial damping: cluster slowly disperses/settles when mouse moves away
          p.vx *= 0.94;
          p.vy = p.vy * 0.94 + p.baseVy * 0.06;

          // 5. Seamless boundary wrapping
          if (p.y > height + 15) {
            p.y = -15;
            p.x = Math.random() * width;
          }
          if (p.x < -15) p.x = width + 15;
          if (p.x > width + 15) p.x = -15;

          // 6. Render as fine illuminated dust with soft celestial glow
          ctx.save();
          ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 4;

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
