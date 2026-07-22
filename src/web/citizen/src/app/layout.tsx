import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CamTraffic Citizen',
  description: 'View fines, pay penalties, and manage appeals in Cambodia',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'CamTraffic',
  },
};

export const viewport: Viewport = {
  themeColor: '#1d4ed8',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="km">
      <body>{children}</body>
    </html>
  );
}
