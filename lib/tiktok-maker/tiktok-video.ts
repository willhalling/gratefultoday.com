/**
 * lib/tiktok-maker/tiktok-video.ts — the /admin/tiktok-maker composition:
 * uploaded background image through the WaveCanvas world renderer (grade /
 * motion effect / camera rig), the willhalling.com signature typewriter in the
 * Canvas2D overlay, and a mixed voiceover + music + keystroke soundtrack.
 *
 * One renderer factory drives both the live preview (reduced size) and the
 * MP4 export (1080×1920), so every signature-video variant matches.
 */
import { loadGoogleFontFamily } from "@/lib/renderer/fonts";
import { analyzeChannelData } from "@/lib/renderer/audio-engine";
import { exportClipMp4 } from "@/lib/renderer/mp4-export";
import {
  createVideoRenderer,
  type VideoRenderer,
} from "@/lib/renderer/render-video";
import {
  markCanvasSourceDirty,
  registerCanvasSource,
  unregisterCanvasSource,
} from "@/lib/renderer/world-renderer";
import type { CameraMotion } from "@/lib/renderer/vendor/three/camera/cameraMotion";
import { GRADE_PRESETS } from "@/lib/renderer/vendor/three/colourGrade";
import {
  INTRO_SAMPLE_RATE,
  pcmToAudioBuffer,
  renderCuesPcm,
} from "./signature/audio";
import {
  buildTypewriterPlan,
  computeTypewriterLayout,
  naturalTypingSec,
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  drawTypewriter,
  typewriterFontFamily,
  typewriterFontWeights,
  type TypewriterPlan,
  type TypewriterSettings,
} from "./signature/scene";

export const TIKTOK_FPS = 30;
export const TIKTOK_WIDTH = DESIGN_WIDTH;
export const TIKTOK_HEIGHT = DESIGN_HEIGHT;
const FALLBACK_IMAGE = "/grateful-today-hero.png";

export type BackgroundEffect =
  | "wave"
  | "still"
  | "colour-grade"
  | "pulse"
  | "rgb-glitch"
  | "rain"
  | "dream";

export const BACKGROUND_EFFECTS: { id: BackgroundEffect; label: string }[] = [
  { id: "wave", label: "Wave" },
  { id: "still", label: "Still" },
  { id: "colour-grade", label: "Grade atmosphere" },
  { id: "pulse", label: "Pulse" },
  { id: "rgb-glitch", label: "RGB glitch" },
  { id: "rain", label: "Rain" },
  { id: "dream", label: "Dream" },
];

export const CAMERA_MOTIONS: { id: CameraMotion; label: string }[] = [
  { id: "static", label: "Static" },
  { id: "push-in", label: "Push in" },
  { id: "pull-back", label: "Pull back" },
  { id: "drift-left", label: "Drift left" },
  { id: "drift-right", label: "Drift right" },
  { id: "vertical-float", label: "Vertical float" },
  { id: "diagonal-drift", label: "Diagonal drift" },
  { id: "orbit", label: "Orbit" },
  { id: "breathing", label: "Breathing" },
];

export interface BackgroundSettings {
  effect: BackgroundEffect;
  /** 0–1 strength of the wave / motion effect. */
  effectIntensity: number;
  /** Desaturate under the RGB glitch so the fringes stand out. */
  glitchGrayscale: boolean;
  gradePreset: string;
  gradeIntensity: number;
  cameraMotion: CameraMotion;
  cameraIntensity: number;
  filmGrain: boolean;
}

export const DEFAULT_BACKGROUND: BackgroundSettings = {
  effect: "wave",
  effectIntensity: 0.5,
  glitchGrayscale: false,
  gradePreset: "warm-film",
  gradeIntensity: 0.6,
  cameraMotion: "push-in",
  cameraIntensity: 0.4,
  filmGrain: true,
};

export interface SoundSettings {
  voiceVolume: number;
  musicVolume: number;
  /** Lower the music while the voiceover is speaking. */
  duckMusic: boolean;
  /** Clip length when there is no voiceover. */
  defaultLengthSec: number;
  /** Silence held after the voiceover ends. */
  tailSec: number;
}

export const DEFAULT_SOUND: SoundSettings = {
  voiceVolume: 1,
  musicVolume: 0.35,
  duckMusic: true,
  defaultLengthSec: 10,
  tailSec: 0,
};

/** A background for one line: a still image or a (muted, looping) video. */
export interface LineMedia {
  kind: "image" | "video";
  url: string;
}

export interface TikTokSpec {
  imageUrl: string | null;
  /**
   * Optional background per line (same order as the non-empty lines). A line
   * without one uses `imageUrl`. Each takes over as its line starts typing.
   */
  lineMedia?: (LineMedia | null)[] | null;
  voiceover: AudioBuffer | null;
  music: AudioBuffer | null;
  typewriter: TypewriterSettings;
  background: BackgroundSettings;
  sound: SoundSettings;
}

/** Hold on the finished text when a clip without a voiceover is stretched to fit it. */
const FIT_HOLD_SEC = 2;

/**
 * A voiceover (plus its hold) sets the length. Without one: the default
 * length, stretched if the text needs longer at its typing speed. Whole frames.
 */
export function clipLengthSec(
  spec: Pick<TikTokSpec, "voiceover" | "sound" | "typewriter">,
): number {
  const raw = spec.voiceover
    ? spec.voiceover.duration + spec.sound.tailSec
    : Math.max(
        spec.sound.defaultLengthSec,
        naturalTypingSec(spec.typewriter) + FIT_HOLD_SEC,
      );
  return Math.max(1, Math.ceil(raw * TIKTOK_FPS)) / TIKTOK_FPS;
}

// ─── Audio ───────────────────────────────────────────────────────────────────

let decodeContext: AudioContext | null = null;

/** Decode an uploaded audio file (48 kHz, the renderer's mux rate). */
export async function decodeAudioFile(file: File): Promise<AudioBuffer> {
  decodeContext ??= new AudioContext({ sampleRate: INTRO_SAMPLE_RATE });
  return decodeContext.decodeAudioData(await file.arrayBuffer());
}

/** Music gain automation: duck under the voiceover where it is speaking. */
function scheduleMusicGain(
  param: AudioParam,
  spec: TikTokSpec,
  totalSec: number,
): void {
  const level = spec.sound.musicVolume;
  const fadeOut = Math.min(1.5, totalSec / 4);
  param.setValueAtTime(0, 0);
  param.linearRampToValueAtTime(level, Math.min(0.3, totalSec / 4));
  const vo = spec.voiceover;
  if (vo && spec.sound.duckMusic) {
    const ducked = level * 0.3;
    const hop = 0.05;
    const win = Math.round(hop * vo.sampleRate);
    const data = vo.getChannelData(0);
    let speaking = false;
    for (
      let start = 0, t = 0;
      start < data.length && t < totalSec - fadeOut;
      start += win, t += hop
    ) {
      let sum = 0;
      const end = Math.min(data.length, start + win);
      for (let i = start; i < end; i++) sum += data[i] * data[i];
      const active = Math.sqrt(sum / Math.max(1, end - start)) > 0.015;
      if (active !== speaking) {
        speaking = active;
        // Fast duck, slow release.
        param.setTargetAtTime(
          active ? ducked : level,
          Math.max(0.3, t),
          active ? 0.05 : 0.35,
        );
      }
    }
  }
  // The ducking loop stops before the fade, so this ramps from whatever level it left.
  param.setTargetAtTime(0, totalSec - fadeOut, fadeOut / 4);
}

/** Voiceover + looped/trimmed music + signature keystrokes, mixed to one 48 kHz stereo buffer. */
export async function mixSoundtrack(
  spec: TikTokSpec,
  plan: TypewriterPlan,
): Promise<AudioBuffer> {
  const totalSec = plan.totalSec;
  const length = Math.max(1, Math.round(totalSec * INTRO_SAMPLE_RATE));
  const ctx = new OfflineAudioContext(2, length, INTRO_SAMPLE_RATE);

  if (spec.music) {
    const src = ctx.createBufferSource();
    src.buffer = spec.music;
    src.loop = spec.music.duration < totalSec;
    const gain = ctx.createGain();
    scheduleMusicGain(gain.gain, spec, totalSec);
    src.connect(gain).connect(ctx.destination);
    src.start(0);
  }
  if (spec.voiceover) {
    const src = ctx.createBufferSource();
    src.buffer = spec.voiceover;
    const gain = ctx.createGain();
    gain.gain.value = spec.sound.voiceVolume;
    src.connect(gain).connect(ctx.destination);
    src.start(0);
  }
  const sound = spec.typewriter.sound;
  if (sound.enabled && plan.cues.length > 0) {
    const keys = pcmToAudioBuffer(
      renderCuesPcm(plan.cues, totalSec, sound, spec.typewriter.seed),
    );
    const src = ctx.createBufferSource();
    src.buffer = keys;
    src.connect(ctx.destination);
    src.start(0);
  }
  return ctx.startRendering();
}

// ─── Renderer ────────────────────────────────────────────────────────────────

/** What the preview, export and thumbnails drive — one renderer or a per-line composite. */
export interface TikTokEngine {
  renderer: {
    canvas: HTMLCanvasElement;
    renderFrame: (frame: number) => void;
    prepareFrame: (frame: number) => Promise<void>;
  };
  fps: number;
  durationInFrames: number;
  width: number;
  height: number;
}

export interface TikTokRenderer {
  engine: TikTokEngine;
  audioBuffer: AudioBuffer;
  plan: TypewriterPlan;
  totalSec: number;
  dispose: () => void;
}

export interface CreateTikTokRendererOptions {
  spec: TikTokSpec;
  width?: number;
  height?: number;
  preview?: boolean;
  /** Reuse an already-mixed soundtrack (export after preview). */
  audioBuffer?: AudioBuffer;
  /** Thumbnails: skip mixing the soundtrack (silence of the right length instead). */
  silent?: boolean;
}

function effectProps(bg: BackgroundSettings) {
  const motionEffect =
    bg.effect === "wave" || bg.effect === "still"
      ? ("none" as const)
      : bg.effect;
  return {
    motionEffect,
    motionEffectScale:
      motionEffect === "none" ? 0 : Math.max(0.01, bg.effectIntensity),
    motionEffectGrayscale: bg.effect === "rgb-glitch" && bg.glitchGrayscale,
    waveEnergyMultiplier:
      bg.effect === "wave" ? Math.max(0.05, bg.effectIntensity * 2) : 0,
  };
}

export async function createTikTokRenderer({
  spec,
  width = TIKTOK_WIDTH,
  height = TIKTOK_HEIGHT,
  preview = false,
  audioBuffer,
  silent = false,
}: CreateTikTokRendererOptions): Promise<TikTokRenderer> {
  const totalSec = clipLengthSec(spec);
  const plan = buildTypewriterPlan(spec.typewriter, totalSec);
  const family = typewriterFontFamily(spec.typewriter.font);
  const [mixed] = await Promise.all([
    audioBuffer
      ? Promise.resolve(audioBuffer)
      : silent
        ? Promise.resolve(
            new AudioBuffer({
              length: Math.max(1, Math.round(totalSec * INTRO_SAMPLE_RATE)),
              numberOfChannels: 2,
              sampleRate: INTRO_SAMPLE_RATE,
            }),
          )
        : mixSoundtrack(spec, plan),
    loadGoogleFontFamily(family, typewriterFontWeights(spec.typewriter.font)),
  ]);

  const measure = document.createElement("canvas").getContext("2d");
  if (!measure) throw new Error("Could not create a canvas for text layout.");
  const layout = computeTypewriterLayout(measure, spec.typewriter, plan);

  const bg = spec.background;
  const fx = effectProps(bg);
  const totalFrames = Math.round(totalSec * TIKTOK_FPS);
  // Audio-reactive frame data from the mixed soundtrack (pulse / wave energy).
  const frameData = analyzeChannelData({
    channel: mixed.getChannelData(0),
    sampleRate: mixed.sampleRate,
    fps: TIKTOK_FPS,
    totalFrames,
    waveEnergyMultiplier: fx.waveEnergyMultiplier || 1,
  });
  const grade =
    GRADE_PRESETS.find((p) => p.id === bg.gradePreset) ?? GRADE_PRESETS[0];
  const baseImage = spec.imageUrl ?? FALLBACK_IMAGE;

  /** One world renderer for one background (an image URL or a registered video canvas). */
  const buildEngine = (imageUrl: string) =>
    createVideoRenderer({
      width,
      height,
      preview,
      frameDataOverride: frameData,
      props: {
        imageUrl,
        duration: totalSec,
        fps: TIKTOK_FPS,
        orientation: "portrait",
        preset: "none",
        mainText: "",
        subText: "",
        artworkLayout: "fullscreen",
        showLyrics: false,
        showWatermark: false,
        proxyImagesForPreview: true,
        sceneVideos: [],
        audioBeats: Array.from(
          { length: Math.ceil(totalSec * 2) + 1 },
          (_, i) => i * 0.5,
        ),
        audioBpm: 120,
        cameraMotion: bg.cameraMotion,
        cameraMotionIntensity: bg.cameraIntensity,
        ...fx,
        colourGradePreset: bg.gradePreset,
        colourGradeIntensity: bg.gradeIntensity,
        overlayEffects: [],
        enableFilmGrain: bg.filmGrain,
        // The grade tints shadows/mids/highlights toward the theme colours: use
        // the grade preset's own, never the typewriter's cursor colour.
        visualStyle: {
          accentColor: grade.accent,
          textColor: grade.text,
          backgroundColor: grade.background,
          font: "minimalist",
          backgroundType: "image",
          backgroundImageUrl: imageUrl,
          cameraMotion: bg.cameraMotion,
          motionEffect: fx.motionEffect,
          overlayEffects: [],
        },
      },
      customOverlay: (context, frame) => {
        context.save();
        context.scale(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
        drawTypewriter(
          context,
          frame / TIKTOK_FPS,
          spec.typewriter,
          plan,
          layout,
        );
        context.restore();
      },
    });

  const segments = lineSegments(spec, plan, baseImage);
  // Simple case: one background for the whole video.
  if (segments.length === 1 && segments[0].media.kind === "image") {
    const engine = await buildEngine(segments[0].media.url);
    return handleFor(asEngine(engine), mixed, plan, totalSec, () =>
      engine.dispose(),
    );
  }

  // Per-line backgrounds: one world per distinct background, composited.
  const sources = new Map<string, BackgroundSource>();
  try {
    for (const seg of segments) {
      const key = `${seg.media.kind}:${seg.media.url}`;
      if (sources.has(key)) continue;
      if (seg.media.kind === "image") {
        sources.set(key, {
          kind: "image",
          engine: await buildEngine(seg.media.url),
        });
      } else {
        const video = await openVideo(seg.media.url);
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 1080;
        canvas.height = video.videoHeight || 1920;
        const id = `tiktok-video-${++canvasSourceId}`;
        const url = registerCanvasSource(id, canvas);
        const driver: VideoDriver = {
          id,
          video,
          canvas,
          ctx: canvas.getContext("2d")!,
          start: seg.start,
          lastTarget: -1,
        };
        drawVideoFrame(driver);
        sources.set(key, {
          kind: "video",
          engine: await buildEngine(url),
          driver,
        });
      }
    }
  } catch (err) {
    disposeSources(sources);
    throw err;
  }
  const engines = segments.map(
    (seg) => sources.get(`${seg.media.kind}:${seg.media.url}`)!,
  );
  const composite = createComposite(engines, segments, width, height, totalSec);
  return handleFor(composite, mixed, plan, totalSec, () =>
    disposeSources(sources),
  );
}

// ─── Per-line backgrounds ────────────────────────────────────────────────────

/** Crossfade into each line's background, ending as its first character appears. */
const LINE_FADE_SEC = 0.4;

interface Segment {
  /** When this background is fully in (its line's first keystroke). */
  start: number;
  media: LineMedia;
}

interface VideoDriver {
  id: string;
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  /** Video time 0 lines up with this clip time. */
  start: number;
  lastTarget: number;
}

type BackgroundSource =
  | { kind: "image"; engine: VideoRenderer }
  | { kind: "video"; engine: VideoRenderer; driver: VideoDriver };

let canvasSourceId = 0;

function asEngine(engine: VideoRenderer): TikTokEngine {
  return {
    renderer: engine.renderer,
    fps: engine.fps,
    durationInFrames: engine.durationInFrames,
    width: engine.width,
    height: engine.height,
  };
}

function handleFor(
  engine: TikTokEngine,
  audioBuffer: AudioBuffer,
  plan: TypewriterPlan,
  totalSec: number,
  dispose: () => void,
): TikTokRenderer {
  let disposed = false;
  return {
    engine,
    audioBuffer,
    plan,
    totalSec,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      dispose();
    },
  };
}

/** When each line starts typing (seconds), in line order. */
function lineStarts(plan: TypewriterPlan): number[] {
  if (plan.mode === "stack")
    return plan.timelines.map(
      (t, i) => plan.offsets[i] + (t.charTimesSec[0] ?? 0),
    );
  const t = plan.timeline;
  return [
    ...t.preroll.map((p) => p.charTimesSec[0] ?? 0),
    t.charTimesSec[0] ?? t.typeEndSec,
  ];
}

/** Background segments: line 0's from the start, each later one from its line's first keystroke. */
function lineSegments(
  spec: TikTokSpec,
  plan: TypewriterPlan,
  baseImage: string,
): Segment[] {
  const base: LineMedia = { kind: "image", url: baseImage };
  const media = spec.lineMedia ?? [];
  if (!media.some(Boolean)) return [{ start: 0, media: base }];
  const starts = lineStarts(plan);
  const segments: Segment[] = [];
  plan.lines.forEach((_, i) => {
    const m = media[i] ?? base;
    const prev = segments[segments.length - 1];
    if (prev && prev.media.kind === m.kind && prev.media.url === m.url) return;
    segments.push({
      start: i === 0 ? 0 : Math.max(starts[i] ?? 0, LINE_FADE_SEC),
      media: m,
    });
  });
  return segments;
}

function openVideo(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.loop = true;
    const timer = setTimeout(
      () => reject(new Error("The video took too long to load.")),
      20000,
    );
    video.addEventListener(
      "loadeddata",
      () => {
        clearTimeout(timer);
        resolve(video);
      },
      { once: true },
    );
    video.addEventListener(
      "error",
      () => {
        clearTimeout(timer);
        reject(new Error("Could not load the video (try MP4 or WebM)."));
      },
      { once: true },
    );
    video.src = url;
  });
}

function drawVideoFrame(d: VideoDriver): void {
  d.ctx.drawImage(d.video, 0, 0, d.canvas.width, d.canvas.height);
  markCanvasSourceDirty(d.id);
}

/** Video time for clip time `t` (videos loop if shorter than their stretch). */
function videoTimeAt(d: VideoDriver, t: number): number {
  const duration = d.video.duration || 1;
  return Math.max(0, t - d.start) % duration;
}

/** Export: seek exactly and wait, so every frame is the right video frame. */
async function seekExact(d: VideoDriver, t: number): Promise<void> {
  const target = videoTimeAt(d, t);
  d.video.pause();
  if (Math.abs(d.video.currentTime - target) > 1 / (TIKTOK_FPS * 2)) {
    await new Promise<void>((resolve) => {
      const done = () => resolve();
      d.video.addEventListener("seeked", done, { once: true });
      setTimeout(done, 1000);
      d.video.currentTime = target;
    });
  }
  d.lastTarget = target;
  drawVideoFrame(d);
}

/** Preview: play along while frames advance in order; seek on jumps. */
function followPreview(d: VideoDriver, t: number): void {
  const target = videoTimeAt(d, t);
  const sequential =
    d.lastTarget >= 0 && target >= d.lastTarget && target - d.lastTarget < 0.25;
  if (sequential) {
    if (d.video.paused) void d.video.play().catch(() => undefined);
    if (Math.abs(d.video.currentTime - target) > 0.3)
      d.video.currentTime = target;
  } else {
    d.video.pause();
    d.video.currentTime = target;
  }
  d.lastTarget = target;
  drawVideoFrame(d);
}

function disposeSources(sources: Map<string, BackgroundSource>): void {
  sources.forEach((src) => {
    src.engine.dispose();
    if (src.kind === "video") {
      src.driver.video.pause();
      src.driver.video.removeAttribute("src");
      src.driver.video.load();
      unregisterCanvasSource(src.driver.id);
    }
  });
}

/** Composite of per-line worlds: each segment's world, crossfading into the next. */
function createComposite(
  engines: BackgroundSource[],
  segments: Segment[],
  width: number,
  height: number,
  totalSec: number,
): TikTokEngine {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const durationInFrames = engines[0].engine.durationInFrames;
  let exporting = false;

  /** Segments to draw at `t`: the current one, plus the next while it fades in. */
  const layersAt = (t: number): { index: number; alpha: number }[] => {
    let cur = 0;
    for (let i = 0; i < segments.length; i++)
      if (t >= segments[i].start) cur = i;
    const next = cur + 1 < segments.length ? cur + 1 : -1;
    if (next !== -1 && t >= segments[next].start - LINE_FADE_SEC) {
      const a = (t - (segments[next].start - LINE_FADE_SEC)) / LINE_FADE_SEC;
      return [
        { index: cur, alpha: 1 },
        { index: next, alpha: Math.min(1, Math.max(0, a)) },
      ];
    }
    return [{ index: cur, alpha: 1 }];
  };

  return {
    fps: TIKTOK_FPS,
    durationInFrames,
    width,
    height,
    renderer: {
      canvas,
      async prepareFrame(frame) {
        exporting = true;
        const t = Math.min(frame / TIKTOK_FPS, totalSec);
        for (const { index } of layersAt(t)) {
          const src = engines[index];
          if (src.kind === "video") await seekExact(src.driver, t);
          await src.engine.renderer.prepareFrame(frame);
        }
      },
      renderFrame(frame) {
        const t = Math.min(frame / TIKTOK_FPS, totalSec);
        ctx.globalAlpha = 1;
        for (const { index, alpha } of layersAt(t)) {
          const src = engines[index];
          if (src.kind === "video" && !exporting) followPreview(src.driver, t);
          src.engine.renderer.renderFrame(frame);
          ctx.globalAlpha = alpha;
          ctx.drawImage(src.engine.renderer.canvas, 0, 0, width, height);
        }
        ctx.globalAlpha = 1;
      },
    },
  };
}

export async function renderTikTokMp4(
  spec: TikTokSpec,
  options: {
    audioBuffer?: AudioBuffer;
    onProgress?: (percent: number) => void;
  } = {},
): Promise<Blob> {
  const handle = await createTikTokRenderer({
    spec,
    width: TIKTOK_WIDTH,
    height: TIKTOK_HEIGHT,
    preview: false,
    audioBuffer: options.audioBuffer,
  });
  try {
    return await exportClipMp4({
      frames: handle.engine.durationInFrames,
      fps: TIKTOK_FPS,
      width: handle.engine.width,
      height: handle.engine.height,
      canvas: handle.engine.renderer.canvas,
      renderFrame: (frame) => handle.engine.renderer.renderFrame(frame),
      prepareFrame: (frame) => handle.engine.renderer.prepareFrame(frame),
      audioBuffer: handle.audioBuffer,
      onProgress: options.onProgress,
    });
  } finally {
    handle.dispose();
  }
}
