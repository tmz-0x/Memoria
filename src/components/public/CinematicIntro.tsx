import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Ticket } from 'lucide-react';
import { FallingBlossoms } from './FallingBlossoms';

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

  // Fix 7, Part 1: Concert Spotlight Tracking An Artist Across Stage
  // Left and Right spotlights are permanently mounted at the left and right corners.
  // Their beam rotation angles follow the mouse position across the stage smoothly.
  const leftAngleValue = useMotionValue(34);
  const rightAngleValue = useMotionValue(-34);

  const smoothLeftAngle = useSpring(leftAngleValue, { stiffness: 45, damping: 20 });
  const smoothRightAngle = useSpring(rightAngleValue, { stiffness: 45, damping: 20 });

  const leftTransform = useTransform(smoothLeftAngle, (deg) => `rotate(${deg}deg)`);
  const rightTransform = useTransform(smoothRightAngle, (deg) => `rotate(${deg}deg)`);

  // Subscribed state to pass dynamic beam angles to FallingBlossoms for light cone illumination
  const [currentLeftAngle, setCurrentLeftAngle] = useState(34);
  const [currentRightAngle, setCurrentRightAngle] = useState(-34);

  useEffect(() => {
    const unsubLeft = smoothLeftAngle.on('change', (v) => setCurrentLeftAngle(v));
    const unsubRight = smoothRightAngle.on('change', (v) => setCurrentRightAngle(v));
    return () => {
      unsubLeft();
      unsubRight();
    };
  }, [smoothLeftAngle, smoothRightAngle]);

  // Stage floor pool tracks subtly with the beam intersection
  const mouseNormX = useMotionValue(0.5);
  const smoothNormX = useSpring(mouseNormX, { stiffness: 45, damping: 22 });
  const stagePoolX = useTransform(smoothNormX, [0, 1], ['-15%', '15%']);

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

  // Fix 7, Items 4-8: Dynamic beam rotation aiming at the visitor's cursor across stage
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    // Keep target at or below mid-stage so beams aim downward across the performance area
    const mouseY = Math.max(rect.height * 0.35, e.clientY - rect.top);
    const normX = Math.max(0, Math.min(1, mouseX / rect.width));
    mouseNormX.set(normX);

    // Left spotlight anchor is at fixed corner: (rect.width * 0.035, rect.height * 0.02)
    const leftAnchorX = rect.width * 0.035;
    const leftAnchorY = rect.height * 0.02;
    const ldx = mouseX - leftAnchorX;
    const ldy = mouseY - leftAnchorY;
    const lAngleDeg = (Math.atan2(ldx, ldy) * 180) / Math.PI;
    // Controlled theatrical concert range: 12deg (far left) to 58deg (far right)
    const clampedLeft = Math.max(12, Math.min(58, lAngleDeg));
    leftAngleValue.set(clampedLeft);

    // Right spotlight anchor is at fixed corner: (rect.width * 0.965, rect.height * 0.02)
    const rightAnchorX = rect.width * 0.965;
    const rightAnchorY = rect.height * 0.02;
    const rdx = mouseX - rightAnchorX;
    const rdy = mouseY - rightAnchorY;
    const rAngleDeg = (Math.atan2(rdx, rdy) * 180) / Math.PI;
    // Controlled theatrical concert range: -58deg (far left) to -12deg (far right)
    const clampedRight = Math.max(-58, Math.min(-12, rAngleDeg));
    rightAngleValue.set(clampedRight);
  };

  const handleMouseLeave = () => {
    mouseNormX.set(0.5);
    leftAngleValue.set(34);
    rightAngleValue.set(-34);
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
      {/* Layer 1: Theatrical Stage Backdrop (hero-stage-scene.jpg) */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        <img
          src="/assets/hero-stage-scene.jpg"
          alt="Theatrical Concert Stage"
          className="w-full h-full object-cover object-center scale-105"
        />
      </div>

      {/* Layer 2: FIX 7 — ANIMATED FALLING BLOSSOM PETALS FROM FLOWER TREES */}
      <FallingBlossoms
        stageAwakened={stageAwakened}
        leftBeamAngleDeg={currentLeftAngle}
        rightBeamAngleDeg={currentRightAngle}
      />

      {/* Layer 3: Darkness & Anticipation Overlay (Lifts smoothly after 2 seconds) */}
      <motion.div
        initial={{ opacity: 0.95 }}
        animate={{ opacity: stageAwakened ? 0.16 : 0.95 }}
        transition={{ duration: 1.8, ease: 'easeInOut' }}
        className="absolute inset-0 bg-[#0D0518] pointer-events-none"
      />

      {/* Layer 4: Moon & Eclipse Layer behind stage center */}
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

      {/* Layer 5: FIX 7, PART 1 — TWO COMPACT FIXED-CORNER CONCERT SPOTLIGHTS WITH MOUSE TRACKING */}
      {/* 5a. LEFT CORNER SPOTLIGHT: Permanently fixed at top-left corner, beam rotates to track mouse */}
      <div className="absolute top-3 left-4 sm:left-8 z-25 pointer-events-none">
        {/* Compact Theatrical Stage Fixture Housing (Fixed Source - NEVER translates) */}
        <div className="relative -translate-x-1/2 flex flex-col items-center">
          <div className="w-6 h-1 bg-slate-400/80 rounded-full mb-0.5 border border-slate-300/40 shadow-xs" />
          <div className="w-7 h-7 rounded-full bg-gradient-to-b from-slate-700 via-slate-900 to-black border border-[#D4AF37]/80 shadow-[0_0_15px_rgba(212,175,55,0.7)] flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-white shadow-[0_0_10px_#FFF,0_0_18px_#E066FF]" />
          </div>
        </div>

        {/* Rotating Concert Beam: Pivots smoothly from fixed fixture lens */}
        <motion.div
          style={{
            opacity: stageAwakened ? 0.92 : 0,
            transform: leftTransform,
            transformOrigin: 'top center',
          }}
          transition={{ opacity: { duration: 1.2 } }}
          className="absolute top-[14px] -left-[160px] sm:-left-[180px] w-[320px] sm:w-[360px] h-[780px] sm:h-[950px] pointer-events-none z-20 mix-blend-screen will-change-transform"
        >
          <img
            src="/assets/spotlight-beam.png"
            alt="Left Corner Concert Spotlight Beam"
            className="w-full h-full object-fill filter drop-shadow-[0_0_40px_rgba(224,102,255,0.75)] drop-shadow-[0_0_70px_rgba(212,175,55,0.6)]"
          />
        </motion.div>
      </div>

      {/* 5b. RIGHT CORNER SPOTLIGHT: Permanently fixed at top-right corner, beam rotates to track mouse */}
      <div className="absolute top-3 right-4 sm:right-8 z-25 pointer-events-none">
        {/* Compact Theatrical Stage Fixture Housing (Fixed Source - NEVER translates) */}
        <div className="relative translate-x-1/2 flex flex-col items-center">
          <div className="w-6 h-1 bg-slate-400/80 rounded-full mb-0.5 border border-slate-300/40 shadow-xs" />
          <div className="w-7 h-7 rounded-full bg-gradient-to-b from-slate-700 via-slate-900 to-black border border-[#D4AF37]/80 shadow-[0_0_15px_rgba(212,175,55,0.7)] flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-white shadow-[0_0_10px_#FFF,0_0_18px_#D4AF37]" />
          </div>
        </div>

        {/* Rotating Concert Beam: Pivots smoothly from fixed fixture lens */}
        <motion.div
          style={{
            opacity: stageAwakened ? 0.92 : 0,
            transform: rightTransform,
            transformOrigin: 'top center',
          }}
          transition={{ opacity: { duration: 1.2 } }}
          className="absolute top-[14px] -left-[160px] sm:-left-[180px] w-[320px] sm:w-[360px] h-[780px] sm:h-[950px] pointer-events-none z-20 mix-blend-screen will-change-transform"
        >
          <img
            src="/assets/spotlight-beam.png"
            alt="Right Corner Concert Spotlight Beam"
            className="w-full h-full object-fill filter drop-shadow-[0_0_40px_rgba(212,175,55,0.75)] drop-shadow-[0_0_70px_rgba(224,102,255,0.6)]"
          />
        </motion.div>
      </div>

      {/* 5c. Supporting Fixed Overhead Downlight (Subordinate Secondary Light) */}
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
          x: stagePoolX,
        }}
        className="absolute bottom-[5%] w-[85vw] max-w-3xl h-[190px] rounded-[50%] bg-gradient-radial from-[#E066FF]/65 via-[#D4AF37]/45 to-transparent blur-2xl pointer-events-none z-20"
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
