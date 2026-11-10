"use client";

import { useEffect, useMemo, useState } from "react";
import SignatureVideoStudio from "@/components/signature-video/signature-video-studio";
import { getChipSignatureContentById } from "@/lib/chip-signature-content";
import { buildCardScenes } from "@/lib/signature-video-card";
import type { SobrietyCard } from "@/lib/sobriety-card-data";
import { cardFrontText, type CardDesign } from "@/lib/sobriety-card-design";
import { cardPhotoUrl, getCardPhoto } from "@/lib/sobriety-card-photo-art";

export default function CardVideoStudio({
  card,
  design,
  toName,
  fromName,
  message,
}: {
  card: SobrietyCard;
  design: CardDesign;
  toName: string;
  fromName: string;
  message: string;
}) {
  const [background, setBackground] = useState<{
    url: string;
    local: boolean;
  } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let localUrl = "";
    setBackground(null);
    setError("");
    (async () => {
      try {
        if (design.style === "photo") {
          return {
            url: cardPhotoUrl(getCardPhoto(design.photoId), 1080, 1920),
            local: false,
          };
        }
        const { exportSobrietyCardPng } =
          await import("@/lib/sobriety-card-renderer");
        const blob = await exportSobrietyCardPng({ design, format: "card" });
        localUrl = URL.createObjectURL(blob);
        return { url: localUrl, local: true };
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "The card background could not be prepared.",
        );
        return null;
      }
    })().then((next) => {
      if (!cancelled && next) setBackground(next);
    });
    return () => {
      cancelled = true;
      if (localUrl) URL.revokeObjectURL(localUrl);
    };
  }, [design]);

  const optionsKey = useMemo(
    () => JSON.stringify([design, toName, fromName, message, background?.url]),
    [design, toName, fromName, message, background],
  );
  if (error)
    return (
      <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
    );
  if (!background)
    return (
      <p className="text-sm text-neutral-600">Preparing the card video…</p>
    );

  const signatureLines = card.milestone
    ? getChipSignatureContentById(card.milestone).lines
    : undefined;
  const scenes = buildCardScenes({
    design,
    toName,
    fromName,
    message,
    backgroundUrl: background.url,
    signatureLines,
  });
  return (
    <SignatureVideoStudio
      key={optionsKey}
      initialScenes={scenes}
      durationSec={15}
      fileName={`sobriety-card-${cardFrontText(design)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")}`}
    />
  );
}
