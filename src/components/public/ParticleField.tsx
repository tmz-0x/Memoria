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
  isTwinkler: boolean;
  twinklePhase: number;
  twinkleSpeed: number;
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

    // Mobile Performance Optimization: 38 delicate dust particles on mobile to maintain rock-solid 60-120fps
    const particleCount = isTouch ? 38 : isTablet ? 95 : 220;

    const mouse = {
      x: -3000,
      y: -3000,
      targetX: -3000,
      targetY: -3000,
      radius: 240, // Influence radius 180-250px
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      if (isTouch) return;
      // Section 18: Mouse particle attraction occurs outside the cinematic intro
      const isOverIntro = window.scrollY < window.innerHeight * 0.75 && (window.location.pathname === '/' || window.location.pathname === '');
      if (isOverIntro) {
        mouse.targetX = -3000;
        mouse.targetY = -3000;
        return;
      }
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
      // Clearly visible continuous drift speeds (0.25 to 0.75 px/frame)
      const speed = Math.random() * 0.50 + 0.25;
      const baseVx = Math.cos(angle) * speed * 0.85;
      // Ambient slow vertical drift (varied upward and downward)
      const baseVy = Math.sin(angle) * speed * 0.75 - (Math.random() > 0.3 ? 0.18 : -0.10);

      // Varied dust sizes: mostly fine dust (0.9px - 2.0px) with occasional brighter motes (2.4px - 3.2px)
      const sizeTier = Math.random();
      const size = sizeTier > 0.88 ? Math.random() * 1.0 + 2.2 : sizeTier > 0.55 ? Math.random() * 0.8 + 1.4 : Math.random() * 0.6 + 0.9;

      // Opacity range: 0.30 to 0.80
      const baseAlpha = Math.random() * 0.40 + 0.32;

      // ~25% of particles are twinkling star-like motes with randomized cycle timing
      const isTwinkler = Math.random() < 0.28;
      const twinkleSpeed = (Math.random() * 0.02 + 0.008) * (Math.random() > 0.5 ? 1 : -1);

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
        isTwinkler,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed,
        seed: Math.random() * 300,
        speedMultiplier: Math.random() * 0.6 + 0.75,
        hasGlow: size > 2.0 || isTwinkler,
      });
    }

    let time = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      time += 0.016;

      // Smooth mouse spring interpolation
      if (!isTouch) {
        mouse.x += (mouse.targetX - mouse.x) * 0.08;
        mouse.y += (mouse.targetY - mouse.y) * 0.08;
      }

      const isFieldActive = enabledRef.current;

      if (isFieldActive) {
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];

          if (!prefersReducedMotion) {
            // 1. Visible organic drift movement across varied directions
            p.x += p.vx + Math.sin(time + p.seed) * 0.40 * p.speedMultiplier;
            p.y += p.vy + Math.cos(time * 0.80 + p.seed) * 0.30 * p.speedMultiplier;

            // 2. Twinkle & Blinking behavior (randomized star-like behavior on subset)
            if (p.isTwinkler) {
              p.twinklePhase += p.twinkleSpeed;
              if (p.twinklePhase > Math.PI * 2) p.twinklePhase -= Math.PI * 2;
              if (p.twinklePhase < 0) p.twinklePhase += Math.PI * 2;

              // Exponential twinkle spike: dim most of the time, occasionally brightens to a soft star twinkle
              const flare = Math.pow(Math.max(0, Math.sin(p.twinklePhase)), 6);
              p.alpha = p.baseAlpha + flare * (0.95 - p.baseAlpha);
              p.hasGlow = flare > 0.45;
            } else {
              // Subtle organic breathing for atmospheric dust motes
              p.alpha = p.baseAlpha + Math.sin(time * 0.75 + p.seed) * 0.14;
            }

            // 3. Gentle mouse gathering attraction outside cinematic intro (Section 18)
            if (!isTouch && mouse.x > -1000) {
              const dx = mouse.x - p.x;
              const dy = mouse.y - p.y;
              const distance = Math.hypot(dx, dy);

              if (distance < mouse.radius && distance > 4) {
                const normalizedDist = distance / mouse.radius;
                const gatherStrength = (1 - normalizedDist) * 0.65;

                // Gentle drift toward cursor
                p.vx += (dx / distance) * gatherStrength * 0.45;
                p.vy += (dy / distance) * gatherStrength * 0.45;

                // Subtly brighten near cursor
                p.alpha = Math.min(1, p.alpha + (1 - normalizedDist) * 0.35);
              }
            }

            // 4. Inertial return: slowly returns to natural drift when mouse moves away
            p.vx = p.vx * 0.96 + p.baseVx * 0.04;
            p.vy = p.vy * 0.96 + p.baseVy * 0.04;

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
          }

          // 6. Draw illuminated theatrical dust mote with soft luminous halo
          ctx.save();
          const drawAlpha = Math.max(0.08, Math.min(1, p.alpha));
          ctx.globalAlpha = drawAlpha;
          ctx.fillStyle = p.color;

          if (p.hasGlow && !isTouch) {
            ctx.shadowColor = p.color;
            ctx.shadowBlur = p.size * (p.isTwinkler ? 4.8 : 3.2);
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
