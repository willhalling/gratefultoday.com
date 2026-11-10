import type { SignatureScene } from "@/lib/signature-video";
import { cardFrontText, type CardDesign } from "@/lib/sobriety-card-design";

function messageLines(message: string, limit: number): string[] {
  const paragraphs = message
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (current && candidate.length > 64 && lines.length < limit - 1) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
    if (lines.length >= limit) break;
  }
  return lines.slice(0, limit);
}

export function buildCardScenes({
  design,
  toName = "",
  fromName = "",
  message,
  backgroundUrl,
  signatureLines,
}: {
  design: CardDesign;
  toName?: string;
  fromName?: string;
  message: string;
  backgroundUrl: string;
  signatureLines?: string[];
}): SignatureScene[] {
  const front = [
    cardFrontText(design),
    toName.trim() ? `for ${toName.trim()}` : "",
  ]
    .filter(Boolean)
    .join(" — ");
  const lines = signatureLines?.length
    ? [...signatureLines, ...messageLines(message, 2)]
    : [front, ...messageLines(message, 4)];
  if (fromName.trim() && lines.length < 6)
    lines.push(`love, ${fromName.trim()}`);
  if (lines.length < 6) lines.push("one day. one thing.");
  return lines.slice(0, 6).map((text) => ({
    text,
    media: { kind: "image", url: backgroundUrl },
  }));
}
