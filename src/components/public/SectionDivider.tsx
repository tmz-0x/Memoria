import React from 'react';
import { motion } from 'framer-motion';

export const SectionDivider: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`relative w-full max-w-5xl mx-auto py-8 sm:py-12 flex items-center justify-center overflow-hidden pointer-events-none ${className}`}>
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        whileInView={{ scaleX: 1, opacity: 1 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.65, ease: 'easeOut' }}
        className="w-full flex items-center justify-center will-change-transform"
      >
        <img
          src="/assets/gold-blossom-divider.png"
          alt="Theatrical Scene Divider"
          className="w-full max-w-3xl h-auto object-contain filter drop-shadow-[0_0_12px_rgba(212,175,55,0.4)]"
        />
      </motion.div>
    </div>
  );
};
