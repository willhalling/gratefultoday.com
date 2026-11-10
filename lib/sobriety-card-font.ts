import localFont from 'next/font/local';

/** Grandstander (SIL OFL 1.1) — rounded, hand-lettered card headline face. */
export const cardFont = localFont({
  src: '../public/fonts/grandstander-800.woff2',
  weight: '800',
  display: 'swap',
  fallback: ['ui-rounded', 'system-ui', 'sans-serif'],
});

/** Patrick Hand (SIL OFL 1.1) — handwritten inside message. */
export const cardInsideFont = localFont({
  src: '../public/fonts/patrick-hand-400.woff2',
  weight: '400',
  display: 'swap',
  fallback: ['ui-rounded', 'system-ui', 'sans-serif'],
});

// Photo-card lettering (all SIL OFL 1.1, self-hosted). Keyed like
// PHOTO_FONTS in lib/sobriety-card-photo-art.ts.
const dancingScript = localFont({ src: '../public/fonts/dancing-script-700.woff2', weight: '700', display: 'swap' });
const playfairDisplay = localFont({ src: '../public/fonts/playfair-display-700.woff2', weight: '700', display: 'swap' });
const bebasNeue = localFont({ src: '../public/fonts/bebas-neue-400.woff2', weight: '400', display: 'swap' });
const ibmPlexMono = localFont({ src: '../public/fonts/ibm-plex-mono-700.woff2', weight: '700', display: 'swap' });
const quicksand = localFont({ src: '../public/fonts/quicksand-700.woff2', weight: '700', display: 'swap' });
const oswald = localFont({ src: '../public/fonts/oswald-700.woff2', weight: '700', display: 'swap' });
const patrickHand = localFont({ src: '../public/fonts/patrick-hand-400.woff2', weight: '400', display: 'swap' });
const montserrat = localFont({ src: '../public/fonts/montserrat-700.woff2', weight: '700', display: 'swap' });
const raleway = localFont({ src: '../public/fonts/raleway-700.woff2', weight: '700', display: 'swap' });

export const photoCardFonts = {
  'dancing-script-700': dancingScript,
  'playfair-display-700': playfairDisplay,
  'bebas-neue-400': bebasNeue,
  'ibm-plex-mono-700': ibmPlexMono,
  'quicksand-700': quicksand,
  'oswald-700': oswald,
  'patrick-hand-400': patrickHand,
  'montserrat-700': montserrat,
  'raleway-700': raleway,
} as const;
