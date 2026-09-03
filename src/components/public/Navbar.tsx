import React, { useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Ticket, Menu, X } from 'lucide-react';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { scrollY } = useScroll();

  // Scroll-linked reveal: completely hidden at initial load (scrollY < 650)
  // Appears only after the cinematic opening has established (650px - 950px)
  const navOpacity = useTransform(scrollY, [550, 850], [0, 1]);
  const navY = useTransform(scrollY, [550, 850], [-25, 0]);
  const navPointerEvents = useTransform(scrollY, (val) => (val > 600 ? 'auto' : 'none'));

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <motion.header
      style={{
        opacity: navOpacity,
        y: navY,
        pointerEvents: navPointerEvents,
      }}
      className="fixed top-0 left-0 right-0 z-50 transition-colors duration-300 bg-[#0D0518]/90 backdrop-blur-md border-b border-[#D4AF37]/20 py-3 shadow-lg shadow-[#0D0518]/60"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Wordmark */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="group flex items-center gap-2 focus:outline-none cursor-pointer"
        >
          <span className="font-wordmark text-3xl sm:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-[#FFF5F8] via-[#FF8FC7] to-[#D4AF37] group-hover:drop-shadow-[0_0_15px_#E066FF] transition-all select-none">
            Memoria&apos;26
          </span>
        </button>

        {/* Desktop Nav Links - Public Only (NO PORTAL/ADMIN) */}
        <nav className="hidden md:flex items-center space-x-8">
          <button
            onClick={() => scrollToSection('about')}
            className="font-heading text-xs uppercase tracking-[0.2em] text-[#F0E6FA]/80 hover:text-[#D4AF37] transition-colors cursor-pointer"
          >
            Story
          </button>
          <button
            onClick={() => scrollToSection('lineup')}
            className="font-heading text-xs uppercase tracking-[0.2em] text-[#F0E6FA]/80 hover:text-[#D4AF37] transition-colors cursor-pointer"
          >
            Lineup
          </button>
          <button
            onClick={() => scrollToSection('ticket-section')}
            className="font-heading text-xs uppercase tracking-[0.2em] text-[#F0E6FA]/80 hover:text-[#D4AF37] transition-colors cursor-pointer"
          >
            Tickets
          </button>
          <button
            onClick={() => scrollToSection('charity')}
            className="font-heading text-xs uppercase tracking-[0.2em] text-[#F0E6FA]/80 hover:text-[#D4AF37] transition-colors cursor-pointer"
          >
            Cause
          </button>
          <button
            onClick={() => scrollToSection('faq')}
            className="font-heading text-xs uppercase tracking-[0.2em] text-[#F0E6FA]/80 hover:text-[#D4AF37] transition-colors cursor-pointer"
          >
            FAQ
          </button>
          <button
            onClick={() => scrollToSection('contact')}
            className="font-heading text-xs uppercase tracking-[0.2em] text-[#F0E6FA]/80 hover:text-[#D4AF37] transition-colors cursor-pointer"
          >
            Contact
          </button>
        </nav>

        {/* Right CTA button */}
        <div className="hidden md:flex items-center space-x-4">
          <button
            onClick={() => scrollToSection('ticket-section')}
            className="flex items-center gap-2 px-5 py-2 rounded-full font-heading text-xs tracking-[0.15em] font-bold uppercase text-[#0D0518] bg-gradient-to-r from-[#D4AF37] via-[#FFB3D9] to-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.4)] hover:shadow-[0_0_25px_rgba(224,102,255,0.7)] transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>Get Ticket</span>
          </button>
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center gap-3">
          <button
            onClick={() => scrollToSection('ticket-section')}
            className="px-3 py-1.5 rounded-full font-heading text-[10px] tracking-wider font-bold uppercase text-[#0D0518] bg-[#D4AF37]"
          >
            Tickets
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-[#F0E6FA] hover:text-[#D4AF37] focus:outline-none cursor-pointer"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0D0518]/98 border-b border-[#D4AF37]/30 px-6 py-6 space-y-4 shadow-2xl">
          <button
            onClick={() => scrollToSection('about')}
            className="block w-full text-left font-heading text-xs uppercase tracking-widest text-[#F0E6FA] hover:text-[#D4AF37]"
          >
            Story
          </button>
          <button
            onClick={() => scrollToSection('lineup')}
            className="block w-full text-left font-heading text-xs uppercase tracking-widest text-[#F0E6FA] hover:text-[#D4AF37]"
          >
            Lineup
          </button>
          <button
            onClick={() => scrollToSection('ticket-section')}
            className="block w-full text-left font-heading text-xs uppercase tracking-widest text-[#F0E6FA] hover:text-[#D4AF37]"
          >
            Tickets
          </button>
          <button
            onClick={() => scrollToSection('charity')}
            className="block w-full text-left font-heading text-xs uppercase tracking-widest text-[#F0E6FA] hover:text-[#D4AF37]"
          >
            Cause
          </button>
          <button
            onClick={() => scrollToSection('faq')}
            className="block w-full text-left font-heading text-xs uppercase tracking-widest text-[#F0E6FA] hover:text-[#D4AF37]"
          >
            FAQ
          </button>
          <button
            onClick={() => scrollToSection('contact')}
            className="block w-full text-left font-heading text-xs uppercase tracking-widest text-[#F0E6FA] hover:text-[#D4AF37]"
          >
            Contact
          </button>
        </div>
      )}
    </motion.header>
  );
};
