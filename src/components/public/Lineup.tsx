import React, { useRef, useState } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { SectionDivider } from './SectionDivider';
import { Sparkles, Clock, Star, Music, Award } from 'lucide-react';

export interface ArtistAct {
  id: string;
  name: string;
  genre: string;
  timeSlot: string;
  description: string;
  icon: string;
  image: string;
  isHeadline?: boolean;
  roleBadge: string;
}

// Data-driven Artist Configuration (Section 27: Prepared for real artist uploads)
export const LINEUP_ARTISTS: ArtistAct[] = [
  {
    id: 'act-1',
    name: 'The Acoustic Ensemble',
    genre: 'Chamber Folk & Acoustic Symphony',
    timeSlot: '6:30 PM — 7:15 PM',
    description: 'Delicate acoustic strings, cello harmonies, and ethereal vocals opening the theatre into twilight.',
    icon: '/assets/icon-music.png',
    image: '/assets/hero-stage-scene.jpg',
    roleBadge: 'Opening Act',
  },
  {
    id: 'act-2',
    name: 'Symphony Strings Quartet',
    genre: 'Neo-Classical Cinematic Strings',
    timeSlot: '7:25 PM — 8:10 PM',
    description: 'Dramatic violin crescendos and sweeping quartet textures evoking the onset of the celestial eclipse.',
    icon: '/assets/icon-dance.png',
    image: '/assets/candlelit-venue.jpg',
    roleBadge: 'Chamber Orchestra',
  },
  {
    id: 'act-3',
    name: 'The Eclipse Choir',
    genre: '30-Voice Polyphony & Choral Harmony',
    timeSlot: '8:20 PM — 9:15 PM',
    description: 'A grand collegiate choir filling the Nelum Pokuna auditorium with timeless choral arrangements.',
    icon: '/assets/icon-couple.png',
    image: '/assets/moon-starfield.png',
    roleBadge: 'Choral Showcase',
  },
  {
    id: 'act-4',
    name: 'JPURA Voiceclub Soloists & Symphony Finale',
    genre: 'Grand Theatrical Showcase & Duets',
    timeSlot: '9:25 PM — 10:30 PM',
    description: 'The award-winning premier collegiate vocalists culminating the night in an unforgettable live orchestral spectacle.',
    icon: '/assets/icon-camera.png',
    image: '/assets/hero-stage-scene.jpg',
    isHeadline: true,
    roleBadge: 'Headline Finale',
  },
];

export const Lineup: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [activeHoverId, setActiveHoverId] = useState<string | null>(null);

  // Fix Pass 5: Two Opposing Spotlights responding to scroll direction (Sections 18 & 19)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 75,
    damping: 24,
    restDelta: 0.001,
  });

  // Left Spotlight: Originates from upper-left, strong during start of scroll, sweeps across
  const leftSpotlightOpacity = useTransform(smoothProgress, [0, 0.45, 1], [0.85, 0.65, 0.4]);
  const leftSpotlightRotate = useTransform(smoothProgress, [0, 1], [-22, -10]);
  const leftSpotlightX = useTransform(smoothProgress, [0, 1], ['-15%', '15%']);

  // Right Spotlight: Originates from upper-right, flares brighter as user scrolls deeper
  const rightSpotlightOpacity = useTransform(smoothProgress, [0, 0.55, 1], [0.4, 0.65, 0.85]);
  const rightSpotlightRotate = useTransform(smoothProgress, [0, 1], [10, 22]);
  const rightSpotlightX = useTransform(smoothProgress, [0, 1], ['-15%', '15%']);

  const headlineAct = LINEUP_ARTISTS.find((a) => a.isHeadline);
  const supportingActs = LINEUP_ARTISTS.filter((a) => !a.isHeadline);

  return (
    <section
      ref={sectionRef}
      id="lineup"
      className="relative py-28 px-4 sm:px-6 lg:px-8 bg-transparent overflow-hidden"
    >
      {/* Fix Pass 5: System of TWO OPPOSING THEATRICAL SPOTLIGHTS (Section 18) */}
      {/* Spotlight 1: Originating from the LEFT */}
      <motion.div
        style={{
          opacity: leftSpotlightOpacity,
          rotate: leftSpotlightRotate,
          x: leftSpotlightX,
          transformOrigin: 'top left',
        }}
        className="pointer-events-none absolute -top-24 -left-12 w-[80vw] sm:w-[55vw] h-[130vh] mix-blend-screen z-0 will-change-transform"
      >
        <img
          src="/assets/spotlight-beam.png"
          alt="Lineup Left Spotlight"
          className="w-full h-full object-fill opacity-90 filter drop-shadow-[0_0_60px_#E066FF]"
        />
      </motion.div>

      {/* Spotlight 2: Originating from the RIGHT */}
      <motion.div
        style={{
          opacity: rightSpotlightOpacity,
          rotate: rightSpotlightRotate,
          x: rightSpotlightX,
          transformOrigin: 'top right',
        }}
        className="pointer-events-none absolute -top-24 -right-12 w-[80vw] sm:w-[55vw] h-[130vh] mix-blend-screen z-0 will-change-transform"
      >
        <img
          src="/assets/spotlight-beam.png"
          alt="Lineup Right Spotlight"
          className="w-full h-full object-fill opacity-90 -scale-x-100 filter drop-shadow-[0_0_60px_#D4AF37]"
        />
      </motion.div>

      <div className="relative z-10 max-w-7xl mx-auto">
        <SectionDivider />

        {/* Theatrical Lineup Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.span
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-heading text-xs tracking-[0.35em] text-[#D4AF37] uppercase font-bold inline-flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            ACT II — THE PERFORMANCE
            <Sparkles className="w-3.5 h-3.5" />
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-heading text-3xl sm:text-5xl font-extrabold uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#F0E6FA] via-[#FF8FC7] to-[#D4AF37] mt-3"
          >
            Theatrical Lineup
          </motion.h2>

          <p className="font-body text-base text-[#F0E6FA]/70 mt-4 font-light">
            Framed by opposing theatrical spotlights, each act takes the stage in an unfolding symphony of memory.
          </p>
        </div>

        {/* Fix Pass 5: CREATIVE THEATRICAL ARTIST COMPOSITION (Sections 22 & 23) */}
        {/* Composition: 3 Flanking Acts + Central Grand Finale Headline Act */}
        <div className="space-y-12">
          {/* Top Row: Supporting Acts in Theatrical Frames */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {supportingActs.map((act, index) => {
              const isHovered = activeHoverId === act.id;

              return (
                <motion.div
                  key={act.id}
                  initial={{ opacity: 0, y: 25 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.55, delay: index * 0.12 }}
                  onMouseEnter={() => setActiveHoverId(act.id)}
                  onMouseLeave={() => setActiveHoverId(null)}
                  className="relative group cursor-pointer"
                >
                  <div className="h-full rounded-2xl overflow-hidden bg-[#1A0D2E]/80 border border-[#D4AF37]/40 shadow-xl transition-all duration-300 group-hover:border-[#D4AF37] group-hover:shadow-[0_0_35px_rgba(224,102,255,0.45)] flex flex-col justify-between">
                    {/* Top Subtle Spotlight Flare */}
                    <div
                      className={`absolute -top-10 inset-x-0 h-40 bg-gradient-to-b from-[#E066FF]/30 to-transparent transition-opacity duration-300 pointer-events-none ${
                        isHovered ? 'opacity-90' : 'opacity-20'
                      }`}
                    />

                    {/* Dedicated Artist Image Area (Section 21: Intentional Designed Placeholder) */}
                    <div className="relative h-52 w-full overflow-hidden bg-[#0D0518]">
                      <img
                        src={act.image}
                        alt={act.name}
                        className={`w-full h-full object-cover transition-transform duration-700 ease-out ${
                          isHovered ? 'scale-105' : 'scale-100'
                        }`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1A0D2E] via-[#1A0D2E]/35 to-transparent" />

                      {/* Ornate Frame Overlay */}
                      <img
                        src="/assets/ticket-frame.png"
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-screen pointer-events-none"
                      />

                      {/* Gold Glowing Icon Badge */}
                      <div className="absolute top-3 left-3 w-12 h-12 rounded-xl bg-[#0D0518]/90 border border-[#D4AF37]/70 p-2 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:shadow-[0_0_15px_#D4AF37] transition-all">
                        <img
                          src={act.icon}
                          alt=""
                          className="w-full h-full object-contain filter drop-shadow-[0_0_6px_#D4AF37]"
                        />
                      </div>

                      {/* Role Badge */}
                      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-[#0D0518]/90 border border-[#D4AF37]/40 text-[10px] font-heading font-bold uppercase tracking-wider text-[#D4AF37]">
                        {act.roleBadge}
                      </div>

                      {/* Time Slot Pill */}
                      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0D0518]/90 border border-[#D4AF37]/40 text-[10px] font-heading text-[#FFB3D9] font-semibold tracking-wider">
                        <Clock className="w-3 h-3 text-[#FF8FC7]" />
                        <span>{act.timeSlot}</span>
                      </div>
                    </div>

                    {/* Performer Content */}
                    <div className="p-6 pt-4 relative z-10 flex flex-col justify-between flex-1">
                      <div>
                        <span className="text-[10px] font-heading font-semibold uppercase tracking-[0.2em] text-[#FF8FC7]">
                          {act.genre}
                        </span>
                        <h3 className="font-heading text-lg font-bold text-white mt-1 group-hover:text-[#D4AF37] transition-colors">
                          {act.name}
                        </h3>
                        <p className="font-body text-xs text-[#F0E6FA]/70 mt-2.5 leading-relaxed">
                          {act.description}
                        </p>
                      </div>

                      <div className="mt-5 pt-3 border-t border-[#D4AF37]/20 flex items-center justify-between text-[11px] font-heading text-[#D4AF37]">
                        <span className="tracking-wider uppercase">Act Showcase</span>
                        <Star className="w-3.5 h-3.5 fill-[#D4AF37]/50" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Bottom Showcase: Grand Finale Headline Act (Section 23: Main Act / Band Emphasis) */}
          {headlineAct && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.65 }}
              onMouseEnter={() => setActiveHoverId(headlineAct.id)}
              onMouseLeave={() => setActiveHoverId(null)}
              className="relative group cursor-pointer"
            >
              {/* Grand Theatrical Card for Headline Act */}
              <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#1A0D2E] via-[#2A1448] to-[#1A0D2E] border-2 border-[#D4AF37]/70 shadow-[0_0_50px_rgba(212,175,55,0.35)] group-hover:border-[#D4AF37] group-hover:shadow-[0_0_70px_rgba(224,102,255,0.6)] transition-all duration-500">
                {/* Filigree Ticket Frame Overlay */}
                <img
                  src="/assets/ticket-frame.png"
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-screen pointer-events-none"
                />

                <div className="grid grid-cols-1 lg:grid-cols-12 items-center relative z-10">
                  {/* Left: Large Headline Image Space (Dedicated visual area for band image) */}
                  <div className="lg:col-span-6 relative h-64 sm:h-80 w-full overflow-hidden bg-[#0D0518]">
                    <img
                      src={headlineAct.image}
                      alt={headlineAct.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-transparent to-[#1A0D2E] via-transparent" />

                    {/* Headline Crown Badge */}
                    <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0D0518]/95 border border-[#D4AF37] shadow-[0_0_15px_#D4AF37] text-xs font-heading font-extrabold uppercase tracking-widest text-[#D4AF37]">
                      <Award className="w-4 h-4 text-[#D4AF37]" />
                      <span>Headline Performance</span>
                    </div>

                    {/* Time Slot Pill */}
                    <div className="absolute bottom-4 left-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0D0518]/90 border border-[#D4AF37]/40 text-xs font-heading text-[#FF8FC7] font-semibold tracking-wider">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{headlineAct.timeSlot}</span>
                    </div>
                  </div>

                  {/* Right: Headline Details & Description */}
                  <div className="lg:col-span-6 p-6 sm:p-10 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-9 h-9 rounded-lg bg-[#0D0518] border border-[#D4AF37] p-1.5 flex items-center justify-center">
                          <img
                            src={headlineAct.icon}
                            alt=""
                            className="w-full h-full object-contain filter drop-shadow-[0_0_6px_#D4AF37]"
                          />
                        </div>
                        <span className="text-xs font-heading font-bold uppercase tracking-[0.25em] text-[#FF8FC7]">
                          {headlineAct.genre}
                        </span>
                      </div>

                      <h3 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white mt-2 group-hover:text-[#D4AF37] transition-colors">
                        {headlineAct.name}
                      </h3>

                      <p className="font-body text-xs sm:text-sm text-[#F0E6FA]/80 mt-4 leading-relaxed font-light">
                        {headlineAct.description}
                      </p>
                    </div>

                    <div className="mt-8 pt-4 border-t border-[#D4AF37]/30 flex items-center justify-between">
                      <span className="font-heading text-xs tracking-wider uppercase text-[#D4AF37] font-semibold flex items-center gap-2">
                        <Music className="w-4 h-4" />
                        Live Orchestral Showcase
                      </span>
                      <span className="text-xs text-[#FFB3D9] font-heading font-bold">
                        Act IV Zenith
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
};
