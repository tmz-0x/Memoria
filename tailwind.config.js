/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        memoria: {
          bg: '#1A0D2E',
          'bg-deep': '#0D0518',
          'glow-primary': '#C04ECF',
          'glow-secondary': '#E066FF',
          'gold-start': '#C9A227',
          gold: '#D4AF37',
          'pink-start': '#FF8FC7',
          pink: '#FFB3D9',
          text: '#F0E6FA',
        },
      },
      fontFamily: {
        wordmark: ['"Great Vibes"', 'cursive'],
        heading: ['"Montserrat"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
      },
      boxShadow: {
        'glow-gold': '0 0 25px rgba(212, 175, 55, 0.45)',
        'glow-magenta': '0 0 35px rgba(224, 102, 255, 0.5)',
        'glow-theatrical': '0 0 50px rgba(192, 78, 207, 0.35)',
      },
    },
  },
  plugins: [],
};
