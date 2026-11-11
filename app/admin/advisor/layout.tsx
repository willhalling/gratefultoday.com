import type { Metadata, Viewport } from 'next';

// Lets the advisor be added to a phone's home screen and open full screen, like an app.
export const metadata: Metadata = {
  title: 'Advisor',
  manifest: '/advisor.webmanifest',
  appleWebApp: { capable: true, title: 'Advisor', statusBarStyle: 'default' },
  icons: { apple: '/advisor/apple-touch-icon.png' },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#fffdf9',
};

export default function AdvisorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
