/**
 * Public types for the standalone Best Moments feature.
 *
 * Wire contract for:
 *   POST /api/best-moments/analyze         → { jobId }
 *   GET  /api/best-moments/status/[jobId]  → ClipFinderStatusResponse (polled by UI)
 *
 * Decoupled from the wider Director / Wizard types so the Best Moments can
 * stand on its own and have a stable response contract independent of
 * internal scoring changes.
 */

// ─── Job lifecycle ────────────────────────────────────────────────────────

export type ClipFinderJobStatus = 'queued' | 'running' | 'done' | 'error';

/**
 * Pipeline phase — what we're doing right now. Surfaced to the UI as a
 * user-facing message so polling shows real progress, not a blank spinner.
 */
export type ClipFinderPhase =
  | 'queued'
  | 'downloading'
  | 'analysing'
  | 'transcribing'
  | 'scoring'
  | 'done';

// ─── Result types ─────────────────────────────────────────────────────────

/**
 * Per-feature breakdown (0–1) that fed the overall `score`.
 *
 *   energy        normalised RMS in the window
 *   vocalDensity  words-per-second / typical max (0 when no vocals)
 *   repetition    fraction of the clip's text that repeats elsewhere
 *                 (0 when no vocals)
 *   emotion       emotional-keyword weight in the window (0 when no vocals)
 */
export interface ClipFinderFeatures {
  energy: number;
  vocalDensity: number;
  repetition: number;
  emotion: number;
}

export interface ClipFinderClip {
  /** Editorial title (e.g. "Best Hook"). */
  title: string;
  /** Start time in seconds, snapped to a downbeat where possible. */
  start: number;
  /** End time in seconds, snapped so end-start is a whole number of bars. */
  end: number;
  /** One-sentence human-readable reason. */
  reason: string;
  /** Overall score 0–1. */
  score: number;
  features: ClipFinderFeatures;
}

export interface ClipFinderMeta {
  /** Total decoded audio duration in seconds. */
  audioDuration: number;
  /** Whether vocals were used in scoring. */
  hasVocals: boolean;
  /** Number of transcribed words (0 on the instrumental path). */
  wordCount: number;
  /** ~120-sample 0–1 RMS curve covering the whole track — drives the UI charts. */
  intensityCurve: number[];
  /** Detected BPM (0 when undetectable). */
  bpm: number;
  /** Which scoring path produced the result. */
  path: 'lyric' | 'instrumental';
}

// ─── Wire shapes ──────────────────────────────────────────────────────────

export interface ClipFinderAnalyzeRequest {
  /** Downloadable audio URL. */
  audioUrl: string;
  /** Optional language hint for WhisperX (ISO-639-1). */
  language?: string;
  /** Skip transcription entirely (treat as instrumental). */
  skipTranscription?: boolean;
  /** Optional source filename — improves snippet downloads. */
  filename?: string;
}

export interface ClipFinderAnalyzeResponse {
  jobId: string;
  /** Canonical `songs/{songId}` doc id the UI should key its state on. */
  songId: string;
}

export interface ClipFinderStatusResponse {
  jobId: string;
  songId?: string;
  status: ClipFinderJobStatus;
  phase: ClipFinderPhase;
  /** User-facing progress message. */
  message: string;
  /** 0–1 coarse progress estimate. */
  progress: number;
  /** Populated when `status === 'done'`. */
  clips?: ClipFinderClip[];
  meta?: ClipFinderMeta;
  /** Per-word timings — included on `done` when the track had vocals.
   *  Powers the LabsEchoHeadline-driven Remotion preview client-side. */
  lyricsWords?: { word: string; start: number; end: number }[];
  /** Populated when `status === 'error'`. */
  error?: string;
}

export interface ClipFinderSnippetRequest {
  audioUrl: string;
  startSec: number;
  endSec: number;
  filename?: string;
}
