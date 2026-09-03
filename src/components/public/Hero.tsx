import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CinematicIntro } from './CinematicIntro';
import { Ticket, Menu, X, ShieldCheck } from 'lucide-react';

export const Hero: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 80);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section id="hero" className="relative w-full">
      {/* Floating Theatrical Navigation Bar */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-[#0D0518]/90 backdrop-blur-md border-b border-[#D4AF37]/20 py-3 shadow-lg shadow-[#0D0518]/50'
            : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Brand Wordmark */}
          <a
            href="#hero"
            className="group flex items-center gap-2 focus:outline-none"
          >
            <span className="font-wordmark text-3xl sm:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-[#FFF5F8] via-[#FF8FC7] to-[#D4AF37] group-hover:drop-shadow-[0_0_15px_#E066FF] transition-all">
              Memoria&apos;26
            </span>
          </a>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center space-x-8">
            <a
              href="#about"
              className="font-heading text-xs uppercase tracking-[0.2em] text-[#F0E6FA]/80 hover:text-[#D4AF37] transition-colors"
            >
              Story
            </a>
            <a
              href="#lineup"
              className="font-heading text-xs uppercase tracking-[0.2em] text-[#F0E6FA]/80 hover:text-[#D4AF37] transition-colors"
            >
              Lineup
            </a>
            <a
              href="#ticket-info"
              className="font-heading text-xs uppercase tracking-[0.2em] text-[#F0E6FA]/80 hover:text-[#D4AF37] transition-colors"
            >
              Tickets
            </a>
            <a
              href="#how-to-buy"
              className="font-heading text-xs uppercase tracking-[0.2em] text-[#F0E6FA]/80 hover:text-[#D4AF37] transition-colors"
            >
              How To Buy
            </a>
            <a
              href="#charity"
              className="font-heading text-xs uppercase tracking-[0.2em] text-[#F0E6FA]/80 hover:text-[#D4AF37] transition-colors"
            >
              Cause
            </a>
            <a
              href="#faq"
              className="font-heading text-xs uppercase tracking-[0.2em] text-[#F0E6FA]/80 hover:text-[#D4AF37] transition-colors"
            >
              FAQ
            </a>
          </nav>

          {/* Right Action buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              to="/login"
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-heading tracking-wider uppercase text-[#F0E6FA]/60 hover:text-[#D4AF37] transition-colors"
              title="Staff & Approver Portal"
            >
              <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
              <span>Portal</span>
            </Link>

            <a
              href="#ticket-form"
              className="flex items-center gap-2 px-5 py-2 rounded-full font-heading text-xs tracking-[0.15em] font-bold uppercase text-[#0D0518] bg-gradient-to-r from-[#D4AF37] via-[#FFB3D9] to-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.4)] hover:shadow-[0_0_25px_rgba(224,102,255,0.7)] transition-all hover:scale-105 active:scale-95"
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>Book Ticket</span>
            </a>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-3">
            <a
              href="#ticket-form"
              className="px-3 py-1.5 rounded-full font-heading text-[10px] tracking-wider font-bold uppercase text-[#0D0518] bg-[#D4AF37]"
            >
              Book
            </a>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#F0E6FA] hover:text-[#D4AF37] focus:outline-none"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0D0518]/98 border-b border-[#D4AF37]/30 px-6 py-6 space-y-4">
            <a
              href="#about"
              onClick={() => setMobileMenuOpen(false)}
              className="block font-heading text-xs uppercase tracking-widest text-[#F0E6FA] hover:text-[#D4AF37]"
            >
              Story
            </a>
            <a
              href="#lineup"
              onClick={() => setMobileMenuOpen(false)}
              className="block font-heading text-xs uppercase tracking-widest text-[#F0E6FA] hover:text-[#D4AF37]"
            >
              Lineup
            </a>
            <a
              href="#ticket-info"
              onClick={() => setMobileMenuOpen(false)}
              className="block font-heading text-xs uppercase tracking-widest text-[#F0E6FA] hover:text-[#D4AF37]"
            >
              Tickets
            </a>
            <a
              href="#how-to-buy"
              onClick={() => setMobileMenuOpen(false)}
              className="block font-heading text-xs uppercase tracking-widest text-[#F0E6FA] hover:text-[#D4AF37]"
            >
              How To Buy
            </a>
            <a
              href="#charity"
              onClick={() => setMobileMenuOpen(false)}
              className="block font-heading text-xs uppercase tracking-widest text-[#F0E6FA] hover:text-[#D4AF37]"
            >
              Cause
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block font-heading text-xs uppercase tracking-widest text-[#F0E6FA] hover:text-[#D4AF37]"
            >
              FAQ
            </a>
            <div className="pt-2 border-t border-[#D4AF37]/20 flex items-center justify-between">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 font-heading text-xs uppercase tracking-widest text-[#D4AF37]"
              >
                <ShieldCheck className="w-4 h-4" />
                Staff Portal
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Full-screen Scroll-driven Theatrical Intro Sequence */}
      <CinematicIntro />
    </section>
  );
};
