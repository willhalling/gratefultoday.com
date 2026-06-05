import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { InkBleed } from '../lyric/InkBleed';
import { FilmOverlayLayer } from './FilmOverlayLayer';
import {
  BEAT_FONTSIZE,
  BEAT_LENGTH_S,
  FPS,
  SAFE_TOP_PX,
  TOP_SECTION_CENTER_Y,
  VIDEO_W,
  type FontChoice,
} from '../constants';

const FONT_FAMILY_MAP: Record<FontChoice, string> = {
  playfair: '"Playfair Display", serif',
  cormorant: '"Cormorant Garamond", serif',
  dm_serif: '"DM Serif Display", serif',
  tenor: '"Tenor Sans", sans-serif',
  cinzel: '"Cinzel", serif',
  bebas: '"Bebas Neue", sans-serif',
  anton: '"Anton", sans-serif',
  montserrat: '"Montserrat", sans-serif',
  inter: '"Inter", sans-serif',
  ibm_plex: '"IBM Plex Sans", sans-serif',
  avenir: '"Avenir Next", sans-serif',
  helvetica: '"Helvetica Neue", sans-serif',
};

/** Headline word renders for exactly one beat slot at 2× the regular beat font size. */
const HEADLINE_FONT_SIZE = BEAT_FONTSIZE * 2;
const BEAT_FRAMES = Math.round(BEAT_LENGTH_S * FPS);
const EXIT_DUR = 10;
// Shift InkBleed's internal clock forward so the first two chars are already
// mid-animation when the composition reaches frame 0.
const PRE_ROLL = 3;

/** Height of the beat-text zone used for vertical centering. */
const BEAT_ZONE_TOP = SAFE_TOP_PX;
const BEAT_ZONE_H = TOP_SECTION_CENTER_Y * 2 - SAFE_TOP_PX * 2;

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

interface HeadlineWordProps {
  word: string;
  fontChoice: FontChoice;
}

export const HeadlineWord: React.FC<HeadlineWordProps> = ({ word, fontChoice: _fontChoice }) => {
  const frame = useCurrentFrame();
  const fontFamily = FONT_FAMILY_MAP.dm_serif;

  // Only active during the first beat slot.
  if (frame >= BEAT_FRAMES) return null;

  // Background starts blurred + dark, clears as the ink bleed text resolves.
  const blurPx = interpolate(frame, [0, Math.round(BEAT_FRAMES * 0.6)], [24, 0], clamp);
  const overlayOpacity = interpolate(frame, [0, Math.round(BEAT_FRAMES * 0.5)], [0.65, 0], clamp);
  // Fade backdrop out at exit so transition to beat 1 is smooth.
  const backdropExitOpacity = interpolate(frame, [BEAT_FRAMES - EXIT_DUR, BEAT_FRAMES], [1, 0], clamp);

  return (
    <AbsoluteFill>
      {/* Full-screen backdrop: blurs the video and darkens it. Both animate away as text reveals. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backdropFilter: `blur(${blurPx}px)`,
          WebkitBackdropFilter: `blur(${blurPx}px)`,
          backgroundColor: `rgba(0,0,0,${overlayOpacity})`,
          opacity: backdropExitOpacity,
        }}
      />
      {/* Ensure grain is visible over the blur on frame 0 during headline intro. */}
      <FilmOverlayLayer seed={13} opacity={0.95 * backdropExitOpacity} />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: BEAT_ZONE_TOP,
          height: BEAT_ZONE_H,
        }}
      >
        <InkBleed
          text={word}
          frame={frame + PRE_ROLL}
          durationInFrames={BEAT_FRAMES + PRE_ROLL}
          width={VIDEO_W}
          height={BEAT_ZONE_H}
          fontSize={HEADLINE_FONT_SIZE}
          color="#ffffff"
          accentColor="#c8a96e"
          fontFamily={fontFamily}
        />
      </div>
    </AbsoluteFill>
  );
};
