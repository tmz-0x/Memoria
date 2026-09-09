import React from 'react';
import { SectionDivider } from './SectionDivider';
import { Sparkles, MessageSquare, Mail, Phone, Clock, Send } from 'lucide-react';

export const Contact: React.FC = () => {
  return (
    <section id="contact" className="relative py-20 px-4 sm:px-6 lg:px-8 bg-transparent">
      <div className="max-w-5xl mx-auto">
        <SectionDivider />

        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="font-heading text-xs tracking-[0.35em] text-[#D4AF37] uppercase font-bold inline-flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            SUPPORT DESK
            <Sparkles className="w-3.5 h-3.5" />
          </span>

          <h2 className="font-heading text-3xl sm:text-5xl font-extrabold uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#F0E6FA] via-[#FF8FC7] to-[#D4AF37] mt-3">
            Concierge & Inquiries
          </h2>

          <p className="font-body text-base text-[#F0E6FA]/70 mt-3 font-light">
            Questions regarding seating allocations, group bookings, or payment status? We are here to assist.
          </p>
        </div>

        {/* Support Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* WhatsApp Support Card */}
          <a
            href="https://wa.me/94771234567"
            target="_blank"
            rel="noopener noreferrer"
            className="p-8 rounded-2xl bg-[#1A0D2E] border border-[#D4AF37]/30 hover:border-emerald-400/80 hover:bg-[#1A0D2E]/90 transition-all duration-300 group shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3.5 rounded-xl bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-heading font-semibold uppercase tracking-wider border border-emerald-500/30">
                  Instant Support
                </span>
              </div>

              <h3 className="font-heading text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">
                WhatsApp Desk
              </h3>
              <p className="font-body text-xs sm:text-sm text-[#F0E6FA]/70 mt-2 leading-relaxed">
                Chat directly with our ticketing officers for real-time status checks, slip confirmations, and urgent help.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-[#D4AF37]/15 flex items-center justify-between">
              <span className="font-mono text-sm font-semibold text-white tracking-wider">
                +94 77 123 4567
              </span>
              <span className="text-xs font-heading font-bold text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Chat Now &rarr;
              </span>
            </div>
          </a>

          {/* Email Support Card */}
          <a
            href="mailto:tickets@memoria.lk"
            className="p-8 rounded-2xl bg-[#1A0D2E] border border-[#D4AF37]/30 hover:border-[#E066FF] hover:bg-[#1A0D2E]/90 transition-all duration-300 group shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3.5 rounded-xl bg-[#E066FF]/20 text-[#E066FF] group-hover:scale-110 transition-transform">
                  <Mail className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 rounded-full bg-[#E066FF]/10 text-[#E066FF] text-[10px] font-heading font-semibold uppercase tracking-wider border border-[#E066FF]/30">
                  Formal Inquiries
                </span>
              </div>

              <h3 className="font-heading text-xl font-bold text-white group-hover:text-[#FFB3D9] transition-colors">
                Email Dispatch
              </h3>
              <p className="font-body text-xs sm:text-sm text-[#F0E6FA]/70 mt-2 leading-relaxed">
                For corporate sponsorships, institutional media passes, and formal receipt invoices.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-[#D4AF37]/15 flex items-center justify-between">
              <span className="font-mono text-sm font-semibold text-white tracking-wider">
                tickets@memoria.lk
              </span>
              <span className="text-xs font-heading font-bold text-[#E066FF] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Send Email &rarr;
              </span>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
};
