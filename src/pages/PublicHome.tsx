import React, { useState } from 'react';
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

  return (
    <div className="relative min-h-screen bg-[#0D0518] text-[#F0E6FA] overflow-x-hidden">
      {/* Universal Stardust Particle Canvas with subtle mouse-reactive inertia */}
      <ParticleField />

      {/* Theatrical Navbar (Hidden during 3s anticipation, reveals automatically at t=8s) */}
      <Navbar forceVisible={introReady} />

      {/* Automatic Theatrical Opening Presentation & Hero (No scroll required) */}
      <Hero onIntroComplete={() => setIntroReady(true)} />

      {/* Main Theatrical Odyssey (User chooses to scroll) */}
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
