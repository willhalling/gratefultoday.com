"use client";

import dynamic from "next/dynamic";
import { CardFace } from "@/components/sobriety-cards/card-art";
import PhotoCardFace from "@/components/sobriety-cards/photo-card-art";
import {
  describeCardDesign,
  type CardDesign,
} from "@/lib/sobriety-card-design";

const CardStripesCanvas = dynamic(
  () => import("@/components/sobriety-cards/card-stripes-canvas"),
  {
    ssr: false,
  },
);

interface CardFrontProps {
  design: CardDesign;
  /** 'always' = animated (detail/shared page); 'hover' = thumbnail. */
  motion?: "always" | "hover" | "none";
  /** Thumbnail is hovered/focused — mounts the live stripes renderer. */
  active?: boolean;
  /** One soft wave ripple through the stripes on load. */
  ripple?: boolean;
  headlineAs?: "p" | "h2";
  className?: string;
  displayWidth?: number;
  priority?: boolean;
}

/** A card front in either style: crayon stripes (WebGL) or photographic. */
export default function CardFront({
  design,
  motion = "none",
  active = false,
  ripple = false,
  headlineAs = "p",
  className = "",
  displayWidth,
  priority,
}: CardFrontProps) {
  if (design.style === "stripes") {
    const live =
      design.artwork === "stripes" &&
      (motion === "always" || (motion === "hover" && active));
    return (
      <CardFace
        palette={design.palette}
        seed={design.seed}
        headline={design.headline}
        artwork={design.artwork}
        recipientName={design.recipientName}
        labelAs={headlineAs}
        alt={describeCardDesign(design)}
        className={className}
        live={
          live ? (
            <CardStripesCanvas
              palette={design.palette}
              seed={design.seed}
              animate
              ripple={ripple}
            />
          ) : null
        }
      />
    );
  }

  return (
    <div
      className={`relative aspect-[5/7] w-full overflow-hidden bg-neutral-200 ${className}`}
      style={{ containerType: "inline-size" }}
    >
      <PhotoCardFace
        design={design}
        motion={motion}
        displayWidth={displayWidth}
        priority={priority}
        headlineAs={headlineAs}
      />
      {design.recipientName?.trim() && (
        <div className="absolute inset-x-[6%] top-[3%] z-10 mx-auto w-fit max-w-[88%] rounded-full bg-white/90 px-[4%] py-[1.5%] text-center font-sans text-[3.2cqw] font-bold uppercase tracking-wide text-neutral-800 shadow-sm">
          For {design.recipientName.trim()}
        </div>
      )}
    </div>
  );
}
