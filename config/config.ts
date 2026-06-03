export const ADMIN_UID = {
  fc: 'OuPXRURBSOQzqhylS9MWgaPBYJw2',
  sm: '',
};

export const SITE_NAME = {
  fc: 'Funeral Collage',
};

export const SITE_URL = {
  fc: 'https://funeralcollage.com/',
};

export const SITE_FOOTER_URL = {
  fc: 'FuneralCollage.com',
};

export const BLOG = {
  fc: {
    subtitle: 'Helpful content on how to use our funeral software.',
  },
};

export const CONTACT = {
  fc: {
    // intro: 'Here to assist during tough times.',
  },
};

export const ALGOLIA_APPLICATION_ID = {
  fc: '5QASCPPLTJ',
};

export const ALGOLIA_ADMIN_KEY = {
  fc: 'b14fd0e9adaabe83134a9809b22f115d',
};

// Professional Funeral Slideshow Videos

export const FOOTER = {
  sections: {
    fc: [
      {
        title: 'ABOUT FUNERAL COLLAGE',
        html: '<p>We create funeral slideshow software so you can create a professional memorial slideshow of your loved one.</p><p>We also have number of FREE funeral programme templates available to allow you to create an order of service for your funeral.</p><p>Read more <a href="/about">about us</a></p>',
      },
      {
        title: 'FUNERAL STATIONERY',
        html: '<p>We have a collection of Funeral Stationery for you to use. Our Order of Service programmes are 100% free of charge.</p><p>View <a href="/slideshow-templates">Funeral Slideshow templates</a></p>',
      },
      {
        title: 'FUNERAL BLOG',
        html: '<p>Video blog about how to use our funeral slideshow software.</p><p><a href="/blog/">View Blog</a></p>',
      },
    ],
  },
};

export const VIDEO_ORIENTATION = {
  landscape: {
    width: 1920,
    height: 1080,
  },
  portrait: {
    width: 1080,
    height: 1920,
  },
};

export const BOOKLET_SIZES = {
  a5: {
    width: 1748,
    height: 2480,
  },
};

export const STATIONERY_SIZES = {
  landscape: {
    width: 1920,
    height: 1080,
    label: 'web',
  },
  portrait: {
    width: 1920,
    height: 1080,
    label: 'web',
  },
  a2: {
    width: 4961,
    height: 7016,
    label: 'poster',
  },
  a1: {
    width: 7016,
    height: 9933,
    label: 'poster',
  },
  a0: {
    width: 14043,
    height: 9933,
    label: 'poster',
  },
};

export const TEMPLATE_STYLES = {
  landscape: {
    intro: {
      container: {
        flexDirection: 'row',
      },
      image: {
        borderRadius: 0,
        borderWidth: 0,
        borderColour: 'rgba(255, 255, 255, 0.5)',
        width: 960,
        height: 1080,
        left: 0,
        top: 0,
      },
      content: {
        alignItems: 'flex-start',
        paddingLeft: '960px',
        paddingTop: '0px',
        paddingOffset: '0 5rem',
        justifyContent: 'center',
        marginBottom: '5rem',
        width: '700px',
      },
    },
    outro: {
      content: {
        secondaryBackgroundColour: '',
      },
      image: {
        margin: '5rem auto',
      },
    },
  },
  portrait: {
    intro: {
      container: {
        flexDirection: 'column',
      },
      image: {
        borderRadius: 0,
        borderWidth: 0,
        borderColour: 'rgba(255, 255, 255, 0.5)',
        width: 1080,
        height: 1215,
        left: 0,
        top: 0,
      },
      content: {
        alignItems: 'center',
        paddingLeft: '0px',
        paddingTop: '1215px',
        paddingOffset: '6rem 2rem 2rem 2rem',
        justifyContent: '',
        marginBottom: '0rem',
        width: '100%',
      },
    },
    outro: {
      content: {
        secondaryBackgroundColour: '',
      },
      image: {
        margin: '5rem auto',
      },
    },
  },
};

export const CONFIG = {
  fc: {
    siteName: 'Funeral Collage',
    siteUrl: 'https://funeralcollage.com',
  },
};

export const CRISP_CHAT_IDS = {
  fc: '20e88ba9-c455-4d22-a376-8d53f62b07fe',
};

export const HEADER_LINKS = {
  fc: [
    {
      title: 'Features',
      url: '/features',
    },
    {
      title: 'Pricing',
      url: '/pricing',
    },
    {
      title: 'Contact',
      url: '/#contact',
    },
  ],
};

// Import duration constants from maker config to ensure single source of truth
export { DEFAULT_SLIDE_DURATION } from './maker/config';

export const BLACK_PLACEHOLDER =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKQAAABcCAIAAABvFoliAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAQklEQVR4nO3BAQ0AAADCoPdPbQ8HFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADwZLEsAAHNK8v/AAAAAElFTkSuQmCC';

export const START_AUDIO = 'onIntro'; // afterIntro or onIntro

// START IMAGES
export const MIN_UPLOAD_WIDTH = 276; //576;
export const MIN_UPLOAD_HEIGHT = 100; // 324;
export const MAX_NUMBER_OF_IMAGES = 300;
// END IMAGES

// START STRIPE
export const CURRENCY = 'usd';
// Set your amount limits: Use float for decimal currencies and
// Integer for zero-decimal currencies: https://stripe.com/docs/currencies#zero-decimal.

// SIMPLIFIED PRICING STRUCTURE - USD ONLY (LIVE MODE)
// Memorial Tribute Video - $99 (any duration)
export const PRICE_STANDARD = process.env.NEXT_PUBLIC_STRIPE_PRICE_STANDARD!;
export const PROD_STANDARD = process.env.NEXT_PUBLIC_STRIPE_PROD_STANDARD!;

// VIDEO HOSTING OPTIONS (GDPR Compliance)
// Monthly hosting to prevent 30-day deletion - $5/month
export const PRICE_HOSTING_MONTHLY = process.env.NEXT_PUBLIC_STRIPE_PRICE_HOSTING_MONTHLY!;
// Annual hosting (20% off) - $48/year
export const PRICE_HOSTING_ANNUAL = process.env.NEXT_PUBLIC_STRIPE_PRICE_HOSTING_ANNUAL!;
export const PROD_HOSTING_MONTHLY = process.env.NEXT_PUBLIC_STRIPE_PROD_HOSTING_MONTHLY!;
export const PROD_HOSTING_ANNUAL = process.env.NEXT_PUBLIC_STRIPE_PROD_HOSTING_ANNUAL!;

// START REMOTION

export const REMOTION_FUNCTION_NAME = 'remotion-render-4-0-340-mem4096mb-disk4096mb-900sec'; // updated to version 4.0.340 with 900sec timeout
export const REMOTION_SERVE_URL =
  'https://remotionlambda-rhs4wehjxz.s3.us-east-1.amazonaws.com/sites/grateful-today/index.html';
