/**
 * Shared types for Remotion captions/subtitles
 * Used across milestone videos and video editor
 */

export interface WordTiming {
  word: string;
  start: number; // in seconds
  end: number;   // in seconds
}

export interface CaptionSegment {
  id: string;
  text: string;
  startTime: number; // in seconds
  endTime: number;   // in seconds
  words?: WordTiming[]; // Optional word-level timings
  pauseAfter?: number; // Optional pause duration in seconds
}

export interface CaptionData {
  segments: CaptionSegment[];
  totalDuration: number; // in seconds
  audioUrl?: string;
}

export interface CaptionStyle {
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
  backgroundOpacity?: number;
  padding?: number;
  maxWidth?: number;
  position?: 'top' | 'center' | 'bottom';
  textAlign?: 'left' | 'center' | 'right';
  lineHeight?: number;
  letterSpacing?: string;
  textShadow?: string;
  borderRadius?: number;
}
