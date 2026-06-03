'use client';

import { HeroUIProvider } from '@heroui/react';
import Script from 'next/script';
import { ReactNode } from 'react';

type HeroUIThemeProviderProps = {
  children: ReactNode;
};

type CrispProps = {
  id?: string;
};

type GoogleAnalyticsProps = {
  id?: string;
};

export function HeroUIThemeProvider({ children }: HeroUIThemeProviderProps) {
  return <HeroUIProvider>{children}</HeroUIProvider>;
}

export function Crisp({ id }: CrispProps) {
  if (!id) return null;

  const script = `
    window.$crisp = [];
    window.CRISP_WEBSITE_ID = "${id}";
    (function () {
      var d = document;
      var s = d.createElement('script');
      s.src = 'https://client.crisp.chat/l.js';
      s.async = 1;
      d.getElementsByTagName('head')[0].appendChild(s);
    })();
  `;

  return (
    <Script
      id="crisp"
      strategy="lazyOnload"
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}

export function GoogleAnalytics({ id }: GoogleAnalyticsProps) {
  if (!id) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${id}');
          `,
        }}
      />
    </>
  );
}