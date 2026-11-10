"use client";

import { useEffect, useRef, useState } from "react";
import Chip from "@/components/sobriety-chips/chip";
import SignatureVideoStudio from "@/components/signature-video/signature-video-studio";
import type { SignatureVideoOptions } from "@/lib/signature-video";
import { getChipSignatureContent } from "@/lib/chip-signature-content";
import {
  createChipVideoOptions,
  type SobrietyChipVideoData,
} from "@/lib/signature-video-chip";

export default function ChipVideoStudio({
  chipData,
  recipientName = "",
  personalMessage = "",
  storyText,
  backgroundId,
}: {
  chipData: SobrietyChipVideoData;
  recipientName?: string;
  personalMessage?: string;
  storyText?: string;
  backgroundId?: string;
}) {
  const chipSourceRef = useRef<HTMLDivElement>(null);
  const [options, setOptions] = useState<SignatureVideoOptions | null>(null);
  const [error, setError] = useState("");
  const content = getChipSignatureContent(chipData, {
    personalMessage: personalMessage || storyText || "",
  });

  useEffect(() => {
    let cancelled = false;
    setOptions(null);
    setError("");
    const chipSvg = chipSourceRef.current?.querySelector("svg");
    if (!chipSvg) {
      setError("The chip artwork is not ready yet.");
      return;
    }
    createChipVideoOptions({
      chipData,
      chipSvg,
      personalMessage,
      storyText,
      backgroundId,
    })
      .then((next) => {
        if (!cancelled) setOptions(next);
      })
      .catch((caught) => {
        if (!cancelled)
          setError(
            caught instanceof Error
              ? caught.message
              : "The chip video could not be prepared.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [chipData, recipientName, personalMessage, storyText, backgroundId]);

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        {content.lines.map((line) => (
          <p
            key={line}
            className="font-heading text-xl leading-relaxed text-neutral-800"
          >
            {line}
          </p>
        ))}
      </div>
      <div className="text-center">
        <div ref={chipSourceRef} className="mx-auto max-w-[180px]">
          <Chip chipData={chipData} recipientName={recipientName} />
        </div>
        <p className="mt-2 text-sm font-semibold text-primary-800">
          one day. one thing.
        </p>
      </div>
      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}
      {!error && !options && (
        <p className="text-sm text-neutral-600">
          Preparing this milestone&apos;s story…
        </p>
      )}
      {options && (
        <>
          <p className="text-center text-xs uppercase tracking-[0.16em] text-neutral-500">
            20 seconds · 9:16 · rendered on your device
          </p>
          <SignatureVideoStudio
            key={JSON.stringify([
              chipData.id,
              recipientName,
              personalMessage,
              storyText,
              backgroundId,
            ])}
            initialScenes={options.scenes}
            voiceover={options.voiceover}
            music={options.music}
            durationSec={options.durationSec}
            textCenterY={options.textCenterY}
            staticCamera={options.staticCamera}
            fileName={`sobriety-chip-${chipData.id ?? "milestone"}`}
          />
        </>
      )}
    </div>
  );
}
