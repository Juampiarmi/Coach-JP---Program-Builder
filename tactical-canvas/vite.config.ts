import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Build relativo: la carpeta /canvas se sirve tal cual desde GitHub Pages
// (https://usuario.github.io/repo/canvas/) o desde cualquier hosting estático.
export default defineConfig({
  base: './',
  build: {
    outDir: '../canvas',
    emptyOutDir: true,
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'canvas-apple-touch-icon.png'],
      manifest: {
        name: 'JP Tactical Canvas',
        short_name: 'JP Canvas',
        description: 'Generador de placas tácticas para Instagram · Coach JP',
        lang: 'es-AR',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#0B0E14',
        theme_color: '#0B0E14',
        categories: ['productivity', 'design', 'fitness'],
        // Ícono propio (placa 4:5 + escudo) para no confundirse con el Builder en la pantalla de inicio
        icons: [
          { src: 'canvas-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'canvas-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'canvas-icon-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'canvas-icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2}'],
      },
    }),
  ],
})
