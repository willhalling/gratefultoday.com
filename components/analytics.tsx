'use client';

import { usePathname } from 'next/navigation';
import Script from 'next/script';

/** Crisp chat for buyers. Hidden on /admin. */
export function Crisp({ id }: { id?: string }) {
  const pathname = usePathname();
  if (!id || pathname?.startsWith('/admin')) return null;

  return (
    <Script
      id="crisp"
      strategy="lazyOnload"
      dangerouslySetInnerHTML={{
        __html: `window.$crisp=[];window.CRISP_WEBSITE_ID="${id}";(function(){var s=document.createElement('script');s.src='https://client.crisp.chat/l.js';s.async=1;document.head.appendChild(s);})();`,
      }}
    />
  );
}

export function GoogleAnalytics({ id }: { id?: string }) {
  if (!id) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');`,
        }}
      />
    </>
  );
}
