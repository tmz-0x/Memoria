import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Ticket } from 'lucide-react';

interface CinematicIntroProps {
  onIntroComplete?: () => void;
}

export const CinematicIntro: React.FC<CinematicIntroProps> = ({ onIntroComplete }) => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const [stageAwakened, setStageAwakened] = useState(false);
  const [moonAppeared, setMoonAppeared] = useState(false);
  const [titleRevealed, setTitleRevealed] = useState(false);
  const [heroSettled, setHeroSettled] = useState(false);

  // Fix Pass 6: Mouse-Controlled Spotlight Rotation from Permanent Fixed Positions
  const mouseAimX = useMotionValue(0.5);
  const smoothAimX = useSpring(mouseAimX, { stiffness: 55, damping: 22 });

  // Left beam angle: -14deg (aimed left) to -34deg (aimed right) around center -24deg (±10deg controlled theatrical range)
  const leftBeamAngle = useTransform(smoothAimX, [0, 1], [-14, -34]);
  const leftTransform = useTransform(leftBeamAngle, (ang) => `rotate(${ang}deg)`);

  // Right beam angle: +34deg (aimed left) to +14deg (aimed right) around center +24deg (±10deg controlled theatrical range)
  const rightBeamAngle = useTransform(smoothAimX, [0, 1], [34, 14]);
  const rightTransform = useTransform(rightBeamAngle, (ang) => `rotate(${ang}deg) scaleX(-1)`);

  // Converged stage floor pool tracks subtly with the beam intersection
  const stagePoolX = useTransform(smoothAimX, [0, 1], ['-12%', '12%']);

  // Powerful Mouse Intensity Interaction for Two Side Spotlights
  const leftIntensityWeight = useMotionValue(0.5);
  const smoothLeftWeight = useSpring(leftIntensityWeight, { stiffness: 60, damping: 22 });

  const rightIntensityWeight = useMotionValue(0.5);
  const smoothRightWeight = useSpring(rightIntensityWeight, { stiffness: 60, damping: 22 });

  const centerIntensityWeight = useMotionValue(0.5);
  const smoothCenterWeight = useSpring(centerIntensityWeight, { stiffness: 60, damping: 22 });

  // High-visibility beam ranges with strong cinematic glow and volumetric bloom
  const leftBeamOpacity = useTransform(smoothLeftWeight, [0, 1], [0.82, 1.0]);
  const leftBeamGlow = useTransform(
    smoothLeftWeight,
    [0, 1],
    [
      'drop-shadow(0 0 50px rgba(224,102,255,0.75)) drop-shadow(0 0 90px rgba(212,175,55,0.65))',
      'drop-shadow(0 0 95px rgba(224,102,255,1.0)) drop-shadow(0 0 150px rgba(212,175,55,0.95))',
    ]
  );

  const rightBeamOpacity = useTransform(smoothRightWeight, [0, 1], [0.82, 1.0]);
  const rightBeamGlow = useTransform(
    smoothRightWeight,
    [0, 1],
    [
      'drop-shadow(0 0 50px rgba(212,175,55,0.75)) drop-shadow(0 0 90px rgba(224,102,255,0.65))',
      'drop-shadow(0 0 95px rgba(212,175,55,1.0)) drop-shadow(0 0 150px rgba(224,102,255,0.95))',
    ]
  );

  // Secondary center stage pool
  const centerPoolOpacity = useTransform(smoothCenterWeight, [0, 1], [0.60, 1.0]);
  const centerPoolScale = useTransform(smoothCenterWeight, [0, 1], [0.95, 1.25]);
  const supportingLightOpacity = useTransform(smoothCenterWeight, [0, 1], [0.45, 0.85]);

  useEffect(() => {
    // Respect reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setStageAwakened(true);
      setMoonAppeared(true);
      setTitleRevealed(true);
      setHeroSettled(true);
      if (onIntroComplete) onIntroComplete();
      return;
    }

    // Exactly 2-second theatrical anticipation
    const t1 = setTimeout(() => {
      setStageAwakened(true);
      if (onIntroComplete) onIntroComplete();
    }, 2000);
    const t2 = setTimeout(() => setMoonAppeared(true), 2800);
    const t3 = setTimeout(() => setTitleRevealed(true), 3800);
    const t4 = setTimeout(() => {
      setHeroSettled(true);
    }, 5000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onIntroComplete]);

  // Fix 6: Strongly noticeable mouse-controlled beam rotation and light-energy reaction across the two side spotlights
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width; // 0 (left) to 1 (right)
    const ny = (e.clientY - rect.top) / rect.height; // 0 (top) to 1 (bottom)

    // Update aim direction for smooth beam rotation
    mouseAimX.set(Math.max(0, Math.min(1, nx)));

    // Left spotlight target is left side / stage-left (nx ~ 0.25, ny ~ 0.6)
    const distLeft = Math.hypot(nx - 0.25, ny - 0.6);
    const leftVal = Math.max(0, Math.min(1, 1 - distLeft / 0.72));
    leftIntensityWeight.set(leftVal);

    // Right spotlight target is right side / stage-right (nx ~ 0.75, ny ~ 0.6)
    const distRight = Math.hypot(nx - 0.75, ny - 0.6);
    const rightVal = Math.max(0, Math.min(1, 1 - distRight / 0.72));
    rightIntensityWeight.set(rightVal);

    // Center stage pool (nx ~ 0.5, ny ~ 0.65)
    const distCenter = Math.hypot(nx - 0.5, ny - 0.65);
    const centerVal = Math.max(0, Math.min(1, 1 - distCenter / 0.65));
    centerIntensityWeight.set(centerVal);
  };

  const handleMouseLeave = () => {
    mouseAimX.set(0.5);
    leftIntensityWeight.set(0.5);
    rightIntensityWeight.set(0.5);
    centerIntensityWeight.set(0.5);
  };

  const scrollToAbout = () => {
    const el = document.getElementById('about');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full h-screen min-h-[640px] max-h-[1100px] overflow-hidden flex items-center justify-center select-none bg-[#0D0518]"
    >
      {/* Layer 1: Theatrical Stage Backdrop (screen.png) */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        <img
          src="/assets/hero-stage-scene.jpg"
          alt="Theatrical Concert Stage"
          className="w-full h-full object-cover object-center scale-105"
        />
      </div>

      {/* Layer 2: Darkness & Anticipation Overlay (Lifts smoothly after 2 seconds) */}
      <motion.div
        initial={{ opacity: 0.95 }}
        animate={{ opacity: stageAwakened ? 0.16 : 0.95 }}
        transition={{ duration: 1.8, ease: 'easeInOut' }}
        className="absolute inset-0 bg-[#0D0518] pointer-events-none"
      />

      {/* Layer 3: Moon & Eclipse Layer behind stage center */}
      <div className="absolute top-[13%] sm:top-[15%] flex items-center justify-center pointer-events-none z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: moonAppeared ? 1 : 0,
            scale: moonAppeared ? 1 : 0.8,
            boxShadow: moonAppeared
              ? '0 0 90px rgba(212, 175, 55, 0.85)'
              : '0 0 0px transparent',
          }}
          transition={{ duration: 1.6, ease: 'easeOut' }}
          className="relative w-44 h-44 sm:w-60 sm:h-60 rounded-full overflow-hidden flex items-center justify-center"
        >
          {/* Luminous Crescent Moon (screen7.png) */}
          <img
            src="/assets/moon-crescent.png"
            alt="Cosmic Crescent Moon"
            className="w-full h-full object-contain filter drop-shadow-[0_0_25px_rgba(245,158,11,0.85)]"
          />

          {/* Eclipse Shadow Disc */}
          <motion.div
            initial={{ x: '-115%' }}
            animate={{ x: moonAppeared ? '0%' : '-115%' }}
            transition={{ duration: 2.4, delay: 0.3, ease: 'easeInOut' }}
            className="absolute inset-0 w-full h-full rounded-full bg-[#0D0518]/95 shadow-[inset_0_0_25px_#000]"
          />

          {/* Glowing Golden & Magenta Corona Rim */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: moonAppeared ? 1 : 0 }}
            transition={{ duration: 1.2, delay: 1.2 }}
            className="absolute inset-[-4px] rounded-full border-2 border-[#D4AF37] shadow-[0_0_40px_#E066FF,0_0_80px_#D4AF37] pointer-events-none"
          />
        </motion.div>
      </div>

      {/* Layer 4: FIX PASS 6 — TWO LARGE MAIN THEATRICAL SPOTLIGHTS ON OPPOSITE SIDES FRAMING THE STAGE */}
      {/* 4a. LEFT MAIN SPOTLIGHT: Permanently anchored on the LEFT side, rotation/aiming responds to mouse (FIXED POSITION) */}
      <motion.div
        style={{
          opacity: leftBeamOpacity,
          filter: leftBeamGlow,
          transform: leftTransform,
          transformOrigin: 'top left',
        }}
        className="absolute -top-10 -left-6 w-[85vw] sm:w-[58vw] h-[145vh] pointer-events-none z-20 mix-blend-screen will-change-transform"
      >
        <div className="relative w-full h-full">
          <img
            src="/assets/spotlight-beam.png"
            alt="Left Main Theatrical Spotlight"
            className="w-full h-full object-fill opacity-100 filter brightness-110"
          />
          {/* Volumetric haze cone layer */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-[#E066FF]/20 to-transparent pointer-events-none blur-sm" />
        </div>
      </motion.div>

      {/* 4b. RIGHT MAIN SPOTLIGHT: Permanently anchored on the RIGHT side, rotation/aiming responds to mouse (FIXED POSITION) */}
      <motion.div
        style={{
          opacity: rightBeamOpacity,
          filter: rightBeamGlow,
          transform: rightTransform,
          transformOrigin: 'top right',
        }}
        className="absolute -top-10 -right-6 w-[85vw] sm:w-[58vw] h-[145vh] pointer-events-none z-20 mix-blend-screen will-change-transform"
      >
        <div className="relative w-full h-full">
          <img
            src="/assets/spotlight-beam.png"
            alt="Right Main Theatrical Spotlight"
            className="w-full h-full object-fill opacity-100 filter brightness-110"
          />
          {/* Volumetric haze cone layer */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-[#D4AF37]/20 to-transparent pointer-events-none blur-sm" />
        </div>
      </motion.div>

      {/* 4c. Supporting Fixed Overhead Downlight (Subordinate Secondary Light) */}
      <motion.div
        style={{
          opacity: supportingLightOpacity,
          transform: 'translateX(-50%)',
        }}
        className="absolute -top-12 left-1/2 w-[52vw] sm:w-[35vw] h-[120vh] pointer-events-none z-15 mix-blend-screen"
      >
        <img
          src="/assets/spotlight-beam.png"
          alt="Overhead Center Downlight"
          className="w-full h-full object-fill opacity-65 filter drop-shadow-[0_0_50px_rgba(255,143,199,0.5)]"
        />
      </motion.div>

      {/* Layer 5: Center Stage Converged Pool of Light */}
      <motion.div
        style={{
          opacity: centerPoolOpacity,
          scale: centerPoolScale,
          x: stagePoolX,
        }}
        className="absolute bottom-[5%] w-[85vw] max-w-3xl h-[190px] rounded-[50%] bg-gradient-radial from-[#E066FF]/65 via-[#D4AF37]/45 to-transparent blur-2xl pointer-events-none z-20"
      />

      {/* Layer 6: Atmospheric Stage Vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0D0518] via-transparent to-[#0D0518]/60 pointer-events-none z-25" />

      {/* Layer 7: Theatrical Event Title & Hero Content (Reveals after 2s) */}
      <div className="relative z-30 flex flex-col items-center justify-center text-center px-4 max-w-5xl">
        {/* Subtitles: "THE ECLIPSE" + "OF MEMORIES" */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{
            opacity: titleRevealed ? 1 : 0,
            y: titleRevealed ? 0 : 15,
          }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-4 mb-2"
        >
          <span className="font-heading font-extrabold text-xs sm:text-sm md:text-base tracking-[0.35em] text-[#F0E6FA]/90 uppercase">
            The Eclipse
          </span>
          <span className="font-heading font-extrabold text-xs sm:text-sm md:text-base tracking-[0.35em] text-[#D4AF37] uppercase drop-shadow-[0_0_12px_rgba(212,175,55,0.8)]">
            Of Memories
          </span>
        </motion.div>

        {/* Core Wordmark: "Memoria'26" in Great Vibes */}
        <motion.h1
          initial={{ opacity: 0, scale: 0.92, filter: 'blur(10px)', y: 20 }}
          animate={{
            opacity: titleRevealed ? 1 : 0,
            scale: titleRevealed ? 1 : 0.92,
            filter: titleRevealed ? 'blur(0px)' : 'blur(10px)',
            y: titleRevealed ? 0 : 20,
          }}
          transition={{ duration: 1, delay: 0.15, ease: 'easeOut' }}
          className="font-wordmark text-6xl sm:text-8xl md:text-9xl lg:text-[10.5rem] font-normal leading-none text-transparent bg-clip-text bg-gradient-to-r from-[#FFF5F8] via-[#FF8FC7] to-[#D4AF37] drop-shadow-[0_0_35px_rgba(224,102,255,0.75)] py-2 select-none"
        >
          Memoria&apos;26
        </motion.h1>

        {/* Hero Meta Info & Action CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: heroSettled ? 1 : 0,
            y: heroSettled ? 0 : 20,
          }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="flex flex-col items-center mt-4 sm:mt-6 space-y-4 sm:space-y-6"
        >
          <p className="text-xs sm:text-sm md:text-base text-[#F0E6FA]/85 tracking-[0.2em] uppercase font-medium max-w-xl">
            Saturday, November 14, 2026 &bull; Nelum Pokuna Theatre, Colombo
          </p>

          <p className="text-sm sm:text-base text-[#FFB3D9] italic font-light tracking-wide max-w-lg">
            &ldquo;Where echoes of the past meet the light of tonight.&rdquo;
          </p>

          {/* Primary Action Buttons: Navigates to /tickets */}
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
            <button
              type="button"
              onClick={() => navigate('/tickets')}
              className="group relative px-8 py-3.5 rounded-full font-heading text-xs sm:text-sm tracking-[0.2em] font-bold uppercase text-[#0D0518] bg-gradient-to-r from-[#D4AF37] via-[#FFB3D9] to-[#D4AF37] shadow-[0_0_25px_rgba(212,175,55,0.6)] hover:shadow-[0_0_40px_rgba(224,102,255,0.9)] transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <Ticket className="w-4 h-4 text-[#0D0518]" />
              <span>Book Your Ticket &bull; From Rs. 200</span>
            </button>

            <button
              type="button"
              onClick={scrollToAbout}
              className="px-6 py-3 rounded-full font-heading text-xs sm:text-sm tracking-[0.2em] font-semibold uppercase text-[#F0E6FA] border border-[#D4AF37]/40 hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all duration-300 hover:scale-105 cursor-pointer"
            >
              Explore Experience
            </button>
          </div>
        </motion.div>
      </div>

      {/* Downward Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: heroSettled ? 1 : 0 }}
        transition={{ duration: 0.8 }}
        onClick={scrollToAbout}
        className="absolute bottom-6 z-30 flex flex-col items-center cursor-pointer hover:opacity-100 transition-opacity"
      >
        <span className="font-heading text-[10px] tracking-[0.3em] text-[#D4AF37] uppercase mb-1">
          Explore Event
        </span>
        <ChevronDown className="w-4 h-4 text-[#D4AF37] animate-bounce" />
      </motion.div>
    </div>
  );
};
