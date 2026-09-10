import React from 'react';
import { motion } from 'framer-motion';
import { SectionDivider } from './SectionDivider';
import { Sparkles, Heart, GraduationCap, Music, Users } from 'lucide-react';

export const Charity: React.FC = () => {
  return (
    <section id="charity" className="relative py-20 px-4 sm:px-6 lg:px-8 bg-transparent">
      <div className="max-w-5xl mx-auto">
        <SectionDivider />

        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="font-heading text-xs tracking-[0.35em] text-[#FF8FC7] uppercase font-bold inline-flex items-center gap-2">
            <Heart className="w-3.5 h-3.5 text-[#FF8FC7] fill-[#FF8FC7]" />
            ACT VII — THE IMPACT
            <Heart className="w-3.5 h-3.5 text-[#FF8FC7] fill-[#FF8FC7]" />
          </span>

          <h2 className="font-heading text-3xl sm:text-5xl font-extrabold uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#F0E6FA] via-[#FF8FC7] to-[#D4AF37] mt-3">
            Harmonies That Heal
          </h2>

          <p className="font-body text-base text-[#F0E6FA]/80 mt-3 font-light leading-relaxed">
            Every ticket purchased for Memoria '26 resonates far beyond the spotlight. As part of our Corporate Social Responsibility initiative, we're supporting 76 school students with essential educational resources and learning materials.
          </p>
        </div>

        {/* Emotion-driven Feature Card */}
        <div className="relative rounded-3xl overflow-hidden bg-[#1A0D2E] border border-[#D4AF37]/30 shadow-2xl p-8 sm:p-12">
          {/* Subtle Ambient Lunar & Rose Glow */}
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-[#FF8FC7]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-[#D4AF37]/15 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10 text-center sm:text-left">
            <div className="p-6 rounded-2xl bg-[#0D0518]/70 border border-[#D4AF37]/20 flex flex-col items-center sm:items-start space-y-3">
              <div className="p-3 rounded-xl bg-[#D4AF37]/20 text-[#D4AF37]">
                <Music className="w-6 h-6" />
              </div>
              <h4 className="font-heading text-base font-bold text-white">
                Supporting Students
              </h4>
              <p className="font-body text-xs text-[#F0E6FA]/70 leading-relaxed">
                Directly reaching 76 school students identified as part of this year's initiative.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#0D0518]/70 border border-[#D4AF37]/20 flex flex-col items-center sm:items-start space-y-3">
              <div className="p-3 rounded-xl bg-[#FF8FC7]/20 text-[#FF8FC7]">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h4 className="font-heading text-base font-bold text-white">
                Learning Materials
              </h4>
              <p className="font-body text-xs text-[#F0E6FA]/70 leading-relaxed">
                Providing essential educational resources and learning materials to help students learn and grow.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#0D0518]/70 border border-[#D4AF37]/20 flex flex-col items-center sm:items-start space-y-3">
              <div className="p-3 rounded-xl bg-[#E066FF]/20 text-[#E066FF]">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="font-heading text-base font-bold text-white">
                A Lasting Contribution
              </h4>
              <p className="font-body text-xs text-[#F0E6FA]/70 leading-relaxed">
                Turning the success of Memoria '26 into a meaningful, lasting impact beyond a single night.
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-[#D4AF37]/20 text-center">
            <p className="font-body text-xs sm:text-sm text-[#FFB3D9] italic">
              &ldquo;Beyond the music - a gift that lasts.&rdquo;
            </p>
            <span className="block font-heading text-[10px] tracking-[0.25em] text-[#D4AF37] uppercase font-semibold mt-1">
              JPURA Voiceclub Social Responsibility Initiative
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
