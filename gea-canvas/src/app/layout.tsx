import type { Metadata, Viewport } from 'next';
// Fuentes auto-alojadas: disponibles offline y garantizadas para el canvas (exportación idéntica a la vista).
import '@fontsource/syncopate/400.css';
import '@fontsource/syncopate/700.css';
import '@fontsource/michroma/400.css';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import '@fontsource/manrope/800.css';
import './globals.css';
import { PwaRegister } from '@/components/PwaRegister';

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export const metadata: Metadata = {
  title: 'GEA · Instagram Content Canvas',
  applicationName: 'GEA Content Canvas',
  description: 'Estudio táctico de contenido para Instagram de Hotel GEA: Stories, Reels y Feed con overlays neón, copys y exportación HD.',
  manifest: `${base}/manifest.webmanifest`,
  icons: {
    icon: [
      { url: `${base}/icons/favicon.svg`, type: 'image/svg+xml' },
      { url: `${base}/icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: `${base}/icons/apple-touch-icon.png`, sizes: '180x180' }],
  },
  appleWebApp: { capable: true, title: 'GEA Canvas', statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#121212',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="font-sans antialiased">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
