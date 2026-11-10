import type { ReactNode } from "react";
import {
  buildArtworkPaths,
  CARD_HEIGHT,
  CARD_WIDTH,
  HEADLINE_LINE_HEIGHT,
  HEADLINE_TRACKING_EM,
  INK_COLOR,
  labelBlobPath,
  layoutLabel,
  PAPER_COLOR,
  splitHeadline,
  type CardArtwork,
} from "@/lib/sobriety-card-art";
import { cardFont } from "@/lib/sobriety-card-font";

/** Tiled crayon tooth (white specks, screened over the wax) — one cached raster shared by every card. */
const GRAIN_URL = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9 0.25" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 3.2 -1.35"/></filter><rect width="180" height="180" filter="url(#n)"/></svg>',
)}")`;

interface CardStripesSvgProps {
  palette: string[];
  seed: number;
  artwork: CardArtwork;
  className?: string;
}

export function CardStripesSvg({
  palette,
  seed,
  artwork,
  className,
}: CardStripesSvgProps) {
  const paths = buildArtworkPaths(artwork, seed, palette);
  return (
    <svg
      viewBox={`0 0 ${CARD_WIDTH} ${CARD_HEIGHT}`}
      className={className}
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width={CARD_WIDTH} height={CARD_HEIGHT} fill={PAPER_COLOR} />
      <g
        style={{ mixBlendMode: artwork === "stripes" ? "multiply" : "normal" }}
      >
        {paths.map((path, index) => (
          <path
            key={index}
            d={path.d}
            fill={path.color}
            fillOpacity={path.opacity}
          />
        ))}
      </g>
    </svg>
  );
}

interface CardLabelProps {
  headline: string;
  seed: number;
  /** Visually hidden heading level is up to the caller; this renders a <p>. */
  as?: "p" | "h2" | "h3";
}

/**
 * The white blob label with the real headline text in the DOM. Sized in
 * container-query units so it scales with the card (container: CardFace).
 */
export function CardLabel({ headline, seed, as: Tag = "p" }: CardLabelProps) {
  const lines = splitHeadline(headline);
  const label = layoutLabel(lines);
  return (
    <>
      <svg
        viewBox={`0 0 ${CARD_WIDTH} ${CARD_HEIGHT}`}
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d={labelBlobPath(label, seed)}
          fill="#FFFFFF"
          style={{ filter: "drop-shadow(0 0.4cqw 0.8cqw rgba(0,0,0,0.07))" }}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <Tag
          className={`${cardFont.className} m-0 text-center ${headline.includes("\n") ? "" : "uppercase"}`}
          style={{
            color: INK_COLOR,
            fontSize: `${label.fontSize / 10}cqw`,
            lineHeight: HEADLINE_LINE_HEIGHT,
            letterSpacing: `${HEADLINE_TRACKING_EM}em`,
            fontWeight: 800,
          }}
        >
          {lines.map((line, i) => (
            <span key={i} className="block whitespace-nowrap">
              {line}
            </span>
          ))}
        </Tag>
      </div>
    </>
  );
}

interface CardFaceProps {
  palette: string[];
  seed: number;
  headline: string;
  artwork: CardArtwork;
  recipientName?: string;
  /** Live renderer canvas, layered between the static stripes and the label. */
  live?: ReactNode;
  labelAs?: "p" | "h2" | "h3";
  className?: string;
  /** Accessible description of the artwork (the headline is real text). */
  alt: string;
}

/** A 5:7 card front: static artwork, optional live canvas, DOM label. */
export function CardFace({
  palette,
  seed,
  headline,
  artwork,
  recipientName,
  live,
  labelAs,
  className = "",
  alt,
}: CardFaceProps) {
  return (
    <div
      className={`relative aspect-[5/7] w-full overflow-hidden ${className}`}
      style={{ containerType: "inline-size", backgroundColor: PAPER_COLOR }}
    >
      <div role="img" aria-label={alt} className="absolute inset-0">
        <CardStripesSvg
          palette={palette}
          seed={seed}
          artwork={artwork}
          className="absolute inset-0 h-full w-full"
        />
        <div
          className="absolute inset-0 opacity-60 mix-blend-screen"
          style={{ backgroundImage: GRAIN_URL, backgroundSize: "180px 180px" }}
          aria-hidden="true"
        />
        {live}
      </div>
      {recipientName?.trim() && (
        <div className="absolute inset-x-[6%] top-[3%] z-10 mx-auto w-fit max-w-[88%] rounded-full bg-white/90 px-[4%] py-[1.5%] text-center font-sans text-[3.2cqw] font-bold uppercase tracking-wide text-neutral-800 shadow-sm">
          For {recipientName.trim()}
        </div>
      )}
      <CardLabel headline={headline} seed={seed} as={labelAs} />
    </div>
  );
}
