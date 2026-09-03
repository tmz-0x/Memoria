import React from 'react';
import { ParticleField } from '../components/public/ParticleField';
import { Hero } from '../components/public/Hero';
import { About } from '../components/public/About';
import { Lineup } from '../components/public/Lineup';
import { TicketInfo } from '../components/public/TicketInfo';
import { HowToBuy } from '../components/public/HowToBuy';
import { TicketForm } from '../components/public/TicketForm';
import { FAQ } from '../components/public/FAQ';
import { Charity } from '../components/public/Charity';
import { Contact } from '../components/public/Contact';
import { Footer } from '../components/public/Footer';

export const PublicHome: React.FC = () => {
  return (
    <div className="relative min-h-screen bg-[#0D0518] text-[#F0E6FA] overflow-x-hidden">
      {/* ParticleField mounted once at root (Section 29) */}
      <ParticleField />

      {/* Hero & Scroll-Driven Theatrical Intro (Phases 1 & 2) */}
      <Hero />

      {/* Main Story & Experiences */}
      <main className="relative z-20">
        <About />
        <Lineup />
        <TicketInfo />
        <HowToBuy />
        <TicketForm />
        <Charity />
        <FAQ />
        <Contact />
      </main>

      <Footer />
    </div>
  );
};
