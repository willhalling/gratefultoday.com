import type { Metadata } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import { Crisp, GoogleAnalytics } from '@/components/analytics';

import '../global.css';

const serif = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', display: 'swap' });
const sans = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

const title = 'GratefulToday — Personalised Christmas thank-you videos';
const description =
  'A short narrated Christmas video that says thank you properly: to the teacher, nurse or carer who made this year better. Approve every word, send it in minutes.';

export const metadata: Metadata = {
  metadataBase: new URL('https://gratefultoday.com'),
  title,
  description,
  openGraph: {
    title,
    description,
    url: 'https://gratefultoday.com',
    siteName: 'GratefulToday',
    locale: 'en_GB',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title, description },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${serif.variable} ${sans.variable}`}>
      <body>
        {children}
        <Crisp id="624c1899-40af-4000-95a6-47afdff528da" />
        <GoogleAnalytics id={process.env.NEXT_PUBLIC_GA_ID} />
      </body>
    </html>
  );
}
