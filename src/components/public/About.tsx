import React from 'react';
import { motion } from 'framer-motion';
import { SectionDivider } from './SectionDivider';
import { Sparkles, Moon, Compass, Music2 } from 'lucide-react';

export const About: React.FC = () => {
  return (
    <section id="about" className="relative py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#0D0518] via-[#1A0D2E]/80 to-[#0D0518]">
      <div className="max-w-6xl mx-auto">
        {/* Theatrical Scene Transition Divider */}
        <SectionDivider />

        {/* Story Intro Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.span
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="font-heading text-xs tracking-[0.35em] text-[#D4AF37] uppercase font-bold inline-flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            ACT I — THE GENESIS
            <Sparkles className="w-3.5 h-3.5" />
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-heading text-3xl sm:text-5xl font-extrabold uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#F0E6FA] via-[#FF8FC7] to-[#D4AF37] mt-3"
          >
            &ldquo;Every memory begins with a moment.&rdquo;
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="font-body text-base sm:text-lg text-[#F0E6FA]/80 mt-6 leading-relaxed font-light"
          >
            Memoria&apos;26 is not merely a concert. It is an immersive nocturnal odyssey where music, theatrical drama, and celestial wonder intertwine. An eclipse marks the rare, breathtaking cosmic convergence where the light gives way to sacred memory—and tonight, we bring that shadow to life.
          </motion.p>
        </div>

        {/* Atmospheric Layering Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Column: Atmospheric Layered Stage Imagery */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-7 relative group"
          >
            {/* Ambient Glow Aura */}
            <div className="absolute -inset-4 bg-gradient-to-r from-[#C04ECF]/30 via-[#D4AF37]/20 to-[#E066FF]/30 rounded-3xl blur-2xl group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

            {/* Base Image: Candlelit Auditorium */}
            <div className="relative rounded-2xl overflow-hidden border border-[#D4AF37]/30 shadow-2xl bg-[#1A0D2E]">
              <img
                src="/assets/candlelit-venue.jpg"
                alt="Intimate Candlelit Theatrical Venue"
                className="w-full h-[360px] sm:h-[420px] object-cover transition-transform duration-700 group-hover:scale-105"
              />

              {/* Floating Moon Atmosphere Overlay */}
              <div className="absolute top-4 right-4 w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden border border-[#D4AF37]/40 shadow-[0_0_25px_rgba(212,175,55,0.4)] pointer-events-none">
                <img
                  src="/assets/moon-starfield.png"
                  alt="Luminous Starfield"
                  className="w-full h-full object-cover animate-spin-slow"
                />
              </div>

              {/* Gradient Scrim */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0D0518] via-transparent to-[#0D0518]/30 pointer-events-none" />

              {/* Theatrical Card Label */}
              <div className="absolute bottom-6 left-6 right-6">
                <span className="font-heading text-[10px] tracking-[0.25em] text-[#D4AF37] uppercase font-bold">
                  JPURA Voiceclub Signature Production
                </span>
                <h3 className="font-heading text-xl sm:text-2xl font-bold text-white mt-1">
                  The Symphony of Shadows & Light
                </h3>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Three Theatrical Pillars */}
          <div className="lg:col-span-5 space-y-6">
            {[
              {
                icon: Moon,
                title: 'The Lunar Concept',
                desc: 'A story of two celestial bodies in transient harmony. As the eclipse reaches totality, forgotten melodies resurface with orchestral power.',
                color: 'from-[#FF8FC7] to-[#E066FF]',
              },
              {
                icon: Music2,
                title: 'Live Orchestration',
                desc: 'Over 40 elite vocalists and classical instrumentalists performing live arrangements written exclusively for Memoria’26.',
                color: 'from-[#D4AF37] to-[#FF8FC7]',
              },
              {
                icon: Compass,
                title: 'A Night Of Purpose',
                desc: 'Every note resonates beyond the theatre walls. All net proceeds directly empower rural youth music and cultural scholarships across Sri Lanka.',
                color: 'from-[#E066FF] to-[#D4AF37]',
              },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: 25 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.15 * idx }}
                className="p-6 rounded-xl bg-[#1A0D2E]/50 border border-[#D4AF37]/20 hover:border-[#D4AF37]/60 hover:bg-[#1A0D2E]/80 transition-all duration-300 group"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg bg-gradient-to-br ${item.color} text-[#0D0518] shadow-md shrink-0 group-hover:scale-110 transition-transform`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-heading text-base font-bold text-[#F0E6FA] tracking-wide group-hover:text-[#D4AF37] transition-colors">
                      {item.title}
                    </h4>
                    <p className="font-body text-xs sm:text-sm text-[#F0E6FA]/70 mt-1.5 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
