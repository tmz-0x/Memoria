import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { SectionDivider } from './SectionDivider';
import { useEventStore } from '../../store/eventStore';
import { Sparkles, Calendar, MapPin, AlertCircle, CheckCircle2, Ticket } from 'lucide-react';

export const TicketInfo: React.FC = () => {
  const { settings, fetchSettings } = useEventStore();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const remaining = settings?.remainingAllocation ?? 142;
  const capacity = settings?.totalCapacity ?? 800;
  const price = settings?.ticketPrice ?? 1000;
  const cutoffDate = settings?.cutoffDate ?? 'November 10, 2026';

  const scrollToForm = () => {
    const el = document.getElementById('ticket-form');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="ticket-info" className="relative py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#0D0518] via-[#1A0D2E]/90 to-[#0D0518]">
      <div className="max-w-6xl mx-auto">
        <SectionDivider />

        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="font-heading text-xs tracking-[0.35em] text-[#D4AF37] uppercase font-bold inline-flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            ACT III — ADMISSION
            <Sparkles className="w-3.5 h-3.5" />
          </span>

          <h2 className="font-heading text-3xl sm:text-5xl font-extrabold uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#F0E6FA] via-[#FF8FC7] to-[#D4AF37] mt-3">
            Ticket Allocation
          </h2>
          <p className="font-body text-base text-[#F0E6FA]/70 mt-3 font-light">
            Secure your presence under the eclipse. All online tickets are strictly validated.
          </p>
        </div>

        {/* Master Ticket Details Display with Authentic Ticket Frame */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Main Admission Pass Card */}
          <div className="lg:col-span-7 rounded-2xl bg-[#1A0D2E] border border-[#D4AF37]/50 p-6 sm:p-8 relative overflow-hidden shadow-2xl flex flex-col justify-between">
            {/* Theatrical Ticket Frame Backdrop Overlay (from screen4.png) */}
            <img
              src="/assets/ticket-frame.png"
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none mix-blend-screen"
            />

            {/* Background Glow Accents */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#E066FF]/20 to-transparent rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#D4AF37]/20">
                <div>
                  <span className="text-[11px] font-heading font-bold uppercase tracking-[0.25em] text-[#FF8FC7]">
                    Official Pass
                  </span>
                  <h3 className="font-heading text-2xl sm:text-3xl font-bold text-white mt-1">
                    General Admission
                  </h3>
                </div>
                <div className="text-right">
                  <div className="text-3xl sm:text-4xl font-heading font-extrabold text-[#D4AF37]">
                    Rs. {price.toLocaleString()}
                  </div>
                  <span className="text-xs text-[#F0E6FA]/60 font-body">Per Attendee / Pass</span>
                </div>
              </div>

              {/* Key Details List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
                <div className="flex items-center gap-3 p-3.5 rounded-lg bg-[#0D0518]/70 border border-[#D4AF37]/20">
                  <Calendar className="w-5 h-5 text-[#D4AF37] shrink-0" />
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-[#F0E6FA]/50">Date</span>
                    <span className="text-xs font-heading font-semibold text-[#F0E6FA]">Nov 14, 2026 &bull; 6:30 PM</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3.5 rounded-lg bg-[#0D0518]/70 border border-[#D4AF37]/20">
                  <MapPin className="w-5 h-5 text-[#FF8FC7] shrink-0" />
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-[#F0E6FA]/50">Venue</span>
                    <span className="text-xs font-heading font-semibold text-[#F0E6FA]">Nelum Pokuna Theatre</span>
                  </div>
                </div>
              </div>

              {/* Important Policy Clarification Box */}
              <div className="p-4 rounded-xl bg-[#0D0518]/80 border-l-4 border-[#D4AF37] space-y-2 mb-6">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                  <p className="text-xs text-[#F0E6FA]/90 leading-relaxed">
                    <strong className="text-[#D4AF37]">External Attendees:</strong> Online purchases on this portal are strictly for external guests.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#FF8FC7] shrink-0 mt-0.5" />
                  <p className="text-xs text-[#F0E6FA]/80 leading-relaxed">
                    <strong className="text-[#FF8FC7]">JPURA Undergraduates & Faculty:</strong> Please obtain your physical passes directly from the JPURA Voiceclub campus booth.
                  </p>
                </div>
              </div>
            </div>

            {/* Allocation Meter and CTA */}
            <div className="pt-4 border-t border-[#D4AF37]/20 relative z-10">
              <div className="flex items-center justify-between text-xs font-heading mb-2">
                <span className="text-[#F0E6FA]/80 uppercase tracking-wider">Remaining Online Allocation</span>
                <span className="text-[#D4AF37] font-bold">
                  {remaining} / {capacity} Passes Left
                </span>
              </div>
              {/* Allocation Progress Bar */}
              <div className="w-full h-2.5 bg-[#0D0518] rounded-full overflow-hidden border border-[#D4AF37]/30">
                <div
                  className="h-full bg-gradient-to-r from-[#D4AF37] via-[#FF8FC7] to-[#E066FF] rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(8, ((capacity - remaining) / capacity) * 100)}%` }}
                />
              </div>

              <div className="mt-6 flex items-center justify-between flex-wrap gap-4">
                <span className="text-xs text-[#FF8FC7] font-body flex items-center gap-1.5">
                  Cutoff Date: {cutoffDate}
                </span>

                <button
                  onClick={scrollToForm}
                  className="px-6 py-2.5 rounded-full font-heading text-xs tracking-[0.15em] font-bold uppercase text-[#0D0518] bg-gradient-to-r from-[#D4AF37] via-[#FFB3D9] to-[#D4AF37] hover:shadow-[0_0_20px_rgba(212,175,55,0.7)] transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <Ticket className="w-4 h-4" />
                  Purchase Now
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Perks & Authentic Camera / Memories Icon */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            <div className="p-6 rounded-2xl bg-[#1A0D2E]/70 border border-[#D4AF37]/25 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#0D0518] border border-[#D4AF37]/40 p-2 flex items-center justify-center">
                  <img src="/assets/icon-camera.png" alt="" className="w-full h-full object-contain" />
                </div>
                <h4 className="font-heading text-sm font-bold uppercase tracking-wider text-[#D4AF37]">
                  What Your Pass Includes
                </h4>
              </div>
              <ul className="space-y-3 font-body text-xs sm:text-sm text-[#F0E6FA]/80">
                <li className="flex items-start gap-2">
                  <span className="text-[#D4AF37] font-bold">&bull;</span>
                  <span>Full theatrical admission to all 4 acts of Memoria’26</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#D4AF37] font-bold">&bull;</span>
                  <span>Digital high-security QR e-ticket sent directly to your inbox</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#D4AF37] font-bold">&bull;</span>
                  <span>Direct contribution to the JPURA Youth Music Education Fund</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#D4AF37] font-bold">&bull;</span>
                  <span>Complimentary keepsake event program booklet at entrance</span>
                </li>
              </ul>
            </div>

            {/* Verification Guarantee Notice */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-[#1A0D2E] to-[#0D0518] border border-[#E066FF]/30 shadow-lg">
              <span className="text-[10px] font-heading font-bold uppercase tracking-[0.2em] text-[#E066FF]">
                Authenticity Guarantee
              </span>
              <h4 className="font-heading text-sm font-bold text-white mt-1 mb-2">
                Human-Verified Slip Review
              </h4>
              <p className="font-body text-xs text-[#F0E6FA]/70 leading-relaxed">
                Every online transfer is individually reconciled by our committee before issuing a unique QR pass. No scalpers, no duplicated seats.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
