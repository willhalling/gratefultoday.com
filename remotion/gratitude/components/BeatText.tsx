import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import {
  BEAT_FONTSIZE,
  BEAT_LENGTH_S,
  FADE_S,
  FPS,
  LETTER_SPACING_PX,
  PILL_BG_OPACITY,
  PILL_LINE_GAP_PX,
  PILL_PAD_X,
  PILL_PAD_Y,
  PILL_RADIUS,
  SAFE_TOP_PX,
  TOP_SECTION_CENTER_Y,
  VIDEO_W,
  type FontChoice,
} from '../constants';
import { wrapBeat } from '../textLayout';

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

const FONT_WEIGHT_MAP: Record<FontChoice, number> = {
  playfair: 700,
  cormorant: 700,
  dm_serif: 400,
  tenor: 400,
  cinzel: 700,
  bebas: 400,
  anton: 400,
  montserrat: 700,
  inter: 500,
  ibm_plex: 500,
  avenir: 500,
  helvetica: 500,
};

interface BeatLineProps {
  text: string;
  fontFamily: string;
  fontWeight: number;
}

const BeatLine: React.FC<BeatLineProps> = ({ text, fontFamily, fontWeight }) => {
  return (
    <div
      style={{
        backgroundColor: `rgba(0, 0, 0, ${PILL_BG_OPACITY / 255})`,
        borderRadius: PILL_RADIUS,
        padding: `${PILL_PAD_Y}px ${PILL_PAD_X}px`,
        color: '#ffffff',
        fontFamily,
        fontWeight,
        fontSize: BEAT_FONTSIZE,
        letterSpacing: `${LETTER_SPACING_PX}px`,
        lineHeight: 1.1,
        whiteSpace: 'nowrap',
        display: 'inline-block',
      }}
    >
      {text}
    </div>
  );
};

interface BeatBlockProps {
  beat: string;
  fontChoice: FontChoice;
  startFrame: number;
  endFrame: number;
}

const BeatBlock: React.FC<BeatBlockProps> = ({ beat, fontChoice, startFrame, endFrame }) => {
  const frame = useCurrentFrame();
  const fadeFrames = Math.round(FADE_S * FPS);
  const fadeInStart = startFrame;
  const fadeOutStart = Math.max(endFrame - fadeFrames, fadeInStart);

  // First beat is on screen at frame 0 (no fade-in), matching Python branch.
  const opacityIn =
    startFrame <= 0
      ? 1
      : interpolate(frame, [fadeInStart, fadeInStart + fadeFrames], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
  const opacityOut = interpolate(frame, [fadeOutStart, fadeOutStart + fadeFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const opacity = Math.min(opacityIn, opacityOut);

  const lines = wrapBeat(beat);
  const fontFamily = FONT_FAMILY_MAP[fontChoice];
  const fontWeight = FONT_WEIGHT_MAP[fontChoice];

  return (
    <AbsoluteFill style={{ opacity }}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: SAFE_TOP_PX,
          // Anchor block so its visual center sits near TOP_SECTION_CENTER_Y.
          // Translate up by half its rendered height via flex centering on a
          // bounded container.
          height: TOP_SECTION_CENTER_Y * 2 - SAFE_TOP_PX * 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: PILL_LINE_GAP_PX,
          width: VIDEO_W,
          textAlign: 'center',
        }}
      >
        {lines.map((line, idx) => (
          <BeatLine key={idx} text={line} fontFamily={fontFamily} fontWeight={fontWeight} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

interface BeatTextProps {
  beats: string[];
  fontChoice: FontChoice;
  /** Frame offset applied to all beats — used when a headline word precedes them. */
  frameOffset?: number;
}

export const BeatText: React.FC<BeatTextProps> = ({ beats, fontChoice, frameOffset = 0 }) => {
  const beatFrames = Math.round(BEAT_LENGTH_S * FPS);
  const frame = useCurrentFrame();
  return (
    <>
      {beats
        .filter((b) => b.trim())
        .map((beat, idx) => {
          const startFrame = idx * beatFrames + frameOffset;
          const endFrame = startFrame + beatFrames;
          // Only mount around the active window to avoid measuring inactive beats.
          if (frame < startFrame - 1 || frame > endFrame + 1) return null;
          return (
            <BeatBlock
              key={idx}
              beat={beat}
              fontChoice={fontChoice}
              startFrame={startFrame}
              endFrame={endFrame}
            />
          );
        })}
    </>
  );
};
