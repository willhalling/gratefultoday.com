import {
  cleanLines,
  DEFAULT_TYPEWRITER,
  MAX_LINES,
  naturalTypingSec,
} from "@/lib/tiktok-maker/signature/scene";
import {
  DEFAULT_BACKGROUND,
  DEFAULT_SOUND,
  renderTikTokMp4,
  type LineMedia,
  type TikTokSpec,
} from "@/lib/tiktok-maker/tiktok-video";

export interface SignatureScene {
  text: string;
  media?: LineMedia | null;
  slot?: "chip";
}

export interface SignatureVideoOptions {
  scenes: SignatureScene[];
  voiceover?: AudioBuffer | null;
  music?: AudioBuffer | null;
  durationSec?: number;
  textCenterY?: number;
  staticCamera?: boolean;
}

const FALLBACK_IMAGE = "/grateful-today-hero.png";

export function createSignatureSpec({
  scenes,
  voiceover = null,
  music = null,
  durationSec = 15,
  textCenterY = 0.2,
  staticCamera = false,
}: SignatureVideoOptions): TikTokSpec {
  if (!scenes.length || scenes.length > MAX_LINES) {
    throw new Error(`Signature videos need between 1 and ${MAX_LINES} scenes.`);
  }
  for (const scene of scenes) {
    if (!scene.text.trim())
      throw new Error("Every signature-video scene needs text.");
    if (scene.media && !scene.media.url)
      throw new Error("Scene media needs a URL.");
  }

  const lines = cleanLines(scenes.map((scene) => scene.text));
  const firstImage =
    scenes.find((scene) => scene.media?.kind === "image")?.media?.url ??
    FALLBACK_IMAGE;
  const baseTypewriter = {
    ...DEFAULT_TYPEWRITER,
    lines,
    mode: "retype" as const,
    leadInMs: 150,
    pauseMs: 200,
    fontPx: 56,
    centerY: textCenterY,
  };
  const naturalSeconds = naturalTypingSec({ ...baseTypewriter, typingCps: 22 });
  const targetSeconds = Math.max(1, durationSec - 2);
  const typingCps =
    naturalSeconds > targetSeconds
      ? Math.min(30, Math.ceil((naturalSeconds * 22 * 1.05) / targetSeconds))
      : 22;
  return {
    imageUrl: firstImage,
    lineMedia: scenes.map((scene) => scene.media ?? null),
    voiceover,
    music,
    typewriter: { ...baseTypewriter, typingCps },
    background: {
      ...DEFAULT_BACKGROUND,
      cameraMotion: staticCamera ? "static" : DEFAULT_BACKGROUND.cameraMotion,
    },
    sound: { ...DEFAULT_SOUND, defaultLengthSec: durationSec, tailSec: 0 },
  };
}

export async function renderSignatureVideo(
  options: SignatureVideoOptions,
  renderOptions: {
    audioBuffer?: AudioBuffer;
    onProgress?: (percent: number) => void;
  } = {},
): Promise<Blob> {
  return renderTikTokMp4(createSignatureSpec(options), renderOptions);
}
