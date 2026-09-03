import React from 'react';
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
  return (
    <div className="relative min-h-screen bg-[#0D0518] text-[#F0E6FA] overflow-x-hidden">
      {/* Universal Stardust Particle Canvas with subtle mouse-reactive inertia */}
      <ParticleField />

      {/* Scroll-Linked Public Navbar (Completely hidden on initial load) */}
      <Navbar />

      {/* Full-Screen Scroll-Controlled Theatrical Intro & Hero */}
      <Hero />

      {/* Main Theatrical Odyssey */}
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
