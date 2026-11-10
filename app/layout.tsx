import type { Metadata } from "next";
import {
  Crisp,
  GoogleAnalytics,
  HeroUIThemeProvider,
} from "@/components/shared-ui";
import { AuthUserProvider } from "@/context/AuthUserContext";

import "../global.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://gratefultoday.com"),
  title: "Grateful Today — One day. One thing.",
  description:
    "A simple daily gratitude practice, a supportive community wall, and colourful sobriety chips and cards for the days that count.",
  keywords:
    "daily gratitude, gratitude wall, sobriety chips, recovery tools, sobriety cards, sobriety milestones, grateful living, recovery support",
  openGraph: {
    title: "Grateful Today — One day. One thing.",
    description:
      "Daily gratitude, a supportive wall, and personal sobriety chips and cards for the days that count.",
    url: "https://gratefultoday.com",
    siteName: "Grateful Today",
    images: [
      {
        url: "/grateful-today-hero.png",
        width: 1200,
        height: 630,
        alt: "Grateful Today — One day. One thing.",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Grateful Today — One day. One thing.",
    description:
      "Daily gratitude and personal sobriety milestones, one day at a time.",
    images: ["/grateful-today-hero.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
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
      <body className="bg-primary-100 text-neutral-900">
        <HeroUIThemeProvider>
          <AuthUserProvider>{children}</AuthUserProvider>
        </HeroUIThemeProvider>
      </body>
      <Crisp id="624c1899-40af-4000-95a6-47afdff528da" />
      <GoogleAnalytics id={process.env.NEXT_PUBLIC_GA_ID} />
    </html>
  );
}
