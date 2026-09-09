import React, { useEffect, useRef } from 'react';

interface BlossomPetal {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseVy: number;
  swaySpeed: number;
  swayAmp: number;
  swayPhase: number;
  tumbleSpeed: number;
  tumblePhase: number;
  rotation: number;
  rotSpeed: number;
  size: number;
  aspectRatio: number;
  alpha: number;
  baseAlpha: number;
  layer: 'bg' | 'mid' | 'fg';
  colorStart: string;
  colorEnd: string;
  decayY: number;
}

interface FallingBlossomsProps {
  stageAwakened?: boolean;
  leftBeamAngleDeg?: number;
  rightBeamAngleDeg?: number;
}

export const FallingBlossoms: React.FC<FallingBlossomsProps> = ({
  stageAwakened = true,
  leftBeamAngleDeg,
  rightBeamAngleDeg,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const leftAngleRef = useRef<number | undefined>(leftBeamAngleDeg);
  const rightAngleRef = useRef<number | undefined>(rightBeamAngleDeg);
  const stageAwakenedRef = useRef(stageAwakened);

  useEffect(() => {
    leftAngleRef.current = leftBeamAngleDeg;
    rightAngleRef.current = rightBeamAngleDeg;
  }, [leftBeamAngleDeg, rightBeamAngleDeg]);

  useEffect(() => {
    stageAwakenedRef.current = stageAwakened;
  }, [stageAwakened]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const isMobile = width < 768;
    const isTablet = width >= 768 && width < 1024;
    // Fix 8, Section 3 & 4: Delicate petal count (Desktop: 88, Tablet: 60, Mobile: 36)
    const petalCount = prefersReducedMotion ? (isMobile ? 18 : 28) : isMobile ? 36 : isTablet ? 60 : 88;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Fix 8, Section 4 & 5: Stronger emission at Left & Right tree canopies, significantly reduced in the center
    const getSpawnPoint = (): { x: number; y: number; driftBias: number } => {
      const zoneChoice = Math.random();
      let x = 0;
      let y = 0;
      let driftBias = 0;

      if (zoneChoice < 0.48) {
        // Left Tree Canopy (48% of petals): x in [1% - 26%], y in [1% - 38%]
        x = width * (0.01 + Math.random() * 0.25);
        y = height * (0.01 + Math.random() * 0.37);
        // Slight drift keeping center clear
        driftBias = Math.random() * 0.30 - 0.20;
      } else if (zoneChoice < 0.96) {
        // Right Tree Canopy (48% of petals): x in [68% - 99%], y in [1% - 42%]
        x = width * (0.68 + Math.random() * 0.31);
        y = height * (0.01 + Math.random() * 0.41);
        // Slight drift keeping center clear
        driftBias = Math.random() * 0.30 - 0.10;
      } else {
        // Center Overhead Branch Tips (Only 4% of petals - Section 4 & 5): x in [38% - 62%], y in [1% - 12%]
        x = width * (0.38 + Math.random() * 0.24);
        y = height * (0.01 + Math.random() * 0.11);
        driftBias = (Math.random() - 0.5) * 0.25;
      }

      return { x, y, driftBias };
    };

    // Color palettes for luminous cherry blossom petals (Fix 7 & 8)
    const petalPalettes = [
      { start: '#FFF5F8', end: '#FFB3D9' }, // Moonlit white-pink
      { start: '#FFE4EF', end: '#FF8FC7' }, // Classic cherry blossom rose
      { start: '#FFC0E4', end: '#F472B6' }, // Vibrant sakura pink
      { start: '#FCE7F3', end: '#E066FF' }, // Celestial blossom magenta
      { start: '#FFF0F5', end: '#FF9EAA' }, // Soft warm blossom
    ];

    const createPetal = (prewarm = false): BlossomPetal => {
      const pt = getSpawnPoint();
      const initialY = prewarm ? Math.random() * height : pt.y;

      const layerTier = Math.random();
      let layer: 'bg' | 'mid' | 'fg' = 'mid';
      let size = 8;
      let baseAlpha = 0.65;
      let baseVy = 0.65;

      // Fix 8, Section 3 & 7: Slightly smaller, delicate, elegant petals matching tree scale
      if (layerTier < 0.35) {
        // Background: smaller, dimmer, slower (Section 7)
        layer = 'bg';
        size = Math.random() * 2.2 + 4.2; // 4.2px - 6.4px (delicate background blossom)
        baseAlpha = Math.random() * 0.18 + 0.32; // 0.32 - 0.50
        baseVy = Math.random() * 0.20 + 0.35; // 0.35 - 0.55 px/frame (gracefully slow)
      } else if (layerTier < 0.82) {
        // Midground: standard delicate blossom (Section 7)
        layer = 'mid';
        size = Math.random() * 2.8 + 6.8; // 6.8px - 9.6px (natural blossom scale)
        baseAlpha = Math.random() * 0.18 + 0.55; // 0.55 - 0.73
        baseVy = Math.random() * 0.30 + 0.50; // 0.50 - 0.80 px/frame
      } else {
        // Foreground: slightly larger, luminous highlight (Section 7)
        layer = 'fg';
        size = Math.random() * 3.2 + 10.0; // 10.0px - 13.2px (delicate foreground petal)
        baseAlpha = Math.random() * 0.16 + 0.72; // 0.72 - 0.88
        baseVy = Math.random() * 0.35 + 0.70; // 0.70 - 1.05 px/frame
      }

      const palette = petalPalettes[Math.floor(Math.random() * petalPalettes.length)];

      return {
        x: pt.x,
        y: initialY,
        vx: pt.driftBias,
        vy: baseVy,
        baseVy,
        swaySpeed: Math.random() * 0.022 + 0.012,
        swayAmp: Math.random() * 0.7 + 0.4,
        swayPhase: Math.random() * Math.PI * 2,
        tumbleSpeed: Math.random() * 0.030 + 0.012,
        tumblePhase: Math.random() * Math.PI * 2,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() * 0.018 + 0.005) * (Math.random() > 0.5 ? 1 : -1),
        size,
        aspectRatio: Math.random() * 0.35 + 1.25, // 1.25 to 1.6
        alpha: baseAlpha,
        baseAlpha,
        layer,
        colorStart: palette.start,
        colorEnd: palette.end,
        decayY: height * (0.88 + Math.random() * 0.11), // Stage floor level
      };
    };

    // Pre-warm initial petals so the scene opens with petals already gracefully mid-air (Section 21)
    const petals: BlossomPetal[] = [];
    for (let i = 0; i < petalCount; i++) {
      petals.push(createPetal(true));
    }

    let time = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      time += 0.016;

      const isAwakened = stageAwakenedRef.current;
      const leftAngleRad = typeof leftAngleRef.current === 'number' ? (leftAngleRef.current * Math.PI) / 180 : null;
      const rightAngleRad = typeof rightAngleRef.current === 'number' ? (rightAngleRef.current * Math.PI) / 180 : null;

      // Spotlight origins for calculating beam illumination on passing petals (Section 23)
      const leftLightOrigin = { x: width * 0.03, y: height * 0.02 };
      const rightLightOrigin = { x: width * 0.97, y: height * 0.02 };

      for (let i = 0; i < petals.length; i++) {
        const p = petals[i];

        if (!prefersReducedMotion) {
          // 1. Slow, natural downward drift with gentle sway (Section 13, 16, 17)
          p.swayPhase += p.swaySpeed;
          p.tumblePhase += p.tumbleSpeed;
          p.rotation += p.rotSpeed;

          // Subtle horizontal breeze drift + sway
          const swayOffset = Math.sin(p.swayPhase) * p.swayAmp;
          p.x += p.vx + swayOffset;

          // Decelerate as it nears stage floor (Section 22)
          if (p.y > p.decayY - 50) {
            p.y += p.vy * 0.65;
            p.alpha -= 0.012; // Gentle fade on stage floor
          } else {
            p.y += p.vy;
          }

          // 2. Respawn seamlessly from tree canopies when reaching stage floor or leaving viewport
          if (p.y >= p.decayY || p.alpha <= 0.05 || p.x < -30 || p.x > width + 30) {
            const fresh = createPetal(false);
            Object.assign(p, fresh);
          }
        }

        // 3. Spotlight beam illumination interaction (if spotlight beams are active)
        let beamBoost = 0;
        if (isAwakened) {
          // Check Left Beam cone proximity
          if (leftAngleRad !== null) {
            const ldx = p.x - leftLightOrigin.x;
            const ldy = p.y - leftLightOrigin.y;
            const lDist = Math.hypot(ldx, ldy);
            if (lDist > 20) {
              const lAngle = Math.atan2(ldx, ldy); // angle from vertical
              const lAngleDiff = Math.abs(lAngle - leftAngleRad);
              if (lAngleDiff < 0.28) {
                // Within ~16 deg of left cone
                beamBoost = Math.max(beamBoost, (1 - lAngleDiff / 0.28) * 0.45);
              }
            }
          }

          // Check Right Beam cone proximity
          if (rightAngleRad !== null) {
            const rdx = p.x - rightLightOrigin.x;
            const rdy = p.y - rightLightOrigin.y;
            const rDist = Math.hypot(rdx, rdy);
            if (rDist > 20) {
              const rAngle = Math.atan2(rdx, rdy);
              const rAngleDiff = Math.abs(rAngle - rightAngleRad);
              if (rAngleDiff < 0.28) {
                beamBoost = Math.max(beamBoost, (1 - rAngleDiff / 0.28) * 0.45);
              }
            }
          }
        }

        // 4. Render Petal with organic curved shape & 3D tumble (Section 14, 18, 19, 20)
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        // 3D Tumbling simulation: scaleX oscillates to simulate flipping in the breeze
        const tumbleScale = prefersReducedMotion ? 1 : Math.cos(p.tumblePhase);
        ctx.scale(Math.abs(tumbleScale) * 0.85 + 0.15, 1);

        // Fix 8, Section 8: Prioritize center stage readability
        const isNearCenter = p.x > width * 0.36 && p.x < width * 0.64;
        const centerClarityFactor = isNearCenter ? 0.65 : 1.0;
        const currentAlpha = Math.min(1, (p.alpha + beamBoost) * centerClarityFactor);
        ctx.globalAlpha = Math.max(0, currentAlpha);

        // Luminous blossom gradient from tip to base
        const grad = ctx.createLinearGradient(0, -p.size, 0, p.size);
        grad.addColorStop(0, p.colorStart);
        grad.addColorStop(0.65, p.colorEnd);
        grad.addColorStop(1, '#D4528C');

        ctx.fillStyle = grad;

        // Foreground soft bloom & beam illumination glow
        if (p.layer === 'fg' || beamBoost > 0.2) {
          ctx.shadowColor = '#FF8FC7';
          ctx.shadowBlur = p.layer === 'fg' ? 6 : 10;
        }

        // Organic cherry blossom petal path with curved edges & slight tip indentation
        const w = (p.size * 0.75) / p.aspectRatio;
        const h = p.size;

        ctx.beginPath();
        ctx.moveTo(0, -h);
        // Right petal curve
        ctx.bezierCurveTo(w * 1.35, -h * 0.55, w * 1.2, h * 0.55, 0, h);
        // Left petal curve
        ctx.bezierCurveTo(-w * 1.2, h * 0.55, -w * 1.35, -h * 0.55, 0, -h);
        ctx.closePath();
        ctx.fill();

        // Subtle petal vein highlight down center
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.7);
        ctx.lineTo(0, h * 0.5);
        ctx.stroke();

        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none z-22 w-full h-full"
    />
  );
};
