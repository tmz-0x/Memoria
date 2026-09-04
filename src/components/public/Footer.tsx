import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, ArrowUp } from 'lucide-react';

export const Footer: React.FC = () => {
  const navigate = useNavigate();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="relative bg-[#07020C] text-[#F0E6FA] border-t border-[#D4AF37]/30 pt-16 pb-12 overflow-hidden">
      {/* Background Starfield and Crescent Moon */}
      <div className="absolute inset-0 pointer-events-none opacity-25">
        <img
          src="/assets/moon-starfield.png"
          alt=""
          className="w-full h-full object-cover mix-blend-screen"
        />
      </div>

      {/* Floating Crescent Moon in footer corner */}
      <div className="absolute -top-10 -right-10 w-64 h-64 pointer-events-none opacity-20">
        <img
          src="/assets/moon-crescent.png"
          alt=""
          className="w-full h-full object-contain"
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-[#D4AF37]/20">
          {/* Brand Column */}
          <div className="md:col-span-5 space-y-4">
            <span className="font-wordmark text-4xl sm:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-[#FFF5F8] via-[#FF8FC7] to-[#D4AF37] drop-shadow-[0_0_20px_rgba(224,102,255,0.7)] select-none">
              Memoria&apos;26
            </span>
            <p className="font-heading text-xs uppercase tracking-[0.3em] text-[#D4AF37] font-semibold">
              The Eclipse Of Memories
            </p>
            <p className="font-body text-xs sm:text-sm text-[#F0E6FA]/70 max-w-sm leading-relaxed">
              An unforgettable theatrical symphony presented by the Voiceclub of University of Sri Jayewardenepura.
            </p>
          </div>

          {/* Quick Navigation Links */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="font-heading text-xs uppercase tracking-widest text-[#D4AF37] font-bold">
              The Experience
            </h4>
            <ul className="space-y-2 text-xs font-body text-[#F0E6FA]/70">
              <li>
                <button type="button" onClick={() => scrollToSection('about')} className="hover:text-[#D4AF37] transition-colors cursor-pointer">
                  The Genesis & Story
                </button>
              </li>
              <li>
                <button type="button" onClick={() => scrollToSection('lineup')} className="hover:text-[#D4AF37] transition-colors cursor-pointer">
                  Theatrical Lineup
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/tickets')} className="hover:text-[#D4AF37] transition-colors cursor-pointer">
                  Ticket Purchase &bull; Rs. 1000
                </button>
              </li>
              <li>
                <button type="button" onClick={() => scrollToSection('charity')} className="hover:text-[#D4AF37] transition-colors cursor-pointer">
                  Swarodaya Youth Fund
                </button>
              </li>
              <li>
                <button type="button" onClick={() => scrollToSection('faq')} className="hover:text-[#D4AF37] transition-colors cursor-pointer">
                  Ticketing Policy FAQ
                </button>
              </li>
            </ul>
          </div>

          {/* Logistics and Venue */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="font-heading text-xs uppercase tracking-widest text-[#D4AF37] font-bold">
              The Gathering
            </h4>
            <div className="space-y-2.5 text-xs text-[#F0E6FA]/70 font-body">
              <div className="flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                <span>Saturday, November 14, 2026 &bull; Gates Open 5:30 PM &bull; Showtime 6:30 PM</span>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#FF8FC7] shrink-0 mt-0.5" />
                <span>Nelum Pokuna Mahinda Rajapaksa Theatre, Colombo 07, Sri Lanka</span>
              </div>
            </div>

            {/* Back to top trigger */}
            <div className="pt-3">
              <button
                type="button"
                onClick={scrollToTop}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1A0D2E] border border-[#D4AF37]/40 hover:border-[#D4AF37] text-xs font-heading uppercase tracking-wider text-[#D4AF37] transition-all hover:scale-105 cursor-pointer"
              >
                <span>Return to Zenith</span>
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar Credits (NO PUBLIC PORTAL LINK) */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-body text-[#F0E6FA]/50">
          <p className="flex items-center gap-1">
            <span>&copy; 2026 Memoria&apos;26. Crafted with pride by</span>
            <strong className="text-[#D4AF37] font-semibold">JPURA Voiceclub</strong>.
          </p>

          <div className="flex items-center space-x-6 text-[11px] font-heading uppercase tracking-wider">
            <button type="button" onClick={() => navigate('/tickets')} className="hover:text-[#D4AF37] transition-colors cursor-pointer">
              Terms of Admission
            </button>
            <button type="button" onClick={() => scrollToSection('contact')} className="hover:text-[#D4AF37] transition-colors cursor-pointer">
              Concierge Desk
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
