"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import {
  createSignatureSpec,
  type SignatureVideoOptions,
} from "@/lib/signature-video";

const TikTokPreview = dynamic(
  () => import("@/components/tiktok-maker/tiktok-preview"),
  { ssr: false },
);

export default function SignatureVideoPreview({
  options,
  widthClass = "max-w-[320px]",
}: {
  options: SignatureVideoOptions;
  widthClass?: string;
}) {
  const spec = useMemo(() => createSignatureSpec(options), [options]);
  return <TikTokPreview spec={spec} widthClass={widthClass} />;
}
