import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        carbon: '#0B0E14',
        panel: '#121820',
        panel2: '#0F141B',
        line: '#1F2937',
        line2: '#263342',
        cyan: { hud: '#00E5FF' },
        fire: '#FF6B00',
        gold: '#FFD600',
        ink: '#F9FAFB',
        steel: '#8A99AD',
      },
      fontFamily: {
        display: ['"Chakra Petch"', '"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        sans: ['"Inter"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        hud: '0 0 0 1px #1F2937, 0 20px 60px -30px rgba(0,229,255,.25)',
        fire: '0 0 24px -6px rgba(255,107,0,.7)',
        gold: '0 0 24px -6px rgba(255,214,0,.55)',
      },
    },
  },
  plugins: [],
};
export default config;
