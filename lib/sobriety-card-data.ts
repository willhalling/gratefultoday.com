import sobrietyCardsData from "@/json/sobriety-cards.json";
import thankYouCardsData from "@/json/thank-you-cards.json";
import type { TypeStyleId } from "@/lib/sobriety-card-photo-art";

export const SITE_URL = "https://gratefultoday.com";

/** Card collections share every component; each has its own route + copy. */
export type CardCollectionId = "sobriety" | "thank-you";

export type SobrietyCardCategory =
  | "hours"
  | "days"
  | "weeks"
  | "months"
  | "years"
  | "occasions";
export type ThankYouCardCategory =
  | "everyday"
  | "family"
  | "friends"
  | "teachers"
  | "work"
  | "celebrations"
  | "care";
export type CardCategory = SobrietyCardCategory | ThankYouCardCategory;
export type CardLook = "colour" | "quiet";

/** The slug a quiet card was made from ("24-hours-quiet" → "24-hours"). */
export function baseSlug(card: Pick<SobrietyCard, "slug">): string {
  return card.slug.replace(/-quiet$/, "");
}

export interface SobrietyCard {
  /** Which collection (set at load; not stored in the JSON). */
  collection: CardCollectionId;
  slug: string;
  /** SEO title, e.g. "30 Days Sober Card". */
  title: string;
  category: CardCategory;
  /** Matching /sobriety-chips/[slug], when there is one. */
  milestone: string | null;
  /** Card front text. */
  headline: string;
  /** Default suggested inside message. */
  insideMessage: string;
  palette: string[];
  seed: number;
  /** Which front the card shows by default (index + detail page). */
  defaultStyle: "photo" | "stripes";
  /** 'colour': the original bright cards. 'quiet': the black-and-white Grateful Today versions (slug ends in -quiet). */
  look: CardLook;
  /** Photographic front: photo + lettering style + three lines of text. */
  photo: {
    photoId: string;
    typeStyle: TypeStyleId;
    kicker: string;
    headline: string;
    footer: string;
  };
}

type CardJson = Omit<SobrietyCard, "collection">;

export const SOBRIETY_CARDS: SobrietyCard[] = (
  sobrietyCardsData as CardJson[]
).map((card) => ({
  ...card,
  collection: "sobriety",
}));

export const THANK_YOU_CARDS: SobrietyCard[] = (
  thankYouCardsData as CardJson[]
).map((card) => ({
  ...card,
  milestone: null,
  collection: "thank-you",
}));

export const ALL_CARDS: SobrietyCard[] = [
  ...SOBRIETY_CARDS,
  ...THANK_YOU_CARDS,
];

export type CategoryOption = { key: "all" | CardCategory; label: string };

export const CARD_CATEGORIES: CategoryOption[] = [
  { key: "all", label: "All" },
  { key: "hours", label: "Hours" },
  { key: "days", label: "Days" },
  { key: "weeks", label: "Weeks" },
  { key: "months", label: "Months" },
  { key: "years", label: "Years" },
  { key: "occasions", label: "Occasions" },
];

export const THANK_YOU_CATEGORIES: CategoryOption[] = [
  { key: "all", label: "All" },
  { key: "everyday", label: "Everyday" },
  { key: "family", label: "Family" },
  { key: "friends", label: "Friends" },
  { key: "teachers", label: "Teachers" },
  { key: "work", label: "Work" },
  { key: "celebrations", label: "Weddings & parties" },
  { key: "care", label: "Care & support" },
];

export interface CardCollection {
  id: CardCollectionId;
  /** Index route, e.g. /sobriety-cards. */
  basePath: string;
  name: string;
  cards: SobrietyCard[];
  categories: CategoryOption[];
  searchPlaceholder: string;
  /** Discreet link previews on by default (sensitive collections only). */
  discreetByDefault: boolean;
}

export const CARD_COLLECTIONS: Record<CardCollectionId, CardCollection> = {
  sobriety: {
    id: "sobriety",
    basePath: "/sobriety-cards",
    name: "Sobriety Cards",
    cards: SOBRIETY_CARDS,
    categories: CARD_CATEGORIES,
    searchPlaceholder:
      "Search for a card (e.g., '30 days', '1 year', 'sponsor')...",
    discreetByDefault: true,
  },
  "thank-you": {
    id: "thank-you",
    basePath: "/thank-you-cards",
    name: "Thank You Cards",
    cards: THANK_YOU_CARDS,
    categories: THANK_YOU_CATEGORIES,
    searchPlaceholder:
      "Search for a card (e.g., 'teacher', 'mum', 'wedding')...",
    discreetByDefault: false,
  },
};

export function getCollection(card: SobrietyCard): CardCollection {
  return CARD_COLLECTIONS[card.collection];
}

export function cardHref(card: SobrietyCard): string {
  return `${getCollection(card).basePath}/${card.slug}`;
}

/** Any card, from any collection (slugs are unique across collections). */
export function getCardBySlug(slug: string): SobrietyCard | undefined {
  return ALL_CARDS.find((card) => card.slug === slug);
}

export function getCollectionCard(
  collection: CardCollectionId,
  slug: string,
): SobrietyCard | undefined {
  return CARD_COLLECTIONS[collection].cards.find((card) => card.slug === slug);
}

export function getCardForMilestone(
  milestone: string,
): SobrietyCard | undefined {
  return (
    SOBRIETY_CARDS.find(
      (card) => card.milestone === milestone && card.look === "colour",
    ) ?? SOBRIETY_CARDS.find((card) => card.milestone === milestone)
  );
}

export function getCardSeoTitle(card: SobrietyCard): string {
  return card.collection === "thank-you"
    ? `${card.title} — Free Thank You Card to Send | Grateful Today`
    : `${card.title} — Free Sobriety Card to Send | Grateful Today`;
}

/** "30 days" / "24 hours" / "thank you sponsor" — lowercase phrase for copy. */
export function getCardPhrase(card: SobrietyCard): string {
  return card.title
    .replace(/ (Sober|Sobriety|Recovery) Card$/, "")
    .replace(/ Card$/, "")
    .toLowerCase();
}

export function getCardSeoDescription(card: SobrietyCard): string {
  const phrase = getCardPhrase(card);
  const front =
    card.look === "quiet"
      ? "A quiet black-and-white photo"
      : "A bright photo or crayon stripes";
  if (card.collection === "thank-you") {
    const words = [card.photo.kicker, card.photo.headline, card.photo.footer]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return `Send a free ${phrase} card: “${words}.” ${front}, your own message and a link to share. No account, no email.`;
  }
  if (card.category === "occasions") {
    const lead: Record<string, string> = {
      "thank-you-sponsor": "Say thank you to your sponsor with a free card",
      "thinking-of-you":
        "Let someone in recovery know you are thinking of them with a free card",
      "starting-over":
        "Send a free card for starting over, because day one counts too",
      "proud-of-you":
        "Tell someone in recovery your family is proud of them with a free card",
      "sober-anniversary": "Send a free sober anniversary card for any year",
    };
    return `${lead[baseSlug(card)] ?? `Send a free ${phrase} card`}: ${front.charAt(0).toLowerCase()}${front.slice(1)}, your own message and a private link. No account, no email.`;
  }
  return `Send a free ${phrase} sober card: “${card.headline.toLowerCase().replace(/\.$/, "")}.” ${front}, your own message and a private link. No account, no email.`;
}

/** Nearby milestones (same ordering as the chips), or other occasions — in the same look. */
export function getRelatedCards(card: SobrietyCard, count = 4): SobrietyCard[] {
  if (card.collection === "thank-you") {
    const others = THANK_YOU_CARDS.filter(
      (c) => c.slug !== card.slug && c.look === card.look,
    );
    return [
      ...others.filter((c) => c.category === card.category),
      ...others.filter((c) => c.category !== card.category),
    ].slice(0, count);
  }
  const sameLook = SOBRIETY_CARDS.filter((c) => c.look === card.look);
  const pool =
    card.category === "occasions"
      ? sameLook.filter((c) => c.category === "occasions")
      : sameLook.filter((c) => c.category !== "occasions");
  const index = pool.findIndex((c) => c.slug === card.slug);
  const related: SobrietyCard[] = [];
  for (
    let offset = 1;
    related.length < count && offset < pool.length;
    offset++
  ) {
    const after = pool[index + offset];
    const before = pool[index - offset];
    if (after) related.push(after);
    if (before && related.length < count) related.push(before);
  }
  return related;
}

/** Short "what to write" suggestions for the detail page. */
export function getWritingTips(card: SobrietyCard): {
  intro: string;
  tips: string[];
} {
  const phrase = getCardPhrase(card);
  if (card.collection === "thank-you") return getThankYouWritingTips(card);
  switch (card.category) {
    case "hours":
      return {
        intro:
          "The first day is often the hardest one to talk about. Keep it short and steady. You are not grading the day, just noticing it.",
        tips: [
          "Name it plainly: “One whole day. That counts.”",
          "Offer something concrete: “Call me tonight if it gets loud.”",
          "Skip the pressure about the future. Today is enough.",
        ],
      };
    case "days":
      return {
        intro: `At ${phrase}, every day still feels like a lot of work, because it is. Notice the effort more than the number.`,
        tips: [
          "Tell them what you have seen: “You keep showing up, even on the hard ones.”",
          "Be specific about your support: “I’m around this weekend.”",
          "Keep it light. A short note is better than a perfect one.",
        ],
      };
    case "weeks":
      return {
        intro: `${phrase.charAt(0).toUpperCase()}${phrase.slice(1)} is when the days start to add up. It is a good moment to say you have noticed.`,
        tips: [
          "Point to a change you have seen: more sleep, more laughs, clearer mornings.",
          "Thank them for letting you be part of it.",
          "Avoid “finally”. Every week counted, not just this one.",
        ],
      };
    case "months":
      return {
        intro: `${phrase.charAt(0).toUpperCase()}${phrase.slice(1)} is real time. Seasons have changed. A warm, simple message lands best.`,
        tips: [
          "Name a moment you are proud of from these months.",
          "Say what it means to you: “I love having you here like this.”",
          "Keep the focus on them, not on the past.",
        ],
      };
    case "years":
      return {
        intro: `After ${phrase}, a card is a chance to say thank you as much as congratulations. Their recovery has probably helped other people too.`,
        tips: [
          "Thank them for something they taught you or did for someone else.",
          "Mention the life they have built, not only the time.",
          "If you are in the program together, a slogan you both love works well.",
        ],
      };
    default:
      return {
        intro:
          baseSlug(card) === "thank-you-sponsor"
            ? "Sponsors rarely hear thank you. Be specific. The calls, the coffee, the patience."
            : baseSlug(card) === "starting-over"
              ? "Starting again takes courage. Lead with warmth. No questions, no lectures."
              : "There is no wrong way to do this. Short and honest is plenty.",
        tips: [
          "Write like you talk. They will hear your voice.",
          "One specific memory beats a paragraph of general praise.",
          "Let them know you are around, and how to reach you.",
        ],
      };
  }
}

function getThankYouWritingTips(card: SobrietyCard): {
  intro: string;
  tips: string[];
} {
  const general = [
    "Say exactly what they did. “Thanks for the lift on Tuesday” beats “thanks for everything”.",
    "Tell them what difference it made, even if it was small.",
    "Write like you talk. Short and warm is plenty.",
  ];
  switch (card.category as ThankYouCardCategory) {
    case "family":
      return {
        intro:
          "Family thank-yous often go unsaid because they feel obvious. That is exactly why they land.",
        tips: [
          "Pick one memory and name it.",
          "Thank them for something ordinary they do every week.",
          "Sign off the way you would in a text. It will sound like you.",
        ],
      };
    case "friends":
      return {
        intro:
          "A thank-you to a friend does not need a big reason. Showing up, listening, a good laugh: all count.",
        tips: [
          "Mention an in-joke or a moment only you two share.",
          "Tell them you would do the same for them.",
          "Keep it light if that is your friendship. Funny is allowed.",
        ],
      };
    case "teachers":
      return {
        intro:
          "Teachers keep these. Something specific about their class or a moment they helped will mean a lot.",
        tips: [
          "Name a subject, project or moment that clicked.",
          "If it is from a child, let them add a line or a drawing in their own words.",
          "Thank them for patience as much as for teaching.",
        ],
      };
    case "work":
      return {
        intro:
          "Work thank-yous are rarer than they should be. A short, specific note is professional and kind.",
        tips: [
          "Mention the project or the day they helped.",
          "Say what it made possible for you or the team.",
          "Keep it brief. You can always say more in person.",
        ],
      };
    case "celebrations":
      return {
        intro:
          "After a wedding, shower or birthday, a personal note is what people remember, not the gift list.",
        tips: [
          "Mention the gift or the moment by name.",
          "Tell them how you will use it, or what it meant to have them there.",
          "Send it within a few weeks while it is fresh.",
        ],
      };
    case "care":
      return {
        intro:
          "Carers, nurses and volunteers rarely hear back from the people they helped. Your words matter more than you think.",
        tips: [
          "Name a kindness you noticed, however small.",
          "Tell them how things are now, if you are comfortable to.",
          "A simple “we will not forget you” goes a long way.",
        ],
      };
    default:
      return {
        intro:
          "There is no wrong way to say thank you. Short and honest is plenty.",
        tips: general,
      };
  }
}
