/**
 * The one product GratefulToday sells: a personalised, narrated thank-you
 * video. Price and dates live here so the landing page, checkout and emails
 * agree.
 */

export const PRODUCT_NAME = 'Thank-you video';

/**
 * Free while the idea is validated. When Stripe is added, set a price here
 * and the landing page switches from "free" copy to the price.
 */
export const PRICE_PENCE: number | null = null;

export const isFree = () => PRICE_PENCE === null;

export const formatPrice = (pence = PRICE_PENCE): string =>
  pence === null ? 'Free' : `£${(pence / 100).toFixed(2).replace(/\.00$/, '')}`;

/** Free videos per email address per day, to keep narration and render costs in check. */
export const FREE_VIDEOS_PER_EMAIL_PER_DAY = 3;

/** Last day to order for Christmas delivery. After this, the New Year version. */
export const LAST_CHRISTMAS_ORDER = '20 December';

export const VIDEO_LENGTH = '60–90 seconds';

/**
 * The two kinds of video. Same pipeline (questions → script → approval →
 * narration → WaveCanvas render), different questions, prompt and templates.
 */
export const OCCASIONS = {
  thanks: {
    slug: 'thank-you',
    label: 'Thank-you video',
    pitch: 'For the teacher, nurse, carer or colleague who made this year better.',
  },
  recovery: {
    slug: 'recovery',
    label: 'Recovery video',
    pitch: 'For someone marking a milestone in their recovery: 30 days, a year, or ten.',
  },
} as const;

export type Occasion = keyof typeof OCCASIONS;

/**
 * Occasions the site offers to visitors. Recovery videos still work by direct
 * link (/create?type=recovery) but aren't shown on the site; add 'recovery'
 * back here to bring its home page section and form choice back.
 */
export const OFFERED_OCCASIONS: Occasion[] = ['thanks'];
export const isOffered = (o: Occasion) => OFFERED_OCCASIONS.includes(o);

/** Milestones offered on the recovery form. */
export const RECOVERY_MILESTONES = [
  '24 hours',
  '30 days',
  '60 days',
  '90 days',
  '6 months',
  '9 months',
  '1 year',
  '18 months',
  '2 years',
  '5 years',
  '10 years',
  'Another milestone',
] as const;

/** Who people make thank-you videos for. Drives the landing page and, later, /for/[slug]. */
export const RECIPIENTS = [
  { slug: 'teacher', label: 'A teacher', line: 'For the year they gave your child.' },
  { slug: 'teaching-assistant', label: 'A teaching assistant', line: 'For the quiet help that made the difference.' },
  { slug: 'nurse', label: 'A nurse', line: 'For the care you never got to thank them for.' },
  { slug: 'carer', label: 'A carer', line: 'For every visit, every day.' },
  { slug: 'colleague', label: 'A colleague', line: 'For carrying the team this year.' },
  { slug: 'grandparent', label: 'A grandparent', line: 'For everything, from all of you.' },
] as const;
