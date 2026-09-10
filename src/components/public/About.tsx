import React from 'react';
import { motion } from 'framer-motion';
import { SectionDivider } from './SectionDivider';
import { Sparkles } from 'lucide-react';

export const About: React.FC = () => {
  return (
    <section id="about" className="relative pt-6 pb-20 px-4 sm:px-6 lg:px-8 bg-transparent">
      <div className="max-w-6xl mx-auto">
        {/* Theatrical Scene Transition Divider */}
        <SectionDivider className="!py-6" />

        {/* Story Intro Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
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
            className="font-body text-base sm:text-lg text-[#F0E6FA]/80 mt-5 leading-relaxed font-light"
          >
            Memoria&apos;26 is more than a concert — It's an immersive musical experience presented by the J'PURA VOICE Filming Division, blending live performance, expressive dance, and interactive moments that celebrate love, connection, and the spirit of youth. Every performance is crafted to create lasting impressions, turning a single evening into a memory that lingers long after the final note fades.
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

            {/* Base Image: Authentic Memoria '25 Live Concert Experience */}
            <div className="relative rounded-2xl overflow-hidden border border-[#D4AF37]/30 shadow-2xl bg-[#1A0D2E]">
              <img
                src="/assets/25memm.png"
                alt="Memoria '25 Live Concert Experience"
                className="w-full h-[260px] sm:h-[380px] md:h-[440px] object-cover transition-transform duration-700 group-hover:scale-105"
              />

              {/* Floating Moon Atmosphere Overlay from screen7.png
              <div className="absolute top-4 right-4 w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border border-[#D4AF37]/50 shadow-[0_0_30px_rgba(212,175,55,0.5)] pointer-events-none bg-[#0D0518]/60 backdrop-blur-xs">
                <img
                  src="/assets/moon-starfield.png"
                  alt="Luminous Starfield"
                  className="w-full h-full object-cover"
                />
              </div> */}

              {/* Gradient Scrim */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0D0518] via-transparent to-[#0D0518]/30 pointer-events-none" />

              {/* Theatrical Card Label */}
              <div className="absolute bottom-6 left-6 right-6">
                <span className="font-heading text-[10px] tracking-[0.25em] text-[#D4AF37] uppercase font-bold">
                  JPURA Voice Signature Production
                </span>
                <h3 className="font-heading text-xl sm:text-2xl font-bold text-white mt-1">
                  Memoria&apos;25 Live Concert Experience
                </h3>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Three Theatrical Pillars with authentic gold icons */}
          <div className="lg:col-span-5 space-y-6">
            {[
              {
                iconSrc: '/assets/icon-music.png',
                title: 'Live Musical Performances',
                desc: 'Romantic performances by talented university artists and special guest musicians, creating an emotional soundtrack for the evening',
              },
              {
                iconSrc: '/assets/icon-dance.png',
                title: 'Dance & Couple Experiences',
                desc: 'Beautifully choreographed solo, couple, and group performances celebrating different expressions of love — alongside interactive games and live dedications that turn the audience into part of the story.',
              },
              {
                iconSrc: '/assets/icon-couple.png',
                title: 'A Night That Gives Back',
                desc: 'Beyond entertainment, Memoria26 supports 76 school students through essential educational resources and learning materials — turning the success of the night into a lasting, meaningful contribution.',
              },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.15 * idx }}
                className="p-4 sm:p-5 rounded-xl bg-[#1A0D2E]/60 border border-[#D4AF37]/25 hover:border-[#D4AF37]/70 hover:bg-[#1A0D2E]/90 transition-all duration-300 group shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#0D0518] border border-[#D4AF37]/50 p-2 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:shadow-[0_0_15px_#D4AF37] transition-all">
                    <img
                      src={item.iconSrc}
                      alt=""
                      className="w-full h-full object-contain filter drop-shadow-[0_0_6px_#D4AF37]"
                    />
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
