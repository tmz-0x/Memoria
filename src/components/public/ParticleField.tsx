import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  maxAlpha: number;
  alphaSpeed: number;
  type: 'dot' | 'sparkle' | 'petal';
  angle: number;
  rotationSpeed: number;
}

export const ParticleField: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    const particleCount = isTouch ? 28 : 55;

    const mouse = {
      x: -1000,
      y: -1000,
      targetX: -1000,
      targetY: -1000,
      radius: 180,
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
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Initialize particles
    const particles: Particle[] = [];
    const colors = ['#D4AF37', '#FF8FC7', '#E066FF', '#F0E6FA'];

    for (let i = 0; i < particleCount; i++) {
      const type = i % 7 === 0 ? 'petal' : i % 3 === 0 ? 'sparkle' : 'dot';
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        baseX: Math.random() * width,
        baseY: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: Math.random() * 0.5 + 0.3,
        size: type === 'petal' ? Math.random() * 3.5 + 3 : Math.random() * 2 + 1.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.5 + 0.2,
        maxAlpha: Math.random() * 0.4 + 0.4,
        alphaSpeed: (Math.random() * 0.01 + 0.005) * (Math.random() > 0.5 ? 1 : -1),
        type,
        angle: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
      });
    }

    const drawSparkle = (cx: number, cy: number, size: number, color: string, alpha: number) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;

      ctx.beginPath();
      ctx.moveTo(cx, cy - size * 2);
      ctx.quadraticCurveTo(cx, cy, cx + size * 2, cy);
      ctx.quadraticCurveTo(cx, cy, cx, cy + size * 2);
      ctx.quadraticCurveTo(cx, cy, cx - size * 2, cy);
      ctx.quadraticCurveTo(cx, cy, cx, cy - size * 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const drawPetal = (cx: number, cy: number, size: number, angle: number, alpha: number) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.globalAlpha = alpha * 0.85;
      ctx.fillStyle = '#FF8FC7';
      ctx.shadowColor = '#FFB3D9';
      ctx.shadowBlur = 6;

      ctx.beginPath();
      ctx.ellipse(0, 0, size * 1.6, size * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Smooth mouse lerp for soft inertia
      if (!isTouch) {
        mouse.x += (mouse.targetX - mouse.x) * 0.05;
        mouse.y += (mouse.targetY - mouse.y) * 0.05;
      }

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Alpha twinkle
        p.alpha += p.alphaSpeed;
        if (p.alpha > p.maxAlpha || p.alpha < 0.15) {
          p.alphaSpeed = -p.alphaSpeed;
        }

        // Natural vertical drift
        p.y += p.vy;
        p.x += Math.sin(p.y * 0.015) * 0.35 + p.vx;
        p.angle += p.rotationSpeed;

        // Subtle, delayed mouse influence with inertia (desktop only)
        if (!isTouch && mouse.x > 0) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < mouse.radius) {
            // Gentle pull toward mouse (limited to 6-12px max influence)
            const force = (1 - distance / mouse.radius) * 0.5;
            p.x += (dx / distance) * force * 1.5;
            p.y += (dy / distance) * force * 1.5;
          }
        }

        // Wrap edges seamlessly
        if (p.y > height + 20) {
          p.y = -20;
          p.x = Math.random() * width;
        }
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;

        // Render based on particle type
        if (p.type === 'sparkle') {
          drawSparkle(p.x, p.y, p.size, p.color, p.alpha);
        } else if (p.type === 'petal') {
          drawPetal(p.x, p.y, p.size, p.angle, p.alpha);
        } else {
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 5;
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
