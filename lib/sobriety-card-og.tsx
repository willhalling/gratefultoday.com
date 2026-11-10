import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import {
  buildArtworkPaths,
  CARD_FONT_FAMILY,
  INK_COLOR,
  labelBlobPath,
  layoutLabel,
  PAPER_COLOR,
  splitHeadline,
} from "@/lib/sobriety-card-art";
import type { CardDesign, PhotoDesign } from "@/lib/sobriety-card-design";
import {
  cardPhotoUrl,
  getCardPhoto,
  layoutPhotoText,
  PHOTO_FONTS,
  photoInk,
  photoScrimCss,
  TYPE_STYLES,
  type PhotoFontKey,
} from "@/lib/sobriety-card-photo-art";

export const CARD_OG_SIZE = { width: 1200, height: 630 };

let fontData: Promise<Buffer> | null = null;

function loadCardFontData(): Promise<Buffer> {
  if (!fontData) {
    // satori needs TTF/OTF/WOFF (not WOFF2).
    fontData = readFile(
      join(process.cwd(), "public/fonts/grandstander-800.ttf"),
    );
  }
  return fontData;
}

interface CardOgImageOptions {
  palette: string[];
  seed: number;
  /** Label text: the card headline, or the neutral "Sam sent you a card". */
  text: string;
  artwork?: "stripes" | "confetti" | "sunburst";
  recipientName?: string | null;
}

export async function renderCardOgImage({
  palette,
  seed,
  text,
  artwork = "stripes",
  recipientName = null,
}: CardOgImageOptions): Promise<ImageResponse> {
  const { width, height } = CARD_OG_SIZE;
  const paths = buildArtworkPaths(artwork, seed, palette, width, height);
  const lines = splitHeadline(text);
  const label = layoutLabel(lines, width, height);

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width,
        height,
        position: "relative",
        backgroundColor: PAPER_COLOR,
      }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        {paths.map((path, index) => (
          <path
            key={index}
            d={path.d}
            fill={path.color}
            fillOpacity={path.opacity}
          />
        ))}
        <path d={labelBlobPath(label, seed)} fill="#FFFFFF" />
      </svg>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width,
          height,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {lines.map((line, i) => (
          <div
            key={i}
            style={{
              fontFamily: CARD_FONT_FAMILY,
              fontSize: label.fontSize,
              lineHeight: `${label.lineHeight}px`,
              letterSpacing: label.tracking,
              color: INK_COLOR,
            }}
          >
            {line}
          </div>
        ))}
      </div>
      {recipientName?.trim() && (
        <div
          style={{
            position: "absolute",
            top: height * 0.035,
            left: 0,
            width,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              maxWidth: "80%",
              padding: "8px 20px",
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.92)",
              color: INK_COLOR,
              fontFamily: CARD_FONT_FAMILY,
              fontSize: Math.min(width, height * 1.2) * 0.034,
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            For {recipientName.trim()}
          </div>
        </div>
      )}
    </div>,
    {
      width,
      height,
      fonts: [
        {
          name: CARD_FONT_FAMILY,
          data: await loadCardFontData(),
          weight: 800,
          style: "normal",
        },
      ],
    },
  );
}

// ─── Photographic cards ─────────────────────────────────────────────────────

const photoFontData = new Map<PhotoFontKey, Promise<Buffer>>();

function loadPhotoFontData(key: PhotoFontKey): Promise<Buffer> {
  let data = photoFontData.get(key);
  if (!data) {
    data = readFile(join(process.cwd(), PHOTO_FONTS[key].ttf));
    photoFontData.set(key, data);
  }
  return data;
}

interface PhotoOgImageOptions {
  design: PhotoDesign;
  /** Replace the three lines with one neutral line (discreet previews). */
  labelText?: string | null;
}

/** 1200×630 OG image for a photo card — same layout maths as the DOM card. */
export async function renderPhotoCardOgImage({
  design,
  labelText = null,
}: PhotoOgImageOptions): Promise<ImageResponse> {
  const { width, height } = CARD_OG_SIZE;
  const photo = getCardPhoto(design.photoId);
  const style = TYPE_STYLES[design.typeStyle];
  const text = labelText
    ? { kicker: "", headline: labelText, footer: "" }
    : design;
  const layout = layoutPhotoText(text, style, width, height, "center");
  const ink = photoInk(style, photo);
  const fontKeys = Array.from(new Set(layout.lines.map((line) => line.font)));
  const fonts = await Promise.all(
    fontKeys.map(async (key) => ({
      name: PHOTO_FONTS[key].family,
      data: await loadPhotoFontData(key),
      weight: Number(PHOTO_FONTS[key].weight) as 400 | 700,
      style: "normal" as const,
    })),
  );
  const unit = Math.min(width, height * 1.2);
  const { block } = layout;

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width,
        height,
        position: "relative",
        backgroundColor: "#222",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cardPhotoUrl(photo, width, height)}
        width={width}
        height={height}
        alt=""
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width,
          height,
          objectFit: "cover",
        }}
      />
      {style.box !== "paper" && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width,
            height,
            backgroundImage: photoScrimCss(photo, layout.focusY),
          }}
        />
      )}
      {style.box !== "none" && (
        <div
          style={{
            position: "absolute",
            left: block.x,
            top: block.y,
            width: block.width,
            height: block.height,
            backgroundColor:
              style.box === "paper" ? "rgba(255,253,248,0.94)" : "transparent",
            border:
              style.box === "frame"
                ? `${unit * 0.005}px solid ${ink.text}`
                : "none",
            borderRadius: style.box === "paper" ? unit * 0.01 : 0,
          }}
        />
      )}
      {layout.lines.map((line, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: 0,
            top: line.top,
            width,
            height: line.lineBox,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: PHOTO_FONTS[line.font].family,
            fontSize: line.fontSize,
            lineHeight: `${line.lineBox}px`,
            letterSpacing: line.tracking,
            color: ink.text,
          }}
        >
          {line.text}
        </div>
      ))}
      {design.recipientName?.trim() && !labelText && (
        <div
          style={{
            position: "absolute",
            top: height * 0.035,
            left: 0,
            width,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              maxWidth: "80%",
              padding: "8px 20px",
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.92)",
              color: INK_COLOR,
              fontFamily: "sans-serif",
              fontSize: Math.min(width, height * 1.2) * 0.034,
              fontWeight: 700,
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            For {design.recipientName.trim()}
          </div>
        </div>
      )}
    </div>,
    { width, height, fonts },
  );
}

/** OG image for any card design. */
export function renderDesignOgImage(
  design: CardDesign,
  labelText: string | null = null,
): Promise<ImageResponse> {
  if (design.style === "photo")
    return renderPhotoCardOgImage({ design, labelText });
  return renderCardOgImage({
    palette: design.palette,
    seed: design.seed,
    text: labelText ?? design.headline,
    artwork: design.artwork,
    recipientName: labelText ? null : design.recipientName,
  });
}
