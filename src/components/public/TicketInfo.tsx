import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SectionDivider } from './SectionDivider';
import { useEventStore } from '../../store/eventStore';
import { HowToBuyModal } from './HowToBuyModal';
import {
  Sparkles,
  Calendar,
  MapPin,
  Ticket,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export const TicketInfo: React.FC = () => {
  const navigate = useNavigate();
  const { settings, fetchSettings } = useEventStore();
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const remaining = settings?.remainingAllocation ?? 142;
  const capacity = settings?.totalCapacity ?? 800;
  const price = settings?.ticketPrice ?? 1000;
  const cutoffDate = settings?.cutoffDate ?? 'November 10, 2026';

  return (
    <section
      id="ticket-overview"
      className="relative py-20 px-4 sm:px-6 lg:px-8 bg-transparent"
    >
      <div className="max-w-6xl mx-auto">
        <SectionDivider />

        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="font-heading text-xs tracking-[0.35em] text-[#D4AF37] uppercase font-bold inline-flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            ACT III — ADMISSION
            <Sparkles className="w-3.5 h-3.5" />
          </span>

          <h2 className="font-heading text-3xl sm:text-5xl font-extrabold uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#F0E6FA] via-[#FF8FC7] to-[#D4AF37] mt-3">
            Pass Allocation
          </h2>
          <p className="font-body text-base text-[#F0E6FA]/80 mt-3 font-light">
            Admission passes are strictly limited to theatre capacity. Secure your seat under the eclipse.
          </p>
        </div>

        {/* Master Theatrical Ticket Frame (screen4.png & screen11.png) */}
        <div className="relative rounded-3xl overflow-hidden bg-[#1A0D2E] border-2 border-[#D4AF37]/50 p-6 sm:p-10 shadow-[0_0_50px_rgba(212,175,55,0.25)]">
          {/* Authentic Ornate Gold Filigree Ticket Frame */}
          <img
            src="/assets/ticket-frame.png"
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none mix-blend-screen"
          />

          {/* Authentic Brass Memoria Wax Seal Emblem */}
          <div className="absolute -top-4 -right-4 sm:top-6 sm:right-6 w-20 h-20 sm:w-28 sm:h-28 opacity-85 pointer-events-none filter drop-shadow-[0_0_20px_rgba(212,175,55,0.7)] z-20">
            <img
              src="/assets/memoria-seal.png"
              alt="Memoria Seal"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="relative z-10">
            {/* Top Pass Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-[#D4AF37]/30 sm:pr-24">
              <div>
                <span className="text-[11px] font-heading font-bold uppercase tracking-[0.3em] text-[#FF8FC7] block">
                  Official Admission Pass &bull; General & Student Admission
                </span>
                <h3 className="font-wordmark text-4xl sm:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-[#FFF5F8] via-[#FF8FC7] to-[#D4AF37] mt-1 select-none">
                  Memoria&apos;26
                </h3>
                <span className="font-heading text-xs uppercase tracking-[0.3em] text-[#D4AF37] font-semibold block mt-0.5">
                  The Eclipse Of Memories
                </span>
              </div>

              {/* Two Ticket Tiers (Fix 6) */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="bg-[#0D0518]/90 px-4 py-2.5 rounded-2xl border border-[#D4AF37]/50 text-center shadow-inner">
                  <span className="text-[10px] font-heading uppercase tracking-widest text-[#FF8FC7] block font-bold">
                    University Student
                  </span>
                  <div className="text-2xl sm:text-3xl font-heading font-black text-[#D4AF37]">
                    Rs. 200
                  </div>
                  <span className="text-[10px] text-[#F0E6FA]/60 font-body block">With Student Reg ID</span>
                </div>

                <div className="bg-[#0D0518]/90 px-4 py-2.5 rounded-2xl border border-[#D4AF37]/30 text-center shadow-inner">
                  <span className="text-[10px] font-heading uppercase tracking-widest text-[#F0E6FA]/60 block font-semibold">
                    Outsider
                  </span>
                  <div className="text-2xl sm:text-3xl font-heading font-black text-white">
                    Rs. 1,000
                  </div>
                  <span className="text-[10px] text-[#F0E6FA]/60 font-body block">General Admission</span>
                </div>
              </div>
            </div>

            {/* Essential Event Metadata Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-8">
              <div className="p-4 rounded-xl bg-[#0D0518]/70 border border-[#D4AF37]/25 flex items-center gap-3.5">
                <Calendar className="w-6 h-6 text-[#D4AF37] shrink-0" />
                <div>
                  <span className="block text-[10px] uppercase font-heading tracking-wider text-[#F0E6FA]/50">Date & Time</span>
                  <span className="text-xs sm:text-sm font-heading font-bold text-white">Sat, Nov 14, 2026</span>
                  <span className="block text-[10px] text-[#FF8FC7]">Gates: 5:30 PM &bull; Show: 6:30 PM</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#0D0518]/70 border border-[#D4AF37]/25 flex items-center gap-3.5">
                <MapPin className="w-6 h-6 text-[#FF8FC7] shrink-0" />
                <div>
                  <span className="block text-[10px] uppercase font-heading tracking-wider text-[#F0E6FA]/50">Venue</span>
                  <span className="text-xs sm:text-sm font-heading font-bold text-white">Nelum Pokuna Theatre</span>
                  <span className="block text-[10px] text-[#F0E6FA]/60">Mahinda Rajapaksa Auditorium</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#0D0518]/70 border border-[#D4AF37]/25 flex items-center gap-3.5">
                <Ticket className="w-6 h-6 text-[#E066FF] shrink-0" />
                <div>
                  <span className="block text-[10px] uppercase font-heading tracking-wider text-[#F0E6FA]/50">Online Allocation</span>
                  <span className="text-xs sm:text-sm font-heading font-bold text-[#D4AF37]">{remaining} Passes Left</span>
                  <span className="block text-[10px] text-[#F0E6FA]/60">Cutoff: {cutoffDate}</span>
                </div>
              </div>
            </div>

            {/* Allocation Meter */}
            <div className="mb-8">
              <div className="flex items-center justify-between text-xs font-heading mb-2">
                <span className="text-[#F0E6FA]/80 uppercase tracking-wider">Hall Allocation Capacity</span>
                <span className="text-[#D4AF37] font-bold">
                  {capacity - remaining} / {capacity} Passes Allocated
                </span>
              </div>
              <div className="w-full h-3 bg-[#0D0518] rounded-full overflow-hidden border border-[#D4AF37]/30">
                <div
                  className="h-full bg-gradient-to-r from-[#D4AF37] via-[#FF8FC7] to-[#E066FF] rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(10, ((capacity - remaining) / capacity) * 100)}%` }}
                />
              </div>
            </div>

            {/* Primary Action Buttons on Main Site: Navigates to /tickets (Sections 18 & 26) */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-[#D4AF37]/30">
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="w-full sm:w-auto px-6 py-3 rounded-full font-heading text-xs tracking-[0.15em] font-semibold uppercase text-[#D4AF37] border border-[#D4AF37]/50 hover:border-[#D4AF37] hover:bg-[#D4AF37]/15 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <HelpCircle className="w-4 h-4 text-[#D4AF37]" />
                <span>How To Buy & Rules</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/tickets')}
                className="w-full sm:w-auto px-8 py-3.5 rounded-full font-heading text-xs sm:text-sm tracking-[0.2em] font-bold uppercase text-[#0D0518] bg-gradient-to-r from-[#D4AF37] via-[#FFB3D9] to-[#D4AF37] shadow-[0_0_25px_rgba(212,175,55,0.6)] hover:shadow-[0_0_35px_rgba(224,102,255,0.8)] transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Book Your Ticket &bull; From Rs. 200</span>
                <ArrowRight className="w-4 h-4 text-[#0D0518]" />
              </button>
            </div>
          </div>
        </div>

        {/* How To Buy & Rules Modal */}
        <HowToBuyModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      </div>
    </section>
  );
};
