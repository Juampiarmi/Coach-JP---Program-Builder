import type { Config } from 'tailwindcss';

const config: Config = {
  // Evita estados hover "pegados" tras un toque en iOS/Android.
  future: { hoverOnlyWhenSupported: true },
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Series del gráfico de flujo (paleta validada para daltonismo).
        ingreso: '#0d9488',
        egreso: '#ea580c',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)',
      },
    },
  },
  plugins: [],
};

export default config;
