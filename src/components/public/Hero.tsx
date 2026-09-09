import React from 'react';
import { CinematicIntro } from './CinematicIntro';

interface HeroProps {
  onIntroComplete?: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onIntroComplete }) => {
  return (
    <section id="hero" className="relative w-full">
      {/* Full-screen Automatic Theatrical Opening Presentation */}
      <CinematicIntro onIntroComplete={onIntroComplete} />
    </section>
  );
};
