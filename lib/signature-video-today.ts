import type {
  SignatureScene,
  SignatureVideoOptions,
} from "@/lib/signature-video";

export interface TodayPrompt {
  subject: string;
  intro: string;
  prompt: string;
  tags: string[];
}

export function buildTodayScenes(prompt: TodayPrompt): SignatureScene[] {
  return [
    { text: prompt.subject },
    { text: prompt.prompt },
    { text: "One day. One thing." },
    { text: "share yours on the wall." },
  ];
}

export function createTodayVideoOptions(
  prompt: TodayPrompt,
): SignatureVideoOptions {
  return { scenes: buildTodayScenes(prompt), durationSec: 15 };
}
