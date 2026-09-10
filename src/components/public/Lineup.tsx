import React, { useRef, useState } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { SectionDivider } from './SectionDivider';
import { Sparkles, Star, Music, Award } from 'lucide-react';

export interface ArtistItem {
  id: string;
  name: string;
  role: string;
  genre: string;
  image: string;
  tagline?: string;
  objectPosition?: string;
}

// Backward-compatibility alias
export type ArtistAct = ArtistItem;

export interface BandItem {
  type: 'band';
  name: string;
  role: string;
  genre: string;
  description: string;
  image: string | null;
}

/**
 * Normalizes an artist filename into a clean display title:
 * Removes extension, replaces hyphens/underscores, and formats uppercase.
 */
export function normalizeArtistName(filename: string): string {
  const base = filename.split('/').pop()?.replace(/\.[^/.]+$/, '') || filename;
  return base.replace(/[_-]/g, ' ').toUpperCase();
}

/**
 * Data-driven Artist List (Fix 9, Section 1 & 2)
 * Loaded from images in /public/artists/
 * To add another artist, simply append a new object to this array.
 */
export const LINEUP_ARTISTS: ArtistItem[] = [
  {
    id: 'ridma',
    name: 'RIDMA',
    role: 'Featured Artist',
    genre: 'Contemporary Classical & Fusion',
    image: '/artists/Ridma.jpeg',
    tagline: 'Soul-stirring vocals & timeless melodies',
    objectPosition: '60% 25%',
  },
  {
    id: 'wasthi',
    name: 'WASTHI',
    role: 'Featured Artist',
    genre: 'Dynamic Pop & Folk Fusion Duo',
    image: '/artists/Wasthi.png',
    tagline: 'High-energy anthems & theatrical presence',
    objectPosition: 'center 15%',
  },
  {
    id: 'krishan',
    name: 'KRISHAN',
    role: 'Featured Artist',
    genre: 'Fusion Pioneer & Urban Beats',
    image: '/artists/Krishan.jpeg',
    tagline: 'Rhythmic poetry & commanding stagecraft',
    objectPosition: 'center 20%',
  },
  {
    id: 'yashodha',
    name: 'YASHODHA',
    role: 'Featured Artist',
    genre: 'Acoustic Melody & Soul Vocalist',
    image: '/artists/Yashodha.jpeg',
    tagline: 'Intimate vocal depth & evocative storytelling',
    objectPosition: 'center 20%',
  },
];

/**
 * Dedicated Band Configuration (Fix 9, Section 11 & 12)
 * Currently set with image: null to display the designed placeholder.
 * When the DIVINE band image is uploaded to e.g. '/artists/divine.jpg',
 * setting image here will automatically switch from the placeholder to the photo.
 */
export const LINEUP_BAND: BandItem = {
  type: 'band',
  name: 'DIVINE',
  role: 'Official Concert Band',
  genre: 'Live Symphony & Modern Orchestration',
  description:
    'The master musicians delivering live orchestration, acoustic arrangements, and soaring symphonic backings for every performance on the Memoria’26 stage.',
  image: null,
};

const CornerAccent: React.FC<{ position: 'tl' | 'tr' | 'bl' | 'br' }> = ({ position }) => {
  const posClasses = {
    tl: 'top-2.5 left-2.5',
    tr: 'top-2.5 right-2.5 rotate-90',
    bl: 'bottom-2.5 left-2.5 -rotate-90',
    br: 'bottom-2.5 right-2.5 rotate-180',
  }[position];

  return (
    <div
      className={`absolute ${posClasses} w-3.5 h-3.5 pointer-events-none z-20 opacity-70 group-hover:opacity-100 transition-opacity duration-300`}
    >
      <div className="w-full h-[1.5px] bg-[#D4AF37]" />
      <div className="w-[1.5px] h-full bg-[#D4AF37]" />
    </div>
  );
};

const ArtistCard: React.FC<{
  artist: ArtistItem;
  index: number;
  isStaggered?: boolean;
}> = ({ artist, index, isStaggered }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 35 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.7, delay: index * 0.15, ease: 'easeOut' }}
      className={`relative group cursor-pointer ${isStaggered ? 'lg:translate-y-6' : ''}`}
    >
      {/* Outer Glow Aura */}
      <div className="absolute -inset-2 bg-gradient-to-b from-[#E066FF]/20 via-[#D4AF37]/15 to-transparent rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-700 pointer-events-none" />

      {/* Main Theatrical Portrait Frame (Fix 9, Section 4 & 5) */}
      <div className="relative h-[480px] sm:h-[520px] lg:h-[550px] w-full rounded-2xl overflow-hidden bg-[#0D0518] border border-[#D4AF37]/35 group-hover:border-[#D4AF37] shadow-[0_10px_35px_rgba(0,0,0,0.8)] group-hover:shadow-[0_0_35px_rgba(224,102,255,0.35),0_0_50px_rgba(212,175,55,0.4)] transition-all duration-500 flex flex-col justify-end">
        {/* Antique Gold Corner Accents */}
        <CornerAccent position="tl" />
        <CornerAccent position="tr" />
        <CornerAccent position="bl" />
        <CornerAccent position="br" />

        {/* Large Portrait Artist Image */}
        <div className="absolute inset-0 w-full h-full overflow-hidden bg-[#0D0518]">
          <img
            src={imgError ? '/assets/hero-stage-scene.jpg' : artist.image}
            alt={artist.name}
            onError={() => setImgError(true)}
            loading="lazy"
            style={{ objectPosition: artist.objectPosition || 'center top' }}
            className="w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-105 group-hover:brightness-110 will-change-transform"
          />

          {/* Ambient Vignettes (Faces remain bright & visible; bottom transitions to dark stage) */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0D0518] via-[#0D0518]/70 via-35% to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0D0518]/45 via-transparent to-transparent h-24 pointer-events-none" />

          {/* Diagonal Light Shimmer Sweep on Hover (Fix 9, Section 7 & 8) */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
        </div>

        {/* Top Tag: Performer Identification */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0D0518]/85 backdrop-blur-xs border border-[#D4AF37]/35 text-[9px] font-heading font-bold uppercase tracking-widest text-[#D4AF37] shadow-sm">
          <Sparkles className="w-2.5 h-2.5 text-[#D4AF37]" />
          <span>Stage Performer</span>
        </div>

        {/* Artist Name & Typography Composition (Fix 9, Section 5) */}
        <div className="relative z-20 p-6 pt-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-heading text-[10px] sm:text-[11px] font-bold tracking-[0.35em] text-[#D4AF37] uppercase">
              ARTIST
            </span>
            <div className="h-[1px] w-8 bg-gradient-to-r from-[#D4AF37] to-transparent" />
            <span className="text-[10px] font-heading font-medium tracking-[0.15em] text-[#FFB3D9] uppercase">
              {artist.role}
            </span>
          </div>

          <h3 className="font-heading text-2xl sm:text-3xl font-black text-white tracking-[0.14em] uppercase transition-all duration-300 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:via-[#FFB3D9] group-hover:to-[#D4AF37] drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
            {artist.name}
          </h3>

          <p className="font-heading text-xs text-[#FF8FC7] uppercase tracking-[0.16em] font-semibold mt-1">
            {artist.genre}
          </p>

          {artist.tagline && (
            <p className="font-body text-xs text-[#F0E6FA]/75 mt-2 line-clamp-1 font-light tracking-wide">
              {artist.tagline}
            </p>
          )}

          {/* Bottom Accent Bar */}
          <div className="mt-4 pt-3 border-t border-[#D4AF37]/20 flex items-center justify-between text-[10px] font-heading text-[#D4AF37]/80 group-hover:text-[#D4AF37] transition-colors">
            <span className="tracking-[0.2em] uppercase font-semibold">Live at Nelum Pokuna</span>
            <Star className="w-3 h-3 fill-[#D4AF37]/40 group-hover:fill-[#D4AF37] transition-colors" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const BandCard: React.FC<{ band: BandItem }> = ({ band }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.7, delay: 0.2 }}
      className="relative group w-full"
    >
      {/* Outer Glow Aura */}
      <div className="absolute -inset-3 bg-gradient-to-r from-[#E066FF]/20 via-[#D4AF37]/20 to-[#C04ECF]/20 rounded-3xl blur-2xl opacity-60 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

      {/* Main Theatrical Container (Fix 9, Section 11 & 12) */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#1A0D2E]/95 via-[#23103B]/90 to-[#0D0518]/95 border-2 border-[#D4AF37]/50 group-hover:border-[#D4AF37] shadow-[0_0_40px_rgba(212,175,55,0.25)] group-hover:shadow-[0_0_60px_rgba(224,102,255,0.45)] transition-all duration-500">
        {/* Filigree Texture Overlay */}
        <img
          src="/assets/ticket-frame.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-25 mix-blend-screen pointer-events-none"
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center p-6 sm:p-10 relative z-10">
          {/* Left Column: Band Details */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0D0518]/90 border border-[#D4AF37]/60 text-xs font-heading font-extrabold uppercase tracking-widest text-[#D4AF37] mb-4 shadow-sm">
                <Music className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Live Orchestration &amp; Band</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-heading text-xs font-bold tracking-[0.4em] text-[#D4AF37] uppercase">
                  BAND
                </span>
                <div className="h-[1px] w-12 bg-gradient-to-r from-[#D4AF37] to-transparent" />
              </div>

              <h3 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-[#FFB3D9] to-[#D4AF37] tracking-[0.18em] uppercase mt-2 drop-shadow-[0_2px_15px_rgba(224,102,255,0.4)]">
                {band.name}
              </h3>

              <p className="font-heading text-sm text-[#FF8FC7] uppercase tracking-[0.2em] font-semibold mt-2">
                {band.role} &bull; {band.genre}
              </p>

              <p className="font-body text-xs sm:text-sm text-[#F0E6FA]/80 mt-4 leading-relaxed font-light max-w-md">
                {band.description}
              </p>
            </div>

            <div className="pt-4 border-t border-[#D4AF37]/25 flex items-center justify-between text-xs font-heading text-[#D4AF37]">
              <span className="tracking-widest uppercase flex items-center gap-2 font-semibold">
                <Award className="w-4 h-4 text-[#D4AF37]" />
                Full Symphony Synchronization
              </span>
              <span className="text-[#FFB3D9] font-bold tracking-wider">
                Nelum Pokuna Mainstage
              </span>
            </div>
          </div>

          {/* Right Column: Band Visual Showcase / Placeholder (Section 11 & 12) */}
          <div className="lg:col-span-7 w-full">
            {band.image ? (
              // When band photograph is provided:
              <div className="relative h-72 sm:h-80 w-full rounded-2xl overflow-hidden border border-[#D4AF37]/50 shadow-2xl bg-[#0D0518]">
                <img
                  src={band.image}
                  alt={band.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0D0518] via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-4 left-4 z-10">
                  <span className="font-heading text-xs uppercase tracking-widest text-[#D4AF37] font-bold">
                    Official Band Photograph
                  </span>
                </div>
              </div>
            ) : (
              // Section 11 & 12: Premium Designed Band Image Upload Placeholder
              <div className="relative h-64 sm:h-76 w-full rounded-2xl overflow-hidden border border-dashed border-[#D4AF37]/60 bg-[#0D0518]/80 p-6 flex flex-col items-center justify-center text-center group-hover:border-[#D4AF37] transition-all duration-500 shadow-inner">
                {/* Subtle Radial Glow */}
                <div className="absolute inset-0 bg-gradient-radial from-[#C04ECF]/20 via-transparent to-transparent pointer-events-none" />

                {/* Animated Sound Wave / Instrument Emblem */}
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1A0D2E] to-[#0D0518] border border-[#D4AF37]/70 p-3.5 flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.4)] mb-4 group-hover:scale-110 transition-transform">
                  <Music className="w-8 h-8 text-[#D4AF37] animate-pulse" />
                </div>

                <span className="text-[10px] font-heading font-extrabold uppercase tracking-[0.3em] text-[#D4AF37]">
                  BAND IMAGE UPLOAD PLACEHOLDER
                </span>

                <h4 className="font-heading text-xl sm:text-2xl font-bold text-white tracking-[0.15em] uppercase mt-1">
                  DIVINE BAND PORTRAIT
                </h4>

                <p className="font-body text-xs text-[#F0E6FA]/70 max-w-sm mt-2 leading-relaxed font-light">
                  Official full-band ensemble photography will be unveiled as live stage rehearsals commence.
                </p>

                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[10px] font-heading font-semibold uppercase tracking-widest text-[#FFB3D9]">
                  <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                  <span>Awaiting Official Rehearsal Shoot</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export const Lineup: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);

  // Fix 9, Section 9: Preserved System of TWO OPPOSING THEATRICAL SPOTLIGHTS
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 75,
    damping: 24,
    restDelta: 0.001,
  });

  // Left Spotlight: Sweeps from top-left across the artists
  const leftSpotlightOpacity = useTransform(smoothProgress, [0, 0.45, 1], [0.85, 0.65, 0.4]);
  const leftSpotlightRotate = useTransform(smoothProgress, [0, 1], [-22, -10]);
  const leftSpotlightX = useTransform(smoothProgress, [0, 1], ['-15%', '15%']);

  // Right Spotlight: Sweeps from top-right across the artists
  const rightSpotlightOpacity = useTransform(smoothProgress, [0, 0.55, 1], [0.4, 0.65, 0.85]);
  const rightSpotlightRotate = useTransform(smoothProgress, [0, 1], [10, 22]);
  const rightSpotlightX = useTransform(smoothProgress, [0, 1], ['-15%', '15%']);

  return (
    <section
      ref={sectionRef}
      id="lineup"
      className="relative py-28 px-4 sm:px-6 lg:px-8 bg-transparent overflow-hidden"
    >
      {/* Fix Pass 5: System of TWO OPPOSING THEATRICAL SPOTLIGHTS (Section 18) */}
      {/* Spotlight 1: Originating from the LEFT */}
      <motion.div
        style={{
          opacity: leftSpotlightOpacity,
          rotate: leftSpotlightRotate,
          x: leftSpotlightX,
          transformOrigin: 'top left',
        }}
        className="pointer-events-none absolute -top-24 -left-12 w-[80vw] sm:w-[55vw] h-[130vh] mix-blend-screen z-0 will-change-transform"
      >
        <img
          src="/assets/spotlight-beam.png"
          alt="Lineup Left Spotlight"
          className="w-full h-full object-fill opacity-90 filter drop-shadow-[0_0_60px_#E066FF]"
        />
      </motion.div>

      {/* Spotlight 2: Originating from the RIGHT */}
      <motion.div
        style={{
          opacity: rightSpotlightOpacity,
          rotate: rightSpotlightRotate,
          x: rightSpotlightX,
          transformOrigin: 'top right',
        }}
        className="pointer-events-none absolute -top-24 -right-12 w-[80vw] sm:w-[55vw] h-[130vh] mix-blend-screen z-0 will-change-transform"
      >
        <img
          src="/assets/spotlight-beam.png"
          alt="Lineup Right Spotlight"
          className="w-full h-full object-fill opacity-90 -scale-x-100 filter drop-shadow-[0_0_60px_#D4AF37]"
        />
      </motion.div>

      <div className="relative z-10 max-w-7xl mx-auto">
        <SectionDivider />

        {/* Theatrical Lineup Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.span
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-heading text-xs tracking-[0.35em] text-[#D4AF37] uppercase font-bold inline-flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            ACT II — THE PERFORMANCE
            <Sparkles className="w-3.5 h-3.5" />
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-heading text-3xl sm:text-5xl font-extrabold uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#F0E6FA] via-[#FF8FC7] to-[#D4AF37] mt-3"
          >
            Artist Lineup
          </motion.h2>

          <p className="font-body text-base text-[#F0E6FA]/70 mt-4 font-light">
            Four voices, one night — each artist bringing their own sound to the stage.
          </p>
        </div>

        {/* Fix 9, Section 3 & 6: Theatrical Editorial Artist Composition */}
        <div className="space-y-16">
          {/* 4-Artist Editorial Poster Grid (Desktop: 4 staggered cards, Tablet: 2x2, Mobile: Stacked) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 items-start">
            {LINEUP_ARTISTS.map((artist, index) => (
              <ArtistCard
                key={artist.id}
                artist={artist}
                index={index}
                isStaggered={index % 2 === 1}
              />
            ))}
          </div>

          {/* Dedicated Band Showcase (Fix 9, Section 11 & 12): DIVINE */}
          <BandCard band={LINEUP_BAND} />
        </div>
      </div>
    </section>
  );
};
