import React, { useState, useEffect } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Ticket } from 'lucide-react';
import { FallingBlossoms } from './FallingBlossoms';

interface CinematicIntroProps {
  onIntroComplete?: () => void;
}

export const CinematicIntro: React.FC<CinematicIntroProps> = ({ onIntroComplete }) => {
  const navigate = useNavigate();

  const [stageAwakened, setStageAwakened] = useState(false);
  const [moonAppeared, setMoonAppeared] = useState(false);
  const [titleRevealed, setTitleRevealed] = useState(false);
  const [heroSettled, setHeroSettled] = useState(false);

  // Secondary center stage pool and overhead wash
  const centerPoolOpacity = useMotionValue(0.75);
  const centerPoolScale = useMotionValue(1.0);
  const supportingLightOpacity = useMotionValue(0.55);

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

    // Exactly 2-second theatrical anticipation followed by sequenced revelations
    const t1 = setTimeout(() => {
      setStageAwakened(true);
    }, 2000);
    const t2 = setTimeout(() => setMoonAppeared(true), 2800);
    const t3 = setTimeout(() => setTitleRevealed(true), 3800);
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

  const handleSkip = () => {
    setStageAwakened(true);
    setMoonAppeared(true);
    setTitleRevealed(true);
    setHeroSettled(true);
    if (onIntroComplete) onIntroComplete();
  };

  const scrollToAbout = () => {
    const el = document.getElementById('about');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      setTimeout(() => {
        const retryEl = document.getElementById('about');
        if (retryEl) retryEl.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  return (
    <div
      className="relative w-full h-[100dvh] min-h-[500px] max-h-[1100px] overflow-hidden flex items-center justify-center select-none bg-[#0D0518]"
    >
      {/* Skip Intro button (only visible while intro animation is in progress - 44px tap target) */}
      {!heroSettled && (
        <button
          type="button"
          onClick={handleSkip}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 z-40 text-[11px] font-heading tracking-[0.2em] uppercase text-[#F0E6FA]/80 hover:text-[#D4AF37] px-4 py-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full border border-white/20 hover:border-[#D4AF37]/50 bg-[#0D0518]/80 backdrop-blur-md transition-all duration-300 cursor-pointer select-none active:scale-95 shadow-lg"
        >
          Skip Intro
        </button>
      )}
      {/* Layer 1: Theatrical Stage Backdrop (hero-stage-scene.jpg) */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        <img
          src="/assets/hero-stage-scene.jpg"
          alt="Theatrical Concert Stage"
          className="w-full h-full object-cover object-center scale-105"
        />
      </div>

      {/* Layer 2: FIX 7 & 8 — ANIMATED FALLING BLOSSOM PETALS FROM FLOWER TREES */}
      <FallingBlossoms stageAwakened={stageAwakened} />

      {/* Layer 3: Darkness & Anticipation Overlay (Lifts smoothly after 2 seconds) */}
      <motion.div
        initial={{ opacity: 0.95 }}
        animate={{ opacity: stageAwakened ? 0.16 : 0.95 }}
        transition={{ duration: 1.8, ease: 'easeInOut' }}
        className="absolute inset-0 bg-[#0D0518] pointer-events-none"
      />

      {/* Layer 4: Moon & Eclipse Layer behind stage center */}
      <div className="absolute top-[8%] sm:top-[12%] md:top-[15%] flex items-center justify-center pointer-events-none z-10">
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
          className="relative w-32 h-32 sm:w-48 sm:h-48 md:w-60 md:h-60 rounded-full overflow-hidden flex items-center justify-center"
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

      {/* Layer 5: Supporting Overhead Stage Downlight & Illumination */}
      <motion.div
        style={{
          opacity: supportingLightOpacity,
          transform: 'translateX(-50%)',
        }}
        className="absolute -top-12 left-1/2 w-[52vw] sm:w-[32vw] h-[110vh] pointer-events-none z-15 mix-blend-screen"
      >
        <img
          src="/assets/spotlight-beam.png"
          alt="Overhead Center Downlight"
          className="w-full h-full object-fill opacity-60 filter drop-shadow-[0_0_50px_rgba(255,143,199,0.4)]"
        />
      </motion.div>

      {/* Layer 6: Center Stage Converged Pool of Light */}
      <motion.div
        style={{
          opacity: centerPoolOpacity,
          scale: centerPoolScale,
        }}
        className="absolute bottom-[5%] left-1/2 -translate-x-1/2 w-[85vw] max-w-3xl h-[190px] rounded-[50%] bg-gradient-radial from-[#E066FF]/65 via-[#D4AF37]/45 to-transparent blur-2xl pointer-events-none z-20"
      />

      {/* Layer 7: Atmospheric Stage Vignette */}
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
          className="font-wordmark text-5xl sm:text-7xl md:text-9xl lg:text-[10.5rem] font-normal leading-none text-transparent bg-clip-text bg-gradient-to-r from-[#FFF5F8] via-[#FF8FC7] to-[#D4AF37] drop-shadow-[0_0_35px_rgba(224,102,255,0.75)] py-1 sm:py-2 select-none"
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
          className="flex flex-col items-center mt-3 sm:mt-6 space-y-3 sm:space-y-6 w-full"
        >
          <p className="text-[11px] sm:text-sm md:text-base text-[#F0E6FA]/85 tracking-[0.2em] uppercase font-medium max-w-xl">
             &bull; Tuesday, OCTOBER 16, 2026 &bull; 
          </p>

          <p className="text-xs sm:text-base text-[#FFB3D9] italic font-light tracking-wide max-w-lg px-2">
            &ldquo;Where echoes of the past meet the light of tonight.&rdquo;
          </p>

          {/* Primary Action Buttons: Stacked on mobile with 44px+ tap target */}
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 pt-1 sm:pt-2 w-full max-w-xs sm:max-w-none">
            <button
              type="button"
              onClick={() => navigate('/tickets')}
              className="group relative w-full sm:w-auto px-7 py-3.5 min-h-[44px] rounded-full font-heading text-xs sm:text-sm tracking-[0.2em] font-bold uppercase text-[#0D0518] bg-gradient-to-r from-[#D4AF37] via-[#FFB3D9] to-[#D4AF37] shadow-[0_0_25px_rgba(212,175,55,0.6)] hover:shadow-[0_0_40px_rgba(224,102,255,0.9)] transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <Ticket className="w-4 h-4 text-[#0D0518]" />
              <span>Book Your Ticket &bull;</span>
            </button>

            <button
              type="button"
              onClick={scrollToAbout}
              className="w-full sm:w-auto px-6 py-3 min-h-[44px] rounded-full font-heading text-xs sm:text-sm tracking-[0.2em] font-semibold uppercase text-[#F0E6FA] border border-[#D4AF37]/40 hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center"
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
        className="absolute bottom-3 sm:bottom-6 z-30 flex flex-col items-center cursor-pointer hover:opacity-100 transition-opacity p-2 min-h-[44px] min-w-[44px]"
      >
        <span className="font-heading text-[9px] sm:text-[10px] tracking-[0.3em] text-[#D4AF37] uppercase mb-1">
          Explore Event
        </span>
        <ChevronDown className="w-4 h-4 text-[#D4AF37] animate-bounce" />
      </motion.div>
    </div>
  );
};
