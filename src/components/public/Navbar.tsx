import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Ticket, Menu, X, ChevronRight } from 'lucide-react';

interface NavbarProps {
  forceVisible?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ forceVisible = false }) => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 80);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isVisible = forceVisible || scrolled;

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{
        opacity: isVisible ? 1 : 0,
        y: isVisible ? 0 : -20,
      }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      style={{ pointerEvents: isVisible ? 'auto' : 'none' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
        scrolled
          ? 'bg-[#0D0518]/92 backdrop-blur-md border-b border-[#D4AF37]/20 py-3 shadow-lg shadow-[#0D0518]/60'
          : 'bg-gradient-to-b from-[#0D0518]/80 to-transparent py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Wordmark */}
        <button
          type="button"
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
            type="button"
            onClick={() => scrollToSection('about')}
            className="font-heading text-xs uppercase tracking-[0.2em] text-[#F0E6FA]/80 hover:text-[#D4AF37] transition-colors cursor-pointer"
          >
            Story
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('lineup')}
            className="font-heading text-xs uppercase tracking-[0.2em] text-[#F0E6FA]/80 hover:text-[#D4AF37] transition-colors cursor-pointer"
          >
            Lineup
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('ticket-overview')}
            className="font-heading text-xs uppercase tracking-[0.2em] text-[#F0E6FA]/80 hover:text-[#D4AF37] transition-colors cursor-pointer"
          >
            Event Info
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('charity')}
            className="font-heading text-xs uppercase tracking-[0.2em] text-[#F0E6FA]/80 hover:text-[#D4AF37] transition-colors cursor-pointer"
          >
            Cause
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('faq')}
            className="font-heading text-xs uppercase tracking-[0.2em] text-[#F0E6FA]/80 hover:text-[#D4AF37] transition-colors cursor-pointer"
          >
            FAQ
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('contact')}
            className="font-heading text-xs uppercase tracking-[0.2em] text-[#F0E6FA]/80 hover:text-[#D4AF37] transition-colors cursor-pointer"
          >
            Contact
          </button>
        </nav>

        {/* Right CTA Button: Navigates to /tickets */}
        <div className="hidden md:flex items-center space-x-4">
          <button
            type="button"
            onClick={() => navigate('/tickets')}
            className="flex items-center gap-2 px-5 py-2 rounded-full font-heading text-xs tracking-[0.15em] font-bold uppercase text-[#0D0518] bg-gradient-to-r from-[#D4AF37] via-[#FFB3D9] to-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.4)] hover:shadow-[0_0_25px_rgba(224,102,255,0.7)] transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>Buy your Ticket &bull;</span>
          </button>
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/tickets')}
            className="px-3.5 py-1.5 min-h-[36px] rounded-full font-heading text-[11px] tracking-wider font-bold uppercase text-[#0D0518] bg-gradient-to-r from-[#D4AF37] to-[#FF8FC7] shadow-sm active:scale-95 transition-transform"
          >
            Tickets
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-[#F0E6FA] hover:text-[#D4AF37] rounded-xl hover:bg-white/5 active:bg-white/10 focus:outline-none transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-6 h-6 text-[#D4AF37]" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown with AnimatePresence & touch-friendly links */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="md:hidden overflow-hidden bg-[#0D0518]/98 backdrop-blur-xl border-b border-[#D4AF37]/30 shadow-2xl"
          >
            <div className="px-5 py-5 space-y-1">
              {[
                { id: 'about', label: 'Story' },
                { id: 'lineup', label: 'Lineup' },
                { id: 'ticket-overview', label: 'Event Info' },
                { id: 'charity', label: 'Cause' },
                { id: 'faq', label: 'FAQ' },
                { id: 'contact', label: 'Contact' },
              ].map((link) => (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => scrollToSection(link.id)}
                  className="w-full text-left py-3 px-3.5 rounded-xl font-heading text-xs uppercase tracking-[0.2em] font-semibold text-[#F0E6FA]/90 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 active:bg-[#D4AF37]/20 flex items-center justify-between transition-colors min-h-[44px]"
                >
                  <span>{link.label}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#D4AF37]/60" />
                </button>
              ))}

              <div className="pt-3 mt-2 border-t border-[#D4AF37]/20">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/tickets');
                  }}
                  className="w-full py-3.5 min-h-[44px] rounded-full font-heading text-xs uppercase tracking-[0.18em] font-bold text-[#0D0518] bg-gradient-to-r from-[#D4AF37] via-[#FFB3D9] to-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.4)] flex items-center justify-center gap-2 active:scale-98 transition-transform"
                >
                  <Ticket className="w-4 h-4" />
                  <span>Book Ticket &bull;</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};
