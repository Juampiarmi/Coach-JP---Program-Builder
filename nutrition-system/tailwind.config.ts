import type { Config } from 'tailwindcss';

/**
 * Design System oficial · Coach JP Nutrition (Tactical Luxury HUD).
 * Base #0B0F17 · superficies #131B2A · bordes blancos al 8 % · CTA naranja #F97316 · evidencia/datos cian #38BDF8.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        carbon: '#0B0F17',
        carbon2: '#0E1420',
        panel: '#131B2A',
        panel2: '#0F1623',
        line: 'rgba(255,255,255,0.08)',
        line2: 'rgba(255,255,255,0.12)',
        cyan: { hud: '#38BDF8' },
        fire: { DEFAULT: '#F97316', hot: '#FF5E1E', deep: '#E65100' },
        danger: '#EF4444',
        gold: '#FFD600',
        ink: '#FFFFFF',
        steel: '#94A3B8',
        mute: '#64748B',
      },
      fontFamily: {
        display: ['Inter', '"Geist Sans"', 'system-ui', 'sans-serif'],
        chakra: ['"Chakra Petch"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        sans: ['Inter', '"Geist Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        hud: '0 0 0 1px rgba(255,255,255,0.08)',
        fire: '0 0 0 1px rgba(249,115,22,.55), 0 0 18px -6px rgba(255,94,30,.55)',
        cyan: '0 0 0 1px rgba(56,189,248,.45), 0 0 14px -6px rgba(56,189,248,.6)',
        gold: '0 0 0 1px rgba(255,214,0,.3)',
      },
    },
  },
  plugins: [],
};
export default config;
