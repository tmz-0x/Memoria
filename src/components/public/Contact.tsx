import React from 'react';
import { SectionDivider } from './SectionDivider';
import { Sparkles, MessageSquare, Mail, Clock, ShieldCheck, ArrowUpRight } from 'lucide-react';

// ============================================================================
// 📱 CONFIGURE YOUR 3 WHATSAPP SUPPORT NUMBERS HERE:
// Simply replace the displayNumber and cleanNumber below.
// ============================================================================
export const WHATSAPP_SUPPORT_LINES = [
  {
    id: 1,
    label: 'Support Hotline 01',
    displayNumber: '+94 76 877 3240', // Primary WhatsApp Number
    cleanNumber: '94768773240',
    desc: 'Primary Ticket Desk & Bank Verification',
  },
  {
    id: 2,
    label: 'Support Hotline 02',
    displayNumber: '+94 XX XXX XXXX', // <-- REPLACE WITH YOUR WHATSAPP NUMBER 2
    cleanNumber: '94XXXXXXXXX',       // <-- Digits for wa.me link (e.g. 94771234567)
    desc: 'Student Registration & Entry Inquiries',
  },
  {
    id: 3,
    label: 'Support Hotline 03',
    displayNumber: '+94 XX XXX XXXX', // <-- REPLACE WITH YOUR WHATSAPP NUMBER 3
    cleanNumber: '94XXXXXXXXX',       // <-- Digits for wa.me link (e.g. 94719876543)
    desc: 'General Inquiries & Emergency Assistance',
  },
];

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
            Questions regarding admission passes, group bookings, or payment status? We are here to assist.
          </p>
        </div>

        {/* Support Options Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* WhatsApp Support Multi-Number Card */}
          <div className="p-6 sm:p-8 rounded-2xl bg-[#1A0D2E] border border-[#D4AF37]/30 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-heading font-semibold uppercase tracking-wider border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Instant WhatsApp Desk
                </span>
              </div>

              <h3 className="font-heading text-xl font-bold text-white">
                Official WhatsApp Helplines
              </h3>
              <p className="font-body text-xs sm:text-sm text-[#F0E6FA]/70 mt-2 leading-relaxed">
                Connect directly with our dedicated ticketing officers for real-time slip confirmations, student ID verifications, and urgent gate inquiries.
              </p>

              {/* 3 WhatsApp Lines List */}
              <div className="mt-6 space-y-3">
                {WHATSAPP_SUPPORT_LINES.map((line) => (
                  <a
                    key={line.id}
                    href={`https://wa.me/${line.cleanNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block p-3.5 rounded-xl bg-[#0D0518]/60 hover:bg-emerald-950/30 border border-white/10 hover:border-emerald-500/50 transition-all duration-200"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-emerald-400">
                            {line.label}
                          </span>
                          <span className="text-[10px] text-[#F0E6FA]/40">&bull;</span>
                          <span className="text-[10px] font-body text-[#F0E6FA]/60 truncate">
                            {line.desc}
                          </span>
                        </div>
                        <div className="font-mono text-sm sm:text-base font-bold text-white tracking-wider group-hover:text-emerald-300 transition-colors mt-0.5">
                          {line.displayNumber}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/15 group-hover:bg-emerald-500 text-emerald-400 group-hover:text-black font-heading text-xs font-bold uppercase tracking-wider transition-all duration-200">
                        <span>Chat</span>
                        <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#D4AF37]/15 flex items-center justify-between text-[11px] text-[#F0E6FA]/60 font-body">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Verified Memoria&apos;26 Officers
              </span>
              <span className="text-[#D4AF37]">Available 24/7</span>
            </div>
          </div>

          {/* Email Support Card */}
          <div className="p-6 sm:p-8 rounded-2xl bg-[#1A0D2E] border border-[#D4AF37]/30 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3.5 rounded-xl bg-[#E066FF]/20 text-[#E066FF]">
                  <Mail className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 rounded-full bg-[#E066FF]/10 text-[#E066FF] text-[10px] font-heading font-semibold uppercase tracking-wider border border-[#E066FF]/30">
                  Formal Inquiries
                </span>
              </div>

              <h3 className="font-heading text-xl font-bold text-white">
                Email Dispatch
              </h3>
              <p className="font-body text-xs sm:text-sm text-[#F0E6FA]/70 mt-2 leading-relaxed">
                For corporate sponsorships, institutional bulk passes, media accreditations, and official payment receipts.
              </p>

              {/* Email Action Box */}
              <div className="mt-6 space-y-3">
                <a
                  href="mailto:thisalmethwidu16@gmail.com"
                  className="group block p-4 rounded-xl bg-[#0D0518]/60 hover:bg-[#E066FF]/10 border border-white/10 hover:border-[#E066FF]/50 transition-all duration-200"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-[#FFB3D9]">
                        Official Helpdesk Email
                      </span>
                      <div className="font-mono text-sm sm:text-base font-bold text-white tracking-wide group-hover:text-[#FFB3D9] transition-colors mt-0.5 break-all">
                        thisalmethwidu16@gmail.com
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#E066FF]/20 group-hover:bg-[#E066FF] text-[#FFB3D9] group-hover:text-black font-heading text-xs font-bold uppercase tracking-wider transition-all duration-200">
                      <span>Send</span>
                      <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                  </div>
                </a>

                {/* Additional Info Pill Box */}
                <div className="p-3.5 rounded-xl bg-[#0D0518]/40 border border-white/5 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-[#F0E6FA]/75">
                    <Clock className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                    <span>Average email response: <strong className="text-white">Within 2–4 hours</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#F0E6FA]/75">
                    <Sparkles className="w-3.5 h-3.5 text-[#E066FF] shrink-0" />
                    <span>Please include your <strong>Order / Submission ID</strong> in the subject line.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#D4AF37]/15 flex items-center justify-between text-[11px] text-[#F0E6FA]/60 font-body">
              <span>Official Event Secretariat</span>
              <span className="text-[#E066FF]">Direct Response</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

