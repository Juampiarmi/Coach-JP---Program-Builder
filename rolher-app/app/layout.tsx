import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { AppShell } from '@/components/AppShell';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';

export const metadata: Metadata = {
  title: { default: 'RolHer App', template: '%s · RolHer' },
  description: 'Gestión financiera y control de flota · UBER · TRY · HOTEL',
  applicationName: 'RolHer',
  appleWebApp: { capable: true, title: 'RolHer', statusBarStyle: 'default' },
  formatDetection: { telephone: false },
  icons: { icon: '/icon.svg', apple: '/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f8fafc',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-AR">
      <body>
        <AppShell>{children}</AppShell>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
