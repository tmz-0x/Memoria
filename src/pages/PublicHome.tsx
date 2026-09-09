import React, { useState, useEffect } from 'react';
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
    const handleScroll = () => {
      if (window.scrollY > 80) setScrolled(true);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Section 13 & 14: Mouse-reactive dust particles are inactive during CinematicIntro anticipation,
  // and activate across the public sections once the hero settles or user scrolls
  const particlesActive = introReady || scrolled;

  return (
    <div className="relative min-h-screen bg-[#0D0518] text-[#F0E6FA] overflow-x-hidden">
      {/* Universal Stardust Particle Canvas (Inactive during 2s intro, active on main website) */}
      <ParticleField enabled={particlesActive} />

      {/* Theatrical Navbar (Hidden during 2s anticipation, reveals automatically) */}
      <Navbar forceVisible={particlesActive} />

      {/* Automatic Theatrical Opening Presentation & Hero (2s anticipation, fixed spotlight) */}
      <Hero onIntroComplete={() => setIntroReady(true)} />

      {/* Main Theatrical Odyssey (Normal user scrolling) */}
      <main className="relative z-20">
        <About />
        <Lineup />
        <TicketInfo />
        <Charity />
        <FAQ />
        <Contact />
      </main>

      <Footer />
    </div>
  );
};
