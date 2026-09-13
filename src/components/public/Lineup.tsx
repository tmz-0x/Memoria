import React, { useRef, useState, memo } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { SectionDivider } from './SectionDivider';
import { Sparkles, Star, Music, Award } from 'lucide-react';

export interface ArtistItem {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  role: string;
  genre: string;
  image: string;
  webpImage?: string;
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
  webpImage?: string | null;
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
 * Data-driven Artist List (Fix 9 & Fix 10)
 * Loaded with full names (First Name + Last Name) and optimized WebP/JPEG assets.
 */
export const LINEUP_ARTISTS: ArtistItem[] = [
  {
    id: 'ridma',
    firstName: 'RIDMA',
    lastName: 'WEERAWARDENA',
    name: 'RIDMA WEERAWARDENA',
    role: 'Featured Artist',
    genre: 'Contemporary Classical & Fusion',
    image: '/artists/Ridma.jpeg',
    webpImage: '/artists/Ridma.webp',
    tagline: 'Soul-stirring vocals & timeless melodies',
    objectPosition: '60% 25%',
  },
  {
    id: 'wasthi',
    firstName: 'WASTHI',
    lastName: '',
    name: 'WASTHI',
    role: 'Featured Artist',
    genre: 'Dynamic Pop & Folk Fusion Duo',
    image: '/artists/Wasthi.png',
    webpImage: '/artists/Wasthi.webp',
    tagline: 'High-energy anthems & theatrical presence',
    objectPosition: 'center top',
  },
  {
    id: 'krishan',
    firstName: 'KRISHAN',
    lastName: 'MAHESHAN',
    name: 'KRISHAN MAHESHAN',
    role: 'Featured Artist',
    genre: 'Fusion Pioneer & Urban Beats',
    image: '/artists/Krishan.jpeg',
    webpImage: '/artists/Krishan.webp',
    tagline: 'Rhythmic poetry & commanding stagecraft',
    objectPosition: 'center 20%',
  },
  {
    id: 'yashodha',
    firstName: 'YASHODHA',
    lastName: 'PRIYADARSHANI',
    name: 'YASHODHA PRIYADARSHANI',
    role: 'Featured Artist',
    genre: 'Acoustic Melody & Soul Vocalist',
    image: '/artists/Yashodha.jpeg',
    webpImage: '/artists/Yashodha.webp',
    tagline: 'Intimate vocal depth & evocative storytelling',
    objectPosition: 'center 20%',
  },
];

/**
 * Dedicated Band Configuration (Fix 9 & Fix 10)
 * Fitted with 3:2 photographic composition and WebP optimization.
 */
export const LINEUP_BAND: BandItem = {
  type: 'band',
  name: 'DIVINE',
  role: 'Official Concert Band',
  genre: 'Live Symphony & Modern Orchestration',
  description:
    'The master musicians delivering live orchestration, acoustic arrangements, and soaring symphonic backings for every performance on the Memoria’26 stage.',
  image: '/artists/band.png',
  webpImage: '/artists/band.webp',
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
}> = memo(({ artist, index, isStaggered }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 35 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, delay: index * 0.12, ease: 'easeOut' }}
      className={`relative group cursor-pointer ${isStaggered ? 'lg:translate-y-6' : ''}`}
    >
      {/* Outer Glow Aura (GPU-friendly transition) */}
      <div className="absolute -inset-2 bg-gradient-to-b from-[#E066FF]/20 via-[#D4AF37]/15 to-transparent rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Main Theatrical Portrait Frame (Fix 10, Sections 3-5) */}
      <div className="relative h-[440px] sm:h-[480px] lg:h-[550px] w-full rounded-2xl overflow-hidden bg-[#0D0518] border border-[#D4AF37]/35 group-hover:border-[#D4AF37] shadow-[0_10px_35px_rgba(0,0,0,0.8)] group-hover:shadow-[0_0_35px_rgba(224,102,255,0.35),0_0_50px_rgba(212,175,55,0.4)] transition-shadow duration-500 flex flex-col justify-end">
        {/* Antique Gold Corner Accents */}
        <CornerAccent position="tl" />
        <CornerAccent position="tr" />
        <CornerAccent position="bl" />
        <CornerAccent position="br" />

        {/* Large Portrait Artist Image Container with zero layout shift */}
        <div className="absolute inset-0 w-full h-full overflow-hidden bg-[#0D0518]">
          <picture>
            {!imgError && artist.webpImage && (
              <source type="image/webp" srcSet={artist.webpImage} />
            )}
            <img
              src={imgError ? '/assets/hero-stage-scene.jpg' : artist.image}
              alt={artist.name}
              onError={() => setImgError(true)}
              loading={index < 2 ? 'eager' : 'lazy'}
              decoding="async"
              width={400}
              height={550}
              style={{ objectPosition: artist.objectPosition || 'center top' }}
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 will-change-transform"
            />
          </picture>

          {/* Ambient Vignettes (Faces remain bright & visible; bottom transitions to dark stage) */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0D0518] via-[#0D0518]/70 via-35% to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0D0518]/45 via-transparent to-transparent h-24 pointer-events-none" />

          {/* Diagonal Light Shimmer Sweep on Hover (GPU transform only) */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none will-change-transform" />
        </div>

        {/* Top Tag: Performer Identification */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0D0518]/85 backdrop-blur-xs border border-[#D4AF37]/35 text-[9px] font-heading font-bold uppercase tracking-widest text-[#D4AF37] shadow-sm">
          <Sparkles className="w-2.5 h-2.5 text-[#D4AF37]" />
          <span>Stage Performer</span>
        </div>

        {/* Artist Name & Typography Composition (Fix 10, Sections 15-17) */}
        <div className="relative z-20 p-5 sm:p-6 pt-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-heading text-[10px] sm:text-[11px] font-bold tracking-[0.35em] text-[#D4AF37] uppercase">
              ARTIST
            </span>
            <div className="h-[1px] w-8 bg-gradient-to-r from-[#D4AF37] to-transparent" />
            <span className="text-[10px] font-heading font-medium tracking-[0.15em] text-[#FFB3D9] uppercase">
              {artist.role}
            </span>
          </div>

          <h3 className="font-heading font-black text-white tracking-[0.10em] sm:tracking-[0.12em] uppercase transition-all duration-300 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:via-[#FFB3D9] group-hover:to-[#D4AF37] drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] leading-tight break-words">
            <span className="block text-2xl sm:text-3xl">{artist.firstName}</span>
            {artist.lastName ? (
              <span className="block text-lg sm:text-xl font-bold tracking-[0.08em] sm:tracking-[0.10em] text-[#F0E6FA]/90 mt-0.5 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:via-[#FFB3D9] group-hover:to-[#D4AF37]">
                {artist.lastName}
              </span>
            ) : null}
          </h3>

          <p className="font-heading text-xs text-[#FF8FC7] uppercase tracking-[0.16em] font-semibold mt-1.5">
            {artist.genre}
          </p>

          {artist.tagline && (
            <p className="font-body text-xs text-[#F0E6FA]/75 mt-2 line-clamp-1 font-light tracking-wide">
              {artist.tagline}
            </p>
          )}

          {/* Bottom Accent Bar */}
          <div className="mt-4 pt-3 border-t border-[#D4AF37]/20 flex items-center justify-between text-[10px] font-heading text-[#D4AF37]/80 group-hover:text-[#D4AF37] transition-colors">
            <span className="tracking-[0.2em] uppercase font-semibold">Live on Stage</span>
            <Star className="w-3 h-3 fill-[#D4AF37]/40 group-hover:fill-[#D4AF37] transition-colors" />
          </div>
        </div>
      </div>
    </motion.div>
  );
});

ArtistCard.displayName = 'ArtistCard';

const BandCard: React.FC<{ band: BandItem }> = memo(({ band }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, delay: 0.15 }}
      className="relative group w-full"
    >
      {/* Outer Glow Aura */}
      <div className="absolute -inset-3 bg-gradient-to-r from-[#E066FF]/20 via-[#D4AF37]/20 to-[#C04ECF]/20 rounded-3xl blur-2xl opacity-60 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Main Theatrical Container */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#1A0D2E]/95 via-[#23103B]/90 to-[#0D0518]/95 border-2 border-[#D4AF37]/50 group-hover:border-[#D4AF37] shadow-[0_0_40px_rgba(212,175,55,0.25)] group-hover:shadow-[0_0_60px_rgba(224,102,255,0.45)] transition-shadow duration-500">
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
                <span>Live Orchestration</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-heading text-xs font-bold tracking-[0.4em] text-[#D4AF37] uppercase">
                  BAND
                </span>
                <div className="h-[1px] w-12 bg-gradient-to-r from-[#D4AF37] to-transparent" />
              </div>

              <h3 className="font-heading text-3xl sm:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-[#FFB3D9] to-[#D4AF37] tracking-[0.16em] uppercase mt-2 drop-shadow-[0_2px_15px_rgba(224,102,255,0.4)]">
                {band.name}
              </h3>

              <p className="font-heading text-xs sm:text-sm text-[#FF8FC7] uppercase tracking-[0.18em] font-semibold mt-2">
                {band.role} &bull; {band.genre}
              </p>

              <p className="font-body text-xs sm:text-sm text-[#F0E6FA]/80 mt-4 leading-relaxed font-light max-w-md">
                {band.description}
              </p>
            </div>

            <div className="pt-4 border-t border-[#D4AF37]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-heading text-[#D4AF37]">
              <span className="tracking-widest uppercase flex items-center gap-2 font-semibold">
                <Award className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <span>Full Symphony Synchronization</span>
              </span>
              <span className="text-[#FFB3D9] font-bold tracking-wider">
                Memoria Mainstage
              </span>
            </div>
          </div>

          {/* Right Column: Band Visual Showcase / Placeholder (Fix 10, Sections 12-14) */}
          <div className="lg:col-span-7 w-full">
            {band.image ? (
              // When band photograph is provided: Frame accurately maintains 3:2 photographic aspect ratio
              <div className="relative aspect-[16/10] sm:aspect-[3/2] w-full max-h-[380px] lg:max-h-[420px] rounded-2xl overflow-hidden border border-[#D4AF37]/50 shadow-2xl bg-[#0D0518]">
                <picture>
                  {band.webpImage && (
                    <source type="image/webp" srcSet={band.webpImage} />
                  )}
                  <img
                    src={band.image}
                    alt={band.name}
                    loading="lazy"
                    decoding="async"
                    width={640}
                    height={426}
                    className="w-full h-full object-cover object-[center_35%] group-hover:scale-105 transition-transform duration-700 will-change-transform"
                  />
                </picture>
                <div className="absolute inset-0 bg-gradient-to-t from-[#0D0518] via-transparent to-transparent pointer-events-none" />
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
});

BandCard.displayName = 'BandCard';

export const Lineup: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);

  // Fix 10: Smooth, GPU-efficient scroll-linked theatrical spotlights
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 28,
    restDelta: 0.005,
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
      {/* System of TWO OPPOSING THEATRICAL SPOTLIGHTS (GPU-accelerated without heavy drop-shadow filter) */}
      {/* Spotlight 1: Originating from the LEFT */}
      <motion.div
        style={{
          opacity: leftSpotlightOpacity,
          rotate: leftSpotlightRotate,
          x: leftSpotlightX,
          transformOrigin: 'top left',
        }}
        className="pointer-events-none absolute -top-24 -left-12 w-[85vw] sm:w-[55vw] h-[120vh] mix-blend-screen z-0 will-change-transform"
      >
        <img
          src="/assets/spotlight-beam.png"
          alt="Lineup Left Spotlight"
          className="w-full h-full object-fill opacity-80 md:opacity-95"
        />
        {/* Hardware-accelerated ambient theatrical glow halo */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-[#E066FF]/20 rounded-full blur-3xl pointer-events-none" />
      </motion.div>

      {/* Spotlight 2: Originating from the RIGHT */}
      <motion.div
        style={{
          opacity: rightSpotlightOpacity,
          rotate: rightSpotlightRotate,
          x: rightSpotlightX,
          transformOrigin: 'top right',
        }}
        className="pointer-events-none absolute -top-24 -right-12 w-[85vw] sm:w-[55vw] h-[120vh] mix-blend-screen z-0 will-change-transform"
      >
        <img
          src="/assets/spotlight-beam.png"
          alt="Lineup Right Spotlight"
          className="w-full h-full object-fill opacity-80 md:opacity-95 -scale-x-100"
        />
        {/* Hardware-accelerated ambient theatrical glow halo */}
        <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-[#D4AF37]/20 rounded-full blur-3xl pointer-events-none" />
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

        {/* Theatrical Editorial Artist Composition */}
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

          {/* Dedicated Band Showcase (Fix 10): DIVINE */}
          <BandCard band={LINEUP_BAND} />
        </div>
      </div>
    </section>
  );
};
