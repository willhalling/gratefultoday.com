"use client";

import { useMemo } from "react";
import SignatureVideoDownloadButton from "@/components/signature-video/signature-video-download-button";
import SignatureVideoPreview from "@/components/signature-video/signature-video-preview";
import {
  createTodayVideoOptions,
  type TodayPrompt,
} from "@/lib/signature-video-today";

export default function EmailVideoExport({
  prompt,
  date,
}: {
  prompt: TodayPrompt;
  date: string;
}) {
  const options = useMemo(() => createTodayVideoOptions(prompt), [prompt]);
  return (
    <div className="space-y-5">
      <SignatureVideoPreview options={options} />
      <SignatureVideoDownloadButton
        options={options}
        fileName={`newsletter-${date}`}
      />
    </div>
  );
}
