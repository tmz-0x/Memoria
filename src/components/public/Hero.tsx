import React from 'react';
import { CinematicIntro } from './CinematicIntro';

export const Hero: React.FC = () => {
  return (
    <section id="hero" className="relative w-full">
      {/* Full-screen Scroll-driven Theatrical Intro Sequence */}
      <CinematicIntro />
    </section>
  );
};
