import { Crisp, GoogleAnalytics, HeroUIThemeProvider } from '@/components/shared-ui';
import GratefulTodayFooter from '@/components/footer';
import Nav from '@/components/nav';
import { AuthUserProvider } from '@/context/AuthUserContext';

import '../global.css';

export const metadata = {
  title: 'Grateful Today — Recovery & Gratitude Tools',
  description:
    'Celebrate your recovery journey with virtual sobriety chips, daily gratitude quotes, and tools designed to support your path to wellness. What are you grateful for today?',
  keywords:
    'sobriety chips, recovery tools, gratitude quotes, addiction recovery, sobriety milestones, grateful living, recovery support, virtual coins, sobriety anniversary',
  openGraph: {
    title: 'Grateful Today — Recovery & Gratitude Tools',
    description:
      'Celebrate your recovery journey with virtual sobriety chips, daily gratitude quotes, and tools designed to support your path to wellness.',
    url: 'https://gratefultoday.com',
    siteName: 'Grateful Today',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
        width: 1200,
        height: 630,
        alt: 'Grateful Today - Recovery & Gratitude Tools',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Grateful Today — Recovery & Gratitude Tools',
    description:
      'Celebrate your recovery journey with virtual sobriety chips, daily gratitude quotes, and tools designed to support your path to wellness.',
    images: [
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function Layout({ children }) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(h,o,t,j,a,r){
                  h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
                  h._hjSettings={hjid:6547917,hjsv:6};
                  a=o.getElementsByTagName('head')[0];
                  r=o.createElement('script');r.async=1;
                  r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
                  a.appendChild(r);
              })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
            `,
          }}
        />
      </head>
      <body>
        <HeroUIThemeProvider>
          <AuthUserProvider>{children}</AuthUserProvider>
        </HeroUIThemeProvider>
      </body>
      <Crisp id={'624c1899-40af-4000-95a6-47afdff528da'} />
      <GoogleAnalytics id={process.env.NEXT_PUBLIC_GA_ID} />
    </html>
  );
}
