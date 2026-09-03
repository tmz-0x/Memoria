import React from 'react';
import { motion } from 'framer-motion';
import { SectionDivider } from './SectionDivider';
import { Sparkles, FileText, Landmark, UploadCloud, Clock, CheckCircle, Mail } from 'lucide-react';

const STEPS = [
  {
    step: '01',
    title: 'Fill The Form',
    desc: 'Enter your legal name, active email, mobile number, and select the exact number of tickets required.',
    icon: FileText,
  },
  {
    step: '02',
    title: 'Bank Transfer',
    desc: 'Transfer (Rs. 1000 × quantity) to the official JPURA Voiceclub account provided below.',
    icon: Landmark,
  },
  {
    step: '03',
    title: 'Upload Slip',
    desc: 'Attach a clear digital receipt, banking screenshot, or deposit slip (JPG, PNG, or PDF ≤ 5MB).',
    icon: UploadCloud,
  },
  {
    step: '04',
    title: 'Committee Review',
    desc: 'Our finance desk manually cross-checks your transfer reference against our banking statements.',
    icon: Clock,
  },
  {
    step: '05',
    title: 'Confirmation (24–48h)',
    desc: 'You will receive an approval notification update once your funds are reconciled.',
    icon: CheckCircle,
  },
  {
    step: '06',
    title: 'E-Ticket Dispatched',
    desc: 'Your unique encrypted QR gate pass is delivered straight to your verified email inbox.',
    icon: Mail,
  },
];

export const HowToBuy: React.FC = () => {
  return (
    <section id="how-to-buy" className="relative py-20 px-4 sm:px-6 lg:px-8 bg-[#0D0518]">
      <div className="max-w-6xl mx-auto">
        <SectionDivider />

        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.span
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-heading text-xs tracking-[0.35em] text-[#D4AF37] uppercase font-bold inline-flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            ACT IV — THE PROCESS
            <Sparkles className="w-3.5 h-3.5" />
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-heading text-3xl sm:text-5xl font-extrabold uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#F0E6FA] via-[#FF8FC7] to-[#D4AF37] mt-3"
          >
            How To Reserve
          </motion.h2>

          <p className="font-body text-base text-[#F0E6FA]/70 mt-3 font-light">
            A seamless six-step journey from bank deposit to concert hall admission.
          </p>
        </div>

        {/* 6 Connected Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
          {STEPS.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative p-6 rounded-2xl bg-[#1A0D2E]/60 border border-[#D4AF37]/25 hover:border-[#D4AF37] hover:bg-[#1A0D2E]/90 transition-all duration-300 group shadow-lg flex flex-col justify-between"
              >
                <div>
                  {/* Step number and icon badge */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-heading text-2xl font-black text-[#D4AF37]/50 group-hover:text-[#D4AF37] transition-colors">
                      {item.step}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-[#0D0518] border border-[#D4AF37]/40 flex items-center justify-center text-[#FF8FC7] group-hover:scale-110 group-hover:text-[#D4AF37] transition-all">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <h3 className="font-heading text-base font-bold text-white tracking-wide group-hover:text-[#FFB3D9] transition-colors">
                    {item.title}
                  </h3>

                  <p className="font-body text-xs text-[#F0E6FA]/70 mt-2.5 leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-6 pt-3 border-t border-[#D4AF37]/10 flex items-center justify-between text-[10px] uppercase font-heading text-[#D4AF37]/60 tracking-wider">
                  <span>Phase {item.step}</span>
                  <span className="w-2 h-2 rounded-full bg-[#D4AF37]/40 group-hover:bg-[#D4AF37]" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
