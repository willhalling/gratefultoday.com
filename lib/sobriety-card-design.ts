import { describeCardFront, type CardArtwork } from "@/lib/sobriety-card-art";
import { getChipSignatureContentById } from "@/lib/chip-signature-content";
import type { SobrietyCard } from "@/lib/sobriety-card-data";
import type { SavedCard } from "@/lib/sobriety-cards";
import {
  getCardPhoto,
  TYPE_STYLES,
  type TypeStyleId,
} from "@/lib/sobriety-card-photo-art";

export type CardStyle = "photo" | "stripes";

export interface StripesDesign {
  style: "stripes";
  palette: string[];
  seed: number;
  headline: string;
  artwork: CardArtwork;
  recipientName?: string;
}

export interface PhotoDesign {
  style: "photo";
  photoId: string;
  typeStyle: TypeStyleId;
  kicker: string;
  headline: string;
  footer: string;
  recipientName?: string;
}

export type CardDesign = StripesDesign | PhotoDesign;

export function stripesDesign(
  card: SobrietyCard,
  seed = card.seed,
): StripesDesign {
  const signature = card.milestone
    ? getChipSignatureContentById(card.milestone)
    : null;
  return {
    style: "stripes",
    palette: card.palette,
    seed,
    headline: signature?.lines.join("\n") ?? card.headline,
    artwork: "stripes",
  };
}

export function photoDesign(
  card: SobrietyCard,
  overrides: Partial<Omit<PhotoDesign, "style">> = {},
): PhotoDesign {
  const typeStyle =
    overrides.typeStyle && TYPE_STYLES[overrides.typeStyle]
      ? overrides.typeStyle
      : card.photo.typeStyle;
  const signature = card.milestone
    ? getChipSignatureContentById(card.milestone)
    : null;
  return {
    style: "photo",
    photoId: overrides.photoId ?? card.photo.photoId,
    typeStyle,
    kicker: overrides.kicker ?? signature?.lines[0] ?? card.photo.kicker,
    headline: overrides.headline ?? signature?.lines[1] ?? card.photo.headline,
    footer: overrides.footer ?? signature?.lines[2] ?? card.photo.footer,
    recipientName: overrides.recipientName ?? "",
  };
}

export function defaultCardDesign(card: SobrietyCard): CardDesign {
  return card.defaultStyle === "photo"
    ? photoDesign(card)
    : stripesDesign(card);
}

export function cardFrontText(design: CardDesign): string {
  if (design.style === "stripes") return design.headline;
  return [design.kicker, design.headline, design.footer]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" · ");
}

export function describeCardDesign(design: CardDesign): string {
  if (design.style === "stripes")
    return describeCardFront(design.palette, design.headline, design.artwork);
  const photo = getCardPhoto(design.photoId);
  return `Card front: photo of ${photo.alt.charAt(0).toLowerCase()}${photo.alt.slice(1)}, with the words “${cardFrontText(design)}”`;
}

export function savedCardDesign(
  card: SobrietyCard,
  saved: SavedCard,
): CardDesign {
  if (saved.style !== "photo") {
    const design = stripesDesign(card, saved.seed);
    return {
      ...design,
      palette: saved.palette ?? design.palette,
      artwork: saved.artwork ?? "stripes",
      headline: saved.frontHeadline ?? card.headline,
      recipientName: saved.recipientName ?? "",
    };
  }
  return photoDesign(card, {
    photoId: saved.photoId,
    typeStyle: saved.typeStyle as TypeStyleId | undefined,
    kicker: saved.kicker ?? card.photo.kicker,
    headline: saved.frontHeadline ?? card.photo.headline,
    footer: saved.footer ?? card.photo.footer,
    recipientName: saved.recipientName ?? "",
  });
}

export function designToSavedFields(
  design: CardDesign,
): Pick<
  SavedCard,
  | "seed"
  | "style"
  | "photoId"
  | "typeStyle"
  | "kicker"
  | "frontHeadline"
  | "footer"
  | "palette"
  | "artwork"
  | "recipientName"
> {
  const recipient = design.recipientName?.trim();
  const shared = recipient ? { recipientName: recipient } : {};
  if (design.style === "stripes") {
    return {
      seed: design.seed,
      style: "stripes",
      palette: design.palette,
      artwork: design.artwork,
      frontHeadline: design.headline.trim(),
      ...shared,
    };
  }
  return {
    seed: 0,
    style: "photo",
    photoId: design.photoId,
    typeStyle: design.typeStyle,
    kicker: design.kicker.trim(),
    frontHeadline: design.headline.trim(),
    footer: design.footer.trim(),
    ...shared,
  };
}
