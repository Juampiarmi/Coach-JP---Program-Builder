import type { Config } from 'tailwindcss';

/**
 * Design system Hotel GEA · Content Canvas.
 * Base carbón del logo (#212121) y noche (#121212), blanco puro del isotipo, acento rosa neón.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#212121',
        night: '#121212',
        carbon: '#1A1A1A',
        smoke: '#2B2B2B',
        line: 'rgba(255,255,255,0.08)',
        neon: { DEFAULT: '#FF2E88', magenta: '#E83CFF', cyan: '#2EF2FF', amber: '#FFB547' },
      },
      fontFamily: {
        display: ['Syncopate', 'sans-serif'],
        tech: ['Michroma', 'sans-serif'],
        sans: ['Manrope', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        neon: '0 0 0 1px rgba(255,46,136,.6), 0 0 22px -4px rgba(255,46,136,.7)',
      },
      borderColor: { line: 'rgba(255,255,255,0.08)' },
    },
  },
  plugins: [],
};
export default config;
