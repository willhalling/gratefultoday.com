import { SOBRIETY_MILESTONES } from "@/lib/sobriety-milestones";
import { getSobrietyChipStory } from "@/lib/sobriety-chip-story";

export interface SobrietyChipVideoData {
  id?: string;
  chipNumber: number;
  chipText: string;
  chipNumberX: number;
  chipNumberY: number;
  chipTextX: number;
  chipTextY: number;
  title?: string;
  order?: number;
  type?: string;
  chipColor?: string;
  backgroundColour?: string;
}

export interface ChipSignatureContent {
  lines: [string, string, string];
  variant: number;
}

const NUMBER_WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
  "twenty",
];

const DAY_ONE_VARIANTS: ChipSignatureContent[] = [
  {
    lines: [
      "one whole day.",
      "you didn't think you'd make it to tonight.",
      "but here you are.",
    ],
    variant: 0,
  },
  {
    lines: [
      "24 hours.",
      "it might not feel like much. it's everything.",
      "that's how it starts.",
    ],
    variant: 1,
  },
  {
    lines: [
      "day one is done.",
      "the hardest day is often the first.",
      "tomorrow, just do it again.",
    ],
    variant: 2,
  },
];

function normalizeText(text: string): string {
  const cleaned = text
    .toLowerCase()
    .replace(/[!…]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[.\s]+$/g, "")
    .trim();
  return `${cleaned}.`;
}

function limitWords(text: string, limit: number): string {
  const normalized = normalizeText(text);
  const words = normalized.split(/\s+/);
  if (words.length <= limit) return normalized;
  return `${words
    .slice(0, limit)
    .join(" ")
    .replace(/[.\s]+$/g, "")}.`;
}

function numberWords(value: number): string {
  return NUMBER_WORDS[value] ?? String(value);
}

function milestoneLine(chipData: SobrietyChipVideoData): string {
  const { chipNumber, chipText } = chipData;
  const unit = chipText.toLowerCase();
  if (unit.includes("hour") && chipNumber === 24) return "one whole day.";
  if (unit.includes("hour"))
    return limitWords(`${numberWords(chipNumber)} hours`, 6);
  if (unit.includes("week"))
    return limitWords(
      `${numberWords(chipNumber)} ${chipNumber === 1 ? "week" : "weeks"}`,
      6,
    );
  if (unit.includes("month"))
    return limitWords(
      `${numberWords(chipNumber)} ${chipNumber === 1 ? "month" : "months"}`,
      6,
    );
  if (unit.includes("year"))
    return chipNumber === 1
      ? "a year."
      : limitWords(`${numberWords(chipNumber)} years`, 6);
  return limitWords(
    `${numberWords(chipNumber)} ${chipNumber === 1 ? "day" : "days"}`,
    6,
  );
}

export function getChipSignatureContent(
  chipData: SobrietyChipVideoData,
  {
    personalMessage = "",
    variant = 0,
  }: { personalMessage?: string; variant?: number } = {},
): ChipSignatureContent {
  if (chipData.id === "24-hours") {
    const selected = DAY_ONE_VARIANTS[variant] ?? DAY_ONE_VARIANTS[0];
    return {
      lines: [
        selected.lines[0],
        personalMessage.trim()
          ? limitWords(personalMessage, 12)
          : selected.lines[1],
        selected.lines[2],
      ],
      variant: selected.variant,
    };
  }

  const story = getSobrietyChipStory(chipData);
  return {
    lines: [
      milestoneLine(chipData),
      personalMessage.trim()
        ? limitWords(personalMessage, 12)
        : limitWords(story.honest.join(" "), 12),
      limitWords(story.turn, 8),
    ],
    variant: 0,
  };
}

export function getChipSignatureContentById(
  id: string,
  options: { personalMessage?: string; variant?: number } = {},
): ChipSignatureContent {
  const chipData = SOBRIETY_MILESTONES.find((chip) => chip.id === id);
  if (!chipData)
    throw new Error(`No signature content found for milestone: ${id}`);
  return getChipSignatureContent(chipData, options);
}
