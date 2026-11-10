import { loadRendererFonts } from "@/lib/renderer/fonts";
import { SceneRenderer } from "@/lib/renderer/scene-renderer";
import type { StripesSetup } from "@/lib/renderer/stripes";
import { WorldLayerRenderer } from "@/lib/renderer/world-renderer";
import type { WorldArgs } from "@/lib/renderer/frame-context";
import {
  buildArtworkPaths,
  buildStripes,
  CARD_FONT_FAMILY,
  CARD_FONT_URL,
  hexToRgb,
  INK_COLOR,
  labelBlobPath,
  layoutLabel,
  PAPER_COLOR,
  splitHeadline,
  stripePath,
} from "@/lib/sobriety-card-art";
import type { CardDesign, PhotoDesign } from "@/lib/sobriety-card-design";
import {
  cardPhotoUrl,
  getCardPhoto,
  layoutPhotoText,
  PHOTO_FONTS,
  photoInk,
  photoScrimStops,
  TYPE_STYLES,
  type PhotoFontKey,
} from "@/lib/sobriety-card-photo-art";

export const CARD_FPS = 30;
/** Frame the one-off ripple starts on (after a short settle). */
const RIPPLE_START_FRAME = 8;

export type CardExportFormat = "card" | "og";

export const CARD_EXPORT_SIZES: Record<
  CardExportFormat,
  { width: number; height: number }
> = {
  card: { width: 1200, height: 1680 },
  og: { width: 1200, height: 630 },
};

export interface CreateSobrietyCardRendererOptions {
  palette: string[];
  seed: number;
  width: number;
  height: number;
  /** Headline drawn into the frame (exports). Omit when the DOM draws the label. */
  headline?: string | null;
  /** Small caption under the label (e.g. "Sam sent you a card"). */
  labelText?: string | null;
  artwork?: "stripes" | "confetti" | "sunburst";
  recipientName?: string | null;
  /** Gentle drift + grain boil. False renders a still (reduced motion / export). */
  motion?: boolean;
  /** One soft wave ripple through the stripes on load. */
  ripple?: boolean;
  /** Small gratefultoday.com mark at the bottom (card export). */
  siteMark?: boolean;
  /** Force the Canvas2D fallback even when WebGL is available. */
  forceFallback?: boolean;
}

export interface SobrietyCardRenderer {
  scene: SceneRenderer;
  canvas: HTMLCanvasElement;
  usesWebGL: boolean;
  fps: number;
  renderFrame: (frame: number) => void;
  dispose: () => void;
}

let fontPromise: Promise<void> | null = null;

function loadCardFont(): Promise<void> {
  if (!fontPromise) {
    fontPromise = loadRendererFonts([
      { family: CARD_FONT_FAMILY, source: CARD_FONT_URL, weight: "800" },
    ]).catch((error) => {
      fontPromise = null;
      throw error;
    });
  }
  return fontPromise;
}

let webglSupport: boolean | null = null;

export function isWebGLAvailable(): boolean {
  if (webglSupport !== null) return webglSupport;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    webglSupport = !!gl;
    (gl as WebGLRenderingContext | null)
      ?.getExtension("WEBGL_lose_context")
      ?.loseContext();
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}

function stripesSetup(
  palette: string[],
  seed: number,
  width: number,
  height: number,
): StripesSetup {
  return {
    width,
    height,
    seed,
    paper: hexToRgb(PAPER_COLOR),
    stripes: buildStripes(seed, palette, width, height).map((stripe) => ({
      ...stripe,
      color: hexToRgb(stripe.color),
    })),
  };
}

function drawArtwork2D(
  context: CanvasRenderingContext2D,
  artwork: "stripes" | "confetti" | "sunburst",
  palette: string[],
  seed: number,
  width: number,
  height: number,
): void {
  context.fillStyle = PAPER_COLOR;
  context.fillRect(0, 0, width, height);
  context.save();
  context.globalCompositeOperation =
    artwork === "stripes" ? "multiply" : "source-over";
  for (const path of buildArtworkPaths(artwork, seed, palette, width, height)) {
    context.fillStyle = path.color;
    context.globalAlpha = path.opacity;
    context.fill(new Path2D(path.d));
  }
  context.restore();
}

function drawRecipient2D(
  context: CanvasRenderingContext2D,
  recipientName: string | null | undefined,
  width: number,
  height: number,
): void {
  const name = recipientName?.trim();
  if (!name) return;
  const unit = Math.min(width, height * 1.2);
  let fontSize = unit * 0.034;
  const text = `FOR ${name.toUpperCase()}`;
  context.save();
  context.font = `800 ${fontSize}px "${CARD_FONT_FAMILY}", system-ui, sans-serif`;
  const measured = context.measureText(text).width;
  if (measured > width * 0.72) {
    fontSize *= (width * 0.72) / measured;
    context.font = `800 ${fontSize}px "${CARD_FONT_FAMILY}", system-ui, sans-serif`;
  }
  const textWidth = context.measureText(text).width;
  const padX = fontSize * 0.8;
  const boxHeight = fontSize * 1.9;
  const x = width / 2 - (textWidth + padX * 2) / 2;
  const y = height * 0.035;
  context.fillStyle = "rgba(255,255,255,0.92)";
  context.beginPath();
  context.roundRect(x, y, textWidth + padX * 2, boxHeight, fontSize * 0.65);
  context.fill();
  context.fillStyle = INK_COLOR;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, width / 2, y + boxHeight / 2);
  context.restore();
}

function drawTrackedLine(
  context: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  tracking: number,
): void {
  const widths = Array.from(text).map(
    (char) => context.measureText(char).width,
  );
  const total =
    widths.reduce((sum, w) => sum + w, 0) + tracking * (widths.length - 1);
  let x = cx - total / 2;
  Array.from(text).forEach((char, i) => {
    context.fillText(char, x, y);
    x += widths[i] + tracking;
  });
}

function drawLabel(
  context: CanvasRenderingContext2D,
  lines: string[],
  caption: string | null,
  seed: number,
  width: number,
  height: number,
): void {
  const label = layoutLabel(lines, width, height);
  context.save();
  context.shadowColor = "rgba(0, 0, 0, 0.08)";
  context.shadowBlur = label.fontSize * 0.5;
  context.fillStyle = "#FFFFFF";
  context.fill(new Path2D(labelBlobPath(label, seed)));
  context.restore();

  context.save();
  context.fillStyle = INK_COLOR;
  context.textAlign = "left";
  context.textBaseline = "middle";
  let fontSize = label.fontSize;
  context.font = `800 ${fontSize}px "${CARD_FONT_FAMILY}", system-ui, sans-serif`;
  // Shrink if the real glyph widths run wider than the layout estimate.
  const maxWidth = label.width * 0.86;
  const widest = Math.max(
    ...lines.map(
      (line) =>
        context.measureText(line).width + label.tracking * (line.length - 1),
    ),
  );
  if (widest > maxWidth) {
    fontSize *= maxWidth / widest;
    context.font = `800 ${fontSize}px "${CARD_FONT_FAMILY}", system-ui, sans-serif`;
  }
  const tracking = label.tracking * (fontSize / label.fontSize);
  const firstY = label.cy - ((lines.length - 1) * label.lineHeight) / 2;
  lines.forEach((line, i) =>
    drawTrackedLine(
      context,
      line,
      label.cx,
      firstY + i * label.lineHeight,
      tracking,
    ),
  );
  context.restore();

  if (caption) {
    context.save();
    context.fillStyle = "#3F3F46";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = `800 ${label.fontSize * 0.42}px "${CARD_FONT_FAMILY}", system-ui, sans-serif`;
    context.fillText(
      caption,
      label.cx,
      label.cy + label.height / 2 + label.fontSize * 0.75,
    );
    context.restore();
  }
}

/**
 * Card front renderer on the shared WaveCanvas compositor: the 'stripes'
 * world (WebGL) under a Canvas2D overlay (label + headline). Falls back to
 * a Canvas2D world with the same geometry when WebGL is unavailable.
 */
export async function createSobrietyCardRenderer({
  palette,
  seed,
  width,
  height,
  headline = null,
  labelText = null,
  artwork = "stripes",
  recipientName = null,
  motion = false,
  ripple = false,
  siteMark = false,
  forceFallback = false,
}: CreateSobrietyCardRendererOptions): Promise<SobrietyCardRenderer> {
  if (headline || labelText || recipientName || siteMark) await loadCardFont();

  const lines = headline ? splitHeadline(headline) : [];
  const drawOverlay = (context: CanvasRenderingContext2D) => {
    drawRecipient2D(context, recipientName, width, height);
    if (lines.length) drawLabel(context, lines, labelText, seed, width, height);
    else if (labelText)
      drawLabel(context, [labelText.toUpperCase()], null, seed, width, height);
    if (siteMark) {
      context.save();
      context.fillStyle = "rgba(20, 20, 20, 0.5)";
      context.font = `800 ${Math.round(height * 0.014)}px "${CARD_FONT_FAMILY}", system-ui, sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText("gratefultoday.com", width / 2, height * 0.975);
      context.restore();
    }
  };

  let world: WorldLayerRenderer | null = null;
  if (!forceFallback && artwork === "stripes" && isWebGLAvailable()) {
    try {
      const worldCanvas = document.createElement("canvas");
      worldCanvas.width = width;
      worldCanvas.height = height;
      world = new WorldLayerRenderer(worldCanvas);
      const setup = stripesSetup(palette, seed, width, height);
      const worldArgs = (frame: number): WorldArgs => ({
        kind: "stripes",
        frame,
        setup,
        params: {
          frame,
          fps: CARD_FPS,
          motion: motion ? 1 : 0,
          rippleStartFrame: ripple ? RIPPLE_START_FRAME : null,
        },
      });
      await world.setup(worldArgs(0));
      const scene = new SceneRenderer({
        width,
        height,
        world,
        worldArgs,
        drawOverlay,
      });
      const activeWorld = world;
      return {
        scene,
        canvas: scene.canvas,
        usesWebGL: true,
        fps: CARD_FPS,
        renderFrame: (frame) => scene.renderFrame(frame),
        dispose: () => activeWorld.dispose(),
      };
    } catch (error) {
      console.warn(
        "[sobriety-card] WebGL unavailable, using 2D fallback:",
        error,
      );
      world?.dispose();
    }
  }

  const scene = new SceneRenderer({
    width,
    height,
    drawWorld: (context) =>
      drawArtwork2D(context, artwork, palette, seed, width, height),
    drawOverlay,
  });
  return {
    scene,
    canvas: scene.canvas,
    usesWebGL: false,
    fps: CARD_FPS,
    renderFrame: (frame) => scene.renderFrame(frame),
    dispose: () => scene.dispose(),
  };
}

// ─── Photographic cards ─────────────────────────────────────────────────────

function loadPhoto(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    // Unsplash / Pexels CDNs send CORS headers, so the canvas stays exportable.
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load the card photo."));
    image.src = url;
  });
}

const loadedPhotoFonts = new Map<PhotoFontKey, Promise<void>>();

function loadPhotoFonts(keys: PhotoFontKey[]): Promise<void> {
  return Promise.all(
    keys.map((key) => {
      let promise = loadedPhotoFonts.get(key);
      if (!promise) {
        const font = PHOTO_FONTS[key];
        promise = loadRendererFonts([
          { family: font.family, source: font.woff2, weight: font.weight },
        ]).catch((error) => {
          loadedPhotoFonts.delete(key);
          throw error;
        });
        loadedPhotoFonts.set(key, promise);
      }
      return promise;
    }),
  ).then(() => undefined);
}

export interface CreatePhotoCardRendererOptions {
  design: PhotoDesign;
  width: number;
  height: number;
  /** Replace the three lines with one neutral line (discreet previews). */
  labelText?: string | null;
  siteMark?: boolean;
}

/**
 * Photo card on the same WaveCanvas compositor: the photo, scrim and
 * paper/frame are the Canvas2D world; the lettering is the overlay —
 * positioned by layoutPhotoText(), exactly like the DOM card.
 */
export async function createPhotoCardRenderer({
  design,
  width,
  height,
  labelText = null,
  siteMark = false,
}: CreatePhotoCardRendererOptions): Promise<SobrietyCardRenderer> {
  const photo = getCardPhoto(design.photoId);
  const style = TYPE_STYLES[design.typeStyle];
  const landscape = width > height;
  const text = labelText
    ? { kicker: "", headline: labelText, footer: "" }
    : design;
  const layout = layoutPhotoText(
    text,
    style,
    width,
    height,
    landscape ? "center" : photo.textPlacement,
  );
  const ink = photoInk(style, photo);
  const [image] = await Promise.all([
    loadPhoto(cardPhotoUrl(photo, width, height)),
    loadPhotoFonts(Array.from(new Set(layout.lines.map((line) => line.font)))),
    siteMark || (design.recipientName && !labelText)
      ? loadCardFont()
      : Promise.resolve(),
  ]);

  const drawWorld = (context: CanvasRenderingContext2D) => {
    context.drawImage(image, 0, 0, width, height);
    if (style.box !== "paper") {
      const gradient = context.createLinearGradient(0, 0, 0, height);
      for (const [offset, color] of photoScrimStops(photo, layout.focusY))
        gradient.addColorStop(offset, color);
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
    }
    const unit = Math.min(width, height * 1.2);
    const { x, y, width: bw, height: bh } = layout.block;
    if (style.box === "paper") {
      context.save();
      context.shadowColor = "rgba(0,0,0,0.18)";
      context.shadowBlur = unit * 0.03;
      context.shadowOffsetY = unit * 0.008;
      context.fillStyle = "rgba(255,253,248,0.94)";
      context.beginPath();
      context.roundRect(x, y, bw, bh, unit * 0.01);
      context.fill();
      context.restore();
    } else if (style.box === "frame") {
      const line = unit * 0.005;
      context.strokeStyle = ink.text;
      context.lineWidth = line;
      context.strokeRect(x + line / 2, y + line / 2, bw - line, bh - line);
    }
  };

  const drawOverlay = (context: CanvasRenderingContext2D) => {
    drawRecipient2D(
      context,
      labelText ? null : design.recipientName,
      width,
      height,
    );
    for (const line of layout.lines) {
      const font = PHOTO_FONTS[line.font];
      context.save();
      context.font = `${font.weight} ${line.fontSize}px "${font.family}"`;
      context.textAlign = "left";
      context.textBaseline = "alphabetic";
      context.fillStyle = ink.text;
      if (ink.shadow !== "transparent") {
        context.shadowColor = ink.shadow;
        context.shadowBlur = Math.min(width, height * 1.2) * 0.018;
      }
      drawTrackedLine(
        context,
        line.text,
        line.cx,
        line.baseline,
        line.tracking,
      );
      context.restore();
    }
    if (siteMark) {
      context.save();
      context.fillStyle =
        ink.text === "#FFFFFF" && style.box !== "paper"
          ? "rgba(255,255,255,0.75)"
          : "rgba(20,20,20,0.55)";
      context.font = `800 ${Math.round(height * 0.014)}px "${CARD_FONT_FAMILY}", system-ui, sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText("gratefultoday.com", width / 2, height * 0.975);
      context.restore();
    }
  };

  const scene = new SceneRenderer({ width, height, drawWorld, drawOverlay });
  return {
    scene,
    canvas: scene.canvas,
    usesWebGL: false,
    fps: CARD_FPS,
    renderFrame: (frame) => scene.renderFrame(frame),
    dispose: () => scene.dispose(),
  };
}

export interface ExportSobrietyCardOptions {
  design: CardDesign;
  labelText?: string | null;
  format: CardExportFormat;
}

/** Render one still frame through the same renderer and encode a PNG. */
export async function exportSobrietyCardPng({
  design,
  labelText = null,
  format,
}: ExportSobrietyCardOptions): Promise<Blob> {
  const { width, height } = CARD_EXPORT_SIZES[format];
  const handle =
    design.style === "photo"
      ? await createPhotoCardRenderer({
          design,
          width,
          height,
          labelText,
          siteMark: format === "card",
        })
      : await createSobrietyCardRenderer({
          palette: design.palette,
          seed: design.seed,
          width,
          height,
          headline: design.headline,
          labelText,
          artwork: design.artwork,
          recipientName: labelText ? null : design.recipientName,
          motion: false,
          ripple: false,
          siteMark: format === "card",
        });
  try {
    handle.renderFrame(0);
    return await new Promise<Blob>((resolve, reject) => {
      handle.canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(new Error("Could not encode the card image.")),
        "image/png",
      );
    });
  } finally {
    handle.dispose();
  }
}
