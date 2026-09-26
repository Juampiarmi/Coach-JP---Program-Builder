import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Coach JP · High Performance System',
  description:
    'Tactical Command Builder de bioenergética aplicada y prescripción de macronutrientes asistida por IA · @coachjp.training',
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 120'%3E%3Cpath d='M50 3 L91 16 Q95 17.5 95 22 L95 57 C95 86 75 105 50 117 C25 105 5 86 5 57 L5 22 Q5 17.5 9 16 Z' fill='%23FFD600'/%3E%3Cpath d='M57 25 L31 66 L47 66 L41 97 L70 51 L53 51 L61 25 Z' fill='%230B0B0B'/%3E%3C/svg%3E",
  },
};

export const viewport: Viewport = {
  themeColor: '#0B0E14',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap"
        />
      </head>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
