"use client";

import { useEffect, useState } from "react";
import { Download, Share2 } from "lucide-react";
import type { SignatureVideoOptions } from "@/lib/signature-video";

export default function SignatureVideoDownloadButton({
  options,
  fileName = "grateful-today",
}: {
  options: SignatureVideoOptions;
  fileName?: string;
}) {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [result, setResult] = useState<{
    blob: Blob;
    url: string;
    sizeMb: number;
  } | null>(null);

  useEffect(() => {
    setResult(null);
    setError("");
    setShareMessage("");
  }, [options]);

  useEffect(
    () => () => {
      if (result) URL.revokeObjectURL(result.url);
    },
    [result],
  );

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    setProgress(0);
    setError("");
    setShareMessage("");
    setResult(null);
    try {
      const { renderSignatureVideo } = await import("@/lib/signature-video");
      const blob = await renderSignatureVideo(options, {
        onProgress: setProgress,
      });
      setResult({
        blob,
        url: URL.createObjectURL(blob),
        sizeMb: blob.size / 1e6,
      });
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : "The video could not be exported.",
      );
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async () => {
    if (!result) return;
    const file = new File([result.blob], `${fileName}.mp4`, {
      type: "video/mp4",
    });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "One day. One thing." });
        setShareMessage("Shared from your device.");
      } catch (shareError) {
        if (
          !(
            shareError instanceof DOMException &&
            shareError.name === "AbortError"
          )
        ) {
          setShareMessage(
            "Sharing did not work here. Download the video instead.",
          );
        }
      }
    } else {
      setShareMessage(
        "Native sharing is not available here. Download the video to share it.",
      );
    }
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleExport}
        disabled={exporting}
        className="rounded-full bg-neutral-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {exporting ? `Exporting… ${Math.round(progress)}%` : "Create MP4"}
      </button>
      {error && (
        <p
          className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      )}
      {result && (
        <div className="rounded-xl border border-primary-200 bg-primary-50 p-4">
          <video
            src={result.url}
            controls
            playsInline
            className="mx-auto max-h-[28rem] rounded-lg bg-black"
          />
          <div className="mt-4 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href={result.url}
              download={`${fileName}.mp4`}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-50"
            >
              <Download className="h-4 w-4" /> Download (
              {result.sizeMb.toFixed(1)} MB)
            </a>
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-primary-300 bg-white px-5 py-3 text-sm font-semibold text-primary-800"
            >
              <Share2 className="h-4 w-4" /> Share video
            </button>
          </div>
          {shareMessage && (
            <p className="mt-3 text-center text-sm text-neutral-600">
              {shareMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
