"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SignatureVideoPreview from "@/components/signature-video/signature-video-preview";
import {
  createTodayVideoOptions,
  type TodayPrompt,
} from "@/lib/signature-video-today";

export type { TodayPrompt } from "@/lib/signature-video-today";

export default function TodayVideo({ prompt }: { prompt: TodayPrompt }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const options = useMemo(() => createTodayVideoOptions(prompt), [prompt]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || shouldLoad) return;
    if (!("IntersectionObserver" in window)) {
      setShouldLoad(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [shouldLoad]);

  return (
    <div ref={containerRef} className="mx-auto w-full max-w-[280px]">
      {shouldLoad ? (
        <SignatureVideoPreview options={options} widthClass="max-w-[280px]" />
      ) : (
        <div className="flex aspect-[9/16] items-center justify-center rounded-xl bg-primary-100 text-sm text-primary-700">
          Today&apos;s 15-second video
        </div>
      )}
    </div>
  );
}
