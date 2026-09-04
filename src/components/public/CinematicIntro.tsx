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

  // Mouse brightness reactivity (Fix 3: Rule 1 & Rule 2 - Spotlight is 100% FIXED, only brightness reacts)
  const mouseCloseness = useMotionValue(0);
  const smoothCloseness = useSpring(mouseCloseness, {
    stiffness: 80,
    damping: 24,
  });

  // Baseline opacity 0.65 -> Up to 0.88 when mouse is near the stage area
  const spotlightOpacity = useTransform(smoothCloseness, [0, 1], [0.65, 0.88]);
  const spotlightGlow = useTransform(
    smoothCloseness,
    [0, 1],
    ['drop-shadow(0 0 30px rgba(224,102,255,0.5))', 'drop-shadow(0 0 55px rgba(224,102,255,0.85))']
  );

  useEffect(() => {
    // Check reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setStageAwakened(true);
      setMoonAppeared(true);
      setTitleRevealed(true);
      setHeroSettled(true);
      if (onIntroComplete) onIntroComplete();
      return;
    }

    // Fix Pass 3: Exactly ~2 seconds anticipation (NOT 3 seconds)
    // 0.0 - 2.0s: Dark theatre, fixed spotlight focused on stage
    const t1 = setTimeout(() => setStageAwakened(true), 2000);

    // 2.8s: Moon / crescent appears
    const t2 = setTimeout(() => setMoonAppeared(true), 2800);

    // 3.8s: Great Vibes Memoria'26 identity reveals
    const t3 = setTimeout(() => setTitleRevealed(true), 3800);

    // 5.0s: Hero settles, navigation and CTAs become active
    const t4 = setTimeout(() => {
      setHeroSettled(true);
      if (onIntroComplete) onIntroComplete();
    }, 5000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onIntroComplete]);

  // Subtle mouse brightness calculation (Smooth, no position changes)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height * 0.55;

    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = Math.max(rect.width, rect.height) * 0.55;

    // Normalized closeness: 1 near center stage, 0 far away
    const closeness = Math.max(0, Math.min(1, 1 - dist / maxDist));
    mouseCloseness.set(closeness);
  };

  const handleMouseLeave = () => {
    mouseCloseness.set(0);
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

      {/* Layer 2: Darkness & Anticipation Overlay (Starts dark, lifts after 2 seconds) */}
      <motion.div
        initial={{ opacity: 0.95 }}
        animate={{ opacity: stageAwakened ? 0.2 : 0.95 }}
        transition={{ duration: 1.8, ease: 'easeInOut' }}
        className="absolute inset-0 bg-[#0D0518] pointer-events-none"
      />

      {/* Layer 3: Moon & Eclipse Layer behind stage center (Reveals after 2s anticipation) */}
      <div className="absolute top-[14%] sm:top-[16%] flex items-center justify-center pointer-events-none z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: moonAppeared ? 1 : 0,
            scale: moonAppeared ? 1 : 0.8,
            boxShadow: moonAppeared
              ? '0 0 70px rgba(212, 175, 55, 0.75)'
              : '0 0 0px transparent',
          }}
          transition={{ duration: 1.6, ease: 'easeOut' }}
          className="relative w-44 h-44 sm:w-60 sm:h-60 rounded-full overflow-hidden flex items-center justify-center"
        >
          {/* Luminous Crescent Moon (screen7.png) */}
          <img
            src="/assets/moon-crescent.png"
            alt="Cosmic Crescent Moon"
            className="w-full h-full object-contain filter drop-shadow-[0_0_20px_rgba(245,158,11,0.8)]"
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
            className="absolute inset-[-4px] rounded-full border-2 border-[#D4AF37] shadow-[0_0_35px_#E066FF,0_0_70px_#D4AF37] pointer-events-none"
          />
        </motion.div>
      </div>

      {/* Layer 4: FIX PASS 3 - 100% FIXED SPOTLIGHTS (NO MOVEMENT, NO ROTATION, ONLY BRIGHTNESS REACTS) */}
      {/* Left Spotlight: Position & Rotation are CONSTANT */}
      <motion.div
        style={{
          opacity: spotlightOpacity,
          filter: spotlightGlow,
          transform: 'rotate(-8deg)',
          transformOrigin: 'top left',
        }}
        className="absolute -top-12 -left-8 w-[70vw] sm:w-[48vw] h-[135vh] pointer-events-none z-20 mix-blend-screen"
      >
        <img
          src="/assets/spotlight-beam.png"
          alt="Theatrical Spotlight Beam"
          className="w-full h-full object-fill opacity-90"
        />
      </motion.div>

      {/* Right Spotlight: Position & Rotation are CONSTANT */}
      <motion.div
        style={{
          opacity: spotlightOpacity,
          filter: spotlightGlow,
          transform: 'rotate(8deg) scaleX(-1)',
          transformOrigin: 'top right',
        }}
        className="absolute -top-12 -right-8 w-[70vw] sm:w-[48vw] h-[135vh] pointer-events-none z-20 mix-blend-screen"
      >
        <img
          src="/assets/spotlight-beam.png"
          alt="Theatrical Spotlight Beam"
          className="w-full h-full object-fill opacity-90"
        />
      </motion.div>

      {/* Layer 5: Center Stage Converged Pool of Light */}
      <div className="absolute bottom-[6%] w-[75vw] max-w-3xl h-[170px] rounded-[50%] bg-gradient-radial from-[#E066FF]/40 via-[#D4AF37]/25 to-transparent blur-2xl pointer-events-none z-20" />

      {/* Layer 6: Atmospheric Stage Vignette & Bottom Floor Blend */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0D0518] via-transparent to-[#0D0518]/70 pointer-events-none z-25" />

      {/* Layer 7: Theatrical Event Title & Hero Content (Automatically revealed after 2s) */}
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
              <span>Book Your Ticket &bull; Rs. 1000</span>
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

      {/* Downward Scroll Indicator (Appears when hero settles) */}
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
