import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ParticleField } from '../components/public/ParticleField';
import { Navbar } from '../components/public/Navbar';
import { Hero } from '../components/public/Hero';
import { About } from '../components/public/About';
import { Lineup } from '../components/public/Lineup';
import { TicketInfo } from '../components/public/TicketInfo';
import { Charity } from '../components/public/Charity';
import { FAQ } from '../components/public/FAQ';
import { Contact } from '../components/public/Contact';
import { Footer } from '../components/public/Footer';

export const PublicHome: React.FC = () => {
  const [introReady, setIntroReady] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // If loaded with a direct hash anchor (e.g., #lineup), immediately unlock rest of page
    if (window.location.hash && window.location.hash !== '#hero') {
      setIntroReady(true);
    }

    const handleScroll = () => {
      if (window.scrollY > 80) setScrolled(true);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const particlesActive = introReady || scrolled;

  return (
    <div
      className={`relative min-h-screen bg-[#0D0518] text-[#F0E6FA] ${
        !introReady ? 'h-screen overflow-hidden' : 'overflow-x-hidden'
      }`}
    >
      {/* Universal Stardust Particle Canvas (Inactive during intro, active once intro completes) */}
      <ParticleField enabled={particlesActive} />

      {/* Theatrical Navbar (Hidden during intro, reveals automatically once intro completes) */}
      <Navbar forceVisible={introReady} />

      {/* Full-screen Automatic Theatrical Opening Presentation */}
      <Hero onIntroComplete={() => setIntroReady(true)} />

      {/* Main Theatrical Odyssey: Only appears AFTER cinematic intro is done */}
      {introReady && (
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <main className="relative z-20">
            <About />
            <Lineup />
            <TicketInfo />
            <Charity />
            <FAQ />
            <Contact />
          </main>

          <Footer />
        </motion.div>
      )}
    </div>
  );
};
