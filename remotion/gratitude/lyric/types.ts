export interface LyricStyleProps {
  text: string;
  frame: number;
  durationInFrames: number;
  width: number;
  height: number;
  color?: string;
  accentColor?: string;
  fontFamily?: string;
  /** When provided, skips width-based font-size computation in useJustifiedLayout. */
  fontSize?: number;
  highlightWords?: string[];
}
