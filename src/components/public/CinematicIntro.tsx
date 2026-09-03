import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { ChevronDown, Sparkles } from 'lucide-react';

export const CinematicIntro: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Smooth spring physics for cinematic realism
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 70,
    damping: 24,
    restDelta: 0.001,
  });

  // 1. Stage camera zoom & depth
  const stageScale = useTransform(smoothProgress, [0, 0.45, 0.85, 1], [1, 1.05, 1.12, 1.15]);
  const stageY = useTransform(smoothProgress, [0, 0.5, 1], ['0%', '-2%', '-4%']);

  // 2. Darkness overlay (starts nearly black, lifts as lights focus)
  const darknessOpacity = useTransform(smoothProgress, [0, 0.15, 0.45, 0.85], [0.94, 0.82, 0.35, 0.15]);

  // 3. Volumetric Theatrical Left Spotlight
  const leftSpotlightRotate = useTransform(smoothProgress, [0, 0.12, 0.45], [-32, -24, -6]);
  const leftSpotlightOpacity = useTransform(smoothProgress, [0, 0.1, 0.3, 0.85], [0.25, 0.65, 0.95, 0.85]);
  const leftSpotlightScale = useTransform(smoothProgress, [0, 0.4], [0.9, 1.15]);

  // 4. Volumetric Theatrical Right Spotlight
  const rightSpotlightRotate = useTransform(smoothProgress, [0, 0.12, 0.45], [32, 24, 6]);
  const rightSpotlightOpacity = useTransform(smoothProgress, [0, 0.1, 0.3, 0.85], [0.25, 0.65, 0.95, 0.85]);
  const rightSpotlightScale = useTransform(smoothProgress, [0, 0.4], [0.9, 1.15]);

  // 5. Converged light pool on stage floor
  const centerPoolOpacity = useTransform(smoothProgress, [0.15, 0.4, 0.75], [0, 0.8, 1]);
  const centerPoolScale = useTransform(smoothProgress, [0.15, 0.45], [0.5, 1.15]);

  // 6. Stardust sparkle texture emergence
  const stardustOpacity = useTransform(smoothProgress, [0.2, 0.45, 0.8], [0, 0.45, 0.25]);

  // 7. Cherry blossom petals floating across stage
  const blossomOpacity = useTransform(smoothProgress, [0.25, 0.45, 0.85], [0, 0.9, 0.4]);
  const blossomY = useTransform(smoothProgress, [0.25, 0.85], ['-20px', '100px']);

  // 8. Moon reveal behind the stage
  const moonOpacity = useTransform(smoothProgress, [0.35, 0.55], [0, 1]);
  const moonScale = useTransform(smoothProgress, [0.35, 0.6, 0.85], [0.75, 1, 1.06]);
  const moonGlow = useTransform(
    smoothProgress,
    [0.4, 0.6, 0.8],
    [
      '0 0 25px rgba(224, 102, 255, 0.3)',
      '0 0 60px rgba(245, 158, 11, 0.5)',
      '0 0 90px rgba(212, 175, 55, 0.8)',
    ]
  );

  // 9. Eclipse Sequence: dark celestial shadow disc crosses the glowing crescent
  const eclipseShadowX = useTransform(smoothProgress, [0.52, 0.68, 0.78], ['-115%', '-25%', '0%']);
  const eclipseCoronaOpacity = useTransform(smoothProgress, [0.62, 0.72, 0.82], [0, 0.85, 1]);

  // 10. Memoria'26 Title reveal in exact layers (Section 14)
  const title1Opacity = useTransform(smoothProgress, [0.68, 0.75, 0.88], [0, 1, 1]);
  const title1Y = useTransform(smoothProgress, [0.68, 0.75], [15, 0]);

  const title2Opacity = useTransform(smoothProgress, [0.74, 0.80, 0.88], [0, 1, 1]);
  const title2Y = useTransform(smoothProgress, [0.74, 0.80], [15, 0]);

  const wordmarkOpacity = useTransform(smoothProgress, [0.78, 0.86], [0, 1]);
  const wordmarkScale = useTransform(smoothProgress, [0.78, 0.86], [0.92, 1]);
  const wordmarkFilter = useTransform(smoothProgress, [0.78, 0.86], ['blur(8px)', 'blur(0px)']);
  const wordmarkY = useTransform(smoothProgress, [0.78, 0.86], [25, 0]);

  // 11. Hero Date, Venue & CTA
  const heroInfoOpacity = useTransform(smoothProgress, [0.85, 0.94], [0, 1]);
  const heroInfoY = useTransform(smoothProgress, [0.85, 0.94], [20, 0]);

  // 12. Initial Scroll Prompt (Fades out when scrolling begins)
  const promptOpacity = useTransform(smoothProgress, [0, 0.08], [1, 0]);
  const promptY = useTransform(smoothProgress, [0, 0.08], [0, 20]);

  const scrollToTicketSection = () => {
    const el = document.getElementById('ticket-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToAbout = () => {
    const el = document.getElementById('about');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    // Reduced height from 320vh to 230vh to eliminate dead scroll space
    <div ref={containerRef} className="relative h-[230vh] w-full bg-[#0D0518]">
      {/* Sticky Fullscreen Theatrical Stage Canvas */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center select-none">
        {/* Layer 1: Stage Background Scene (from screen.png) */}
        <motion.div
          style={{ scale: stageScale, y: stageY }}
          className="absolute inset-0 w-full h-full will-change-transform"
        >
          <img
            src="/assets/hero-stage-scene.jpg"
            alt="Theatrical Concert Stage"
            className="w-full h-full object-cover object-center"
          />
        </motion.div>

        {/* Layer 2: Darkness & Mystery Overlay */}
        <motion.div
          style={{ opacity: darknessOpacity }}
          className="absolute inset-0 bg-[#0D0518] pointer-events-none transition-opacity duration-300"
        />

        {/* Layer 3: Stardust particle texture (from screen1.png) */}
        <motion.div
          style={{ opacity: stardustOpacity }}
          className="absolute inset-0 pointer-events-none mix-blend-screen z-10"
        >
          <img
            src="/assets/star-sparkle-texture.png"
            alt="Stardust Atmosphere"
            className="w-full h-full object-cover opacity-60"
          />
        </motion.div>

        {/* Layer 4: Moon and Eclipse Layer behind stage center */}
        <div className="absolute top-[16%] sm:top-[18%] flex items-center justify-center pointer-events-none z-10">
          <motion.div
            style={{
              opacity: moonOpacity,
              scale: moonScale,
              boxShadow: moonGlow,
            }}
            className="relative w-48 h-48 sm:w-64 sm:h-64 rounded-full overflow-hidden flex items-center justify-center will-change-transform"
          >
            {/* Luminous Crescent Moon (from screen7.png) */}
            <img
              src="/assets/moon-crescent.png"
              alt="Cosmic Crescent Moon"
              className="w-full h-full object-contain filter drop-shadow-[0_0_20px_rgba(245,158,11,0.8)]"
            />

            {/* Eclipse Shadow Disc crossing over the moon */}
            <motion.div
              style={{ x: eclipseShadowX }}
              className="absolute inset-0 w-full h-full rounded-full bg-[#0D0518]/95 shadow-[inset_0_0_25px_#000]"
            />

            {/* Glowing Golden & Magenta Corona Rim during Totality */}
            <motion.div
              style={{ opacity: eclipseCoronaOpacity }}
              className="absolute inset-[-4px] rounded-full border-2 border-[#D4AF37] shadow-[0_0_35px_#E066FF,0_0_70px_#D4AF37] pointer-events-none"
            />
          </motion.div>
        </div>

        {/* Layer 5: Volumetric Theatrical Left Spotlight (from screen3.png) */}
        <motion.div
          style={{
            rotate: leftSpotlightRotate,
            opacity: leftSpotlightOpacity,
            scale: leftSpotlightScale,
            transformOrigin: 'top left',
          }}
          className="absolute -top-12 -left-10 w-[75vw] sm:w-[50vw] h-[140vh] pointer-events-none z-20 mix-blend-screen will-change-transform"
        >
          <img
            src="/assets/spotlight-beam.png"
            alt="Left Spotlight Beam"
            className="w-full h-full object-fill opacity-95 filter drop-shadow-[0_0_40px_rgba(224,102,255,0.7)]"
          />
        </motion.div>

        {/* Layer 6: Volumetric Theatrical Right Spotlight (from screen3.png) */}
        <motion.div
          style={{
            rotate: rightSpotlightRotate,
            opacity: rightSpotlightOpacity,
            scale: rightSpotlightScale,
            transformOrigin: 'top right',
          }}
          className="absolute -top-12 -right-10 w-[75vw] sm:w-[50vw] h-[140vh] pointer-events-none z-20 mix-blend-screen will-change-transform"
        >
          <img
            src="/assets/spotlight-beam.png"
            alt="Right Spotlight Beam"
            className="w-full h-full object-fill opacity-95 -scale-x-100 filter drop-shadow-[0_0_40px_rgba(212,175,55,0.7)]"
          />
        </motion.div>

        {/* Layer 7: Center Stage Converged Pool of Light */}
        <motion.div
          style={{
            opacity: centerPoolOpacity,
            scale: centerPoolScale,
          }}
          className="absolute bottom-[8%] w-[80vw] max-w-3xl h-[180px] rounded-[50%] bg-gradient-radial from-[#E066FF]/40 via-[#D4AF37]/25 to-transparent blur-2xl pointer-events-none z-20"
        />

        {/* Layer 8: Cherry Blossom Petals drifting across illuminated zone */}
        <motion.div
          style={{ opacity: blossomOpacity, y: blossomY }}
          className="absolute inset-0 pointer-events-none z-25 overflow-hidden"
        >
          {Array.from({ length: 16 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-4 bg-[#FF8FC7]/80 rounded-[60%_40%_60%_40%] shadow-[0_0_12px_#FFB3D9] animate-pulse"
              style={{
                top: `${18 + (i * 5) % 65}%`,
                left: `${20 + (i * 9) % 60}%`,
                transform: `rotate(${i * 32}deg)`,
              }}
            />
          ))}
        </motion.div>

        {/* Layer 9: Atmospheric Stage Vignette & Floor Rim */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D0518] via-transparent to-[#0D0518]/75 pointer-events-none z-25" />

        {/* Layer 10: Theatrical Event Title & Reveal Content */}
        <div className="relative z-30 flex flex-col items-center justify-center text-center px-4 max-w-5xl">
          {/* Subtitles: "THE ECLIPSE" + "OF MEMORIES" */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-4 mb-2">
            <motion.span
              style={{ opacity: title1Opacity, y: title1Y }}
              className="font-heading font-extrabold text-xs sm:text-sm md:text-base tracking-[0.35em] text-[#F0E6FA]/90 uppercase"
            >
              The Eclipse
            </motion.span>
            <motion.span
              style={{ opacity: title2Opacity, y: title2Y }}
              className="font-heading font-extrabold text-xs sm:text-sm md:text-base tracking-[0.35em] text-[#D4AF37] uppercase drop-shadow-[0_0_12px_rgba(212,175,55,0.8)]"
            >
              Of Memories
            </motion.span>
          </div>

          {/* Core Wordmark: "Memoria'26" in Great Vibes */}
          <motion.h1
            style={{
              opacity: wordmarkOpacity,
              scale: wordmarkScale,
              filter: wordmarkFilter,
              y: wordmarkY,
            }}
            className="font-wordmark text-6xl sm:text-8xl md:text-9xl lg:text-[10.5rem] font-normal leading-none text-transparent bg-clip-text bg-gradient-to-r from-[#FFF5F8] via-[#FF8FC7] to-[#D4AF37] drop-shadow-[0_0_35px_rgba(224,102,255,0.75)] py-2 select-none"
          >
            Memoria&apos;26
          </motion.h1>

          {/* Phase 8: Hero Meta Info & CTA */}
          <motion.div
            style={{ opacity: heroInfoOpacity, y: heroInfoY }}
            className="flex flex-col items-center mt-4 sm:mt-6 space-y-4 sm:space-y-6"
          >
            <p className="text-xs sm:text-sm md:text-base text-[#F0E6FA]/80 tracking-[0.2em] uppercase font-medium max-w-xl">
              Saturday, November 14, 2026 &bull; Nelum Pokuna Theatre, Colombo
            </p>

            <p className="text-sm sm:text-base text-[#FFB3D9] italic font-light tracking-wide max-w-lg">
              &ldquo;Where echoes of the past meet the light of tonight.&rdquo;
            </p>

            {/* CTAs (Scrolls smoothly to in-page section, not separate page) */}
            <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
              <button
                onClick={scrollToTicketSection}
                className="group relative px-8 py-3.5 rounded-full font-heading text-xs sm:text-sm tracking-[0.2em] font-bold uppercase text-[#0D0518] bg-gradient-to-r from-[#D4AF37] via-[#FFB3D9] to-[#D4AF37] shadow-[0_0_25px_rgba(212,175,55,0.6)] hover:shadow-[0_0_40px_rgba(224,102,255,0.9)] transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#0D0518]" />
                  Get Your Ticket — Rs. 1000
                </span>
              </button>

              <button
                onClick={scrollToAbout}
                className="px-6 py-3 rounded-full font-heading text-xs sm:text-sm tracking-[0.2em] font-semibold uppercase text-[#F0E6FA] border border-[#D4AF37]/40 hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all duration-300 hover:scale-105 cursor-pointer"
              >
                Explore Experience
              </button>
            </div>
          </motion.div>
        </div>

        {/* Initial Scroll Prompt (Fades out when user starts scrolling) */}
        <motion.div
          style={{ opacity: promptOpacity, y: promptY }}
          className="absolute bottom-10 z-40 flex flex-col items-center pointer-events-none"
        >
          <span className="font-heading text-[10px] sm:text-xs tracking-[0.35em] text-[#D4AF37] uppercase mb-2 animate-pulse">
            Scroll To Enter The Stage
          </span>
          <div className="w-8 h-12 rounded-full border border-[#D4AF37]/50 flex items-start justify-center p-1.5 shadow-[0_0_15px_rgba(212,175,55,0.3)]">
            <motion.div
              animate={{ y: [0, 16, 0] }}
              transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
              className="w-1.5 h-2.5 bg-[#D4AF37] rounded-full shadow-[0_0_8px_#D4AF37]"
            />
          </div>
          <ChevronDown className="w-4 h-4 text-[#D4AF37] mt-1 animate-bounce" />
        </motion.div>
      </div>
    </div>
  );
};
