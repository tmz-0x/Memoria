import React, { useRef, useState } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { SectionDivider } from './SectionDivider';
import { Sparkles, Clock, Star } from 'lucide-react';

export interface ActData {
  id: string;
  name: string;
  genre: string;
  timeSlot: string;
  description: string;
  icon: string;
  image: string;
}

// Separated Artist Data Model for future photo replacement (Section 16)
export const LINEUP_ACTS: ActData[] = [
  {
    id: 'act-1',
    name: 'The Acoustic Ensemble',
    genre: 'Chamber Folk & Acoustic Symphony',
    timeSlot: '6:30 PM — 7:15 PM',
    description: 'Delicate acoustic strings, cello harmonies, and ethereal vocals opening the theatre into twilight.',
    icon: '/assets/icon-music.png',
    image: '/assets/hero-stage-scene.jpg',
  },
  {
    id: 'act-2',
    name: 'Symphony Strings',
    genre: 'Neo-Classical Cinematic Quartet',
    timeSlot: '7:25 PM — 8:10 PM',
    description: 'Dramatic violin crescendos and sweeping string textures evoking the onset of the celestial eclipse.',
    icon: '/assets/icon-dance.png',
    image: '/assets/candlelit-venue.jpg',
  },
  {
    id: 'act-3',
    name: 'The Eclipse Choir',
    genre: 'Choral Harmony & Polyphony',
    timeSlot: '8:20 PM — 9:15 PM',
    description: 'A 30-voice choir filling the grand auditorium with timeless choral arrangements and resonant polyphony.',
    icon: '/assets/icon-couple.png',
    image: '/assets/moon-starfield.png',
  },
  {
    id: 'act-4',
    name: 'JPURA Voiceclub Soloists',
    genre: 'Grand Finale Showcase',
    timeSlot: '9:25 PM — 10:30 PM',
    description: 'The award-winning premier collegiate vocalists culminating the night in unforgettable theatrical duets.',
    icon: '/assets/icon-camera.png',
    image: '/assets/hero-stage-scene.jpg',
  },
];

export const Lineup: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [activeHoverId, setActiveHoverId] = useState<string | null>(null);

  // System B: Strictly Scroll-Linked Lineup Spotlight (Sections 13, 14, 15)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 95,
    damping: 26,
    restDelta: 0.001,
  });

  // FULL WIDTH MOVEMENT: Far Left (-30%) -> Center (35%) -> Far Right (105%)
  // Scroll DOWN: Left to Right. Scroll UP: Right to Left. Deterministic and perfectly reversible.
  const spotlightX = useTransform(smoothProgress, [0, 1], ['-30%', '105%']);
  const spotlightOpacity = useTransform(smoothProgress, [0, 0.12, 0.88, 1], [0, 0.7, 0.7, 0]);

  return (
    <section
      ref={sectionRef}
      id="lineup"
      className="relative py-24 px-4 sm:px-6 lg:px-8 bg-[#0D0518] overflow-hidden"
    >
      {/* Full-Width Scroll-Linked Theatrical Spotlight Beam (No Autoplay, No Infinite Loops) */}
      <motion.div
        style={{
          x: spotlightX,
          opacity: spotlightOpacity,
        }}
        className="pointer-events-none absolute -top-40 w-[650px] sm:w-[800px] h-[1000px] mix-blend-screen z-0 will-change-transform"
      >
        <img
          src="/assets/spotlight-beam.png"
          alt="Theatrical Spotlight Beam"
          className="w-full h-full object-fill filter drop-shadow-[0_0_70px_#E066FF]"
        />
      </motion.div>

      <div className="relative z-10 max-w-7xl mx-auto">
        <SectionDivider />

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
            Each performer steps onto the stage under the singular focus of our theatrical lights.
          </p>
        </div>

        {/* Performer Cards in Theatrical Ticket Frames (screen4.png) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {LINEUP_ACTS.map((act, index) => {
            const isHovered = activeHoverId === act.id;

            return (
              <motion.div
                key={act.id}
                initial={{ scale: 0.9, opacity: 0, filter: 'brightness(0.7)' }}
                whileInView={{ scale: 1, opacity: 1, filter: 'brightness(1)' }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.1,
                  ease: 'easeOut',
                }}
                onMouseEnter={() => setActiveHoverId(act.id)}
                onMouseLeave={() => setActiveHoverId(null)}
                className="relative group cursor-pointer"
              >
                {/* Backing Card with Filigree Ticket Frame */}
                <div className="relative rounded-2xl overflow-hidden bg-[#1A0D2E] border border-[#D4AF37]/40 shadow-xl transition-all duration-300 group-hover:border-[#D4AF37] group-hover:shadow-[0_0_35px_rgba(224,102,255,0.45)]">
                  {/* Subtle Top Spotlight Beam Glow on Hover */}
                  <div
                    className={`absolute -top-10 inset-x-0 h-44 bg-gradient-to-b from-[#E066FF]/35 to-transparent transition-opacity duration-300 pointer-events-none ${
                      isHovered ? 'opacity-95' : 'opacity-20'
                    }`}
                  />

                  {/* Performer Image Banner */}
                  <div className="relative h-48 w-full overflow-hidden">
                    <img
                      src={act.image}
                      alt={act.name}
                      className={`w-full h-full object-cover transition-transform duration-500 ease-out ${
                        isHovered ? 'scale-105' : 'scale-100'
                      }`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1A0D2E] via-[#1A0D2E]/40 to-transparent" />

                    {/* Authentic Gold Glowing Icon Badge (from screen9.png) */}
                    <div className="absolute top-3 left-3 w-12 h-12 rounded-xl bg-[#0D0518]/90 border border-[#D4AF37]/70 p-2 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:shadow-[0_0_15px_#D4AF37] transition-all">
                      <img
                        src={act.icon}
                        alt=""
                        className="w-full h-full object-contain filter drop-shadow-[0_0_6px_#D4AF37]"
                      />
                    </div>

                    {/* Time Slot Pill */}
                    <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0D0518]/90 border border-[#D4AF37]/40 text-[10px] font-heading text-[#D4AF37] font-semibold tracking-wider">
                      <Clock className="w-3 h-3 text-[#FF8FC7]" />
                      <span>{act.timeSlot}</span>
                    </div>
                  </div>

                  {/* Ornate Ticket Frame Border (from screen4.png) */}
                  <img
                    src="/assets/ticket-frame.png"
                    alt=""
                    className="absolute inset-0 w-full h-full pointer-events-none object-cover opacity-60 mix-blend-screen group-hover:opacity-90 transition-opacity"
                  />

                  {/* Performer Card Body Content */}
                  <div className="p-6 pt-4 relative z-10 flex flex-col justify-between min-h-[170px]">
                    <div>
                      <span className="text-[10px] font-heading font-semibold uppercase tracking-[0.2em] text-[#FF8FC7]">
                        {act.genre}
                      </span>
                      <h3 className="font-heading text-lg font-bold text-[#F0E6FA] mt-1 group-hover:text-[#D4AF37] transition-colors">
                        {act.name}
                      </h3>
                      <p className="font-body text-xs text-[#F0E6FA]/70 mt-2.5 leading-relaxed">
                        {act.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#D4AF37]/20 flex items-center justify-between text-[11px] font-heading text-[#D4AF37]">
                      <span className="tracking-wider uppercase">Stage Entry</span>
                      <Star className="w-3.5 h-3.5 fill-[#D4AF37]/50" />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
