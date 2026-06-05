import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { loadFont as loadPlayfair } from '@remotion/google-fonts/PlayfairDisplay';
import { BackgroundLayer } from './components/BackgroundLayer';
import { DarkenLayer } from './components/DarkenLayer';
import { FilmOverlayLayer } from './components/FilmOverlayLayer';
import { BeatText } from './components/BeatText';
import { HeadlineWord } from './components/HeadlineWord';
import { MusicTrack } from './components/MusicTrack';
import { DEFAULT_FONT_CHOICE, BEAT_LENGTH_S, FPS, type GratitudePostProps } from './constants';

loadPlayfair();

const BEAT_FRAMES = Math.round(BEAT_LENGTH_S * FPS);

export const GratitudePost: React.FC<GratitudePostProps> = ({
  beats,
  background,
  backgrounds,
  music,
  fontChoice = DEFAULT_FONT_CHOICE,
  headlineWord,
}) => {
  const headlineSlotFrames = headlineWord?.trim() ? BEAT_FRAMES : 0;

  // Resolve effective background per beat.
  // Fallback chain: per-beat entry → previous beat's resolved bg → legacy single background → nothing.
  const resolvedBackgrounds: Array<{ url: string; kind: 'image' | 'video' } | undefined> = [];
  for (let i = 0; i < beats.length; i++) {
    const raw = backgrounds?.[i] ?? null;
    const resolved = raw ?? (i > 0 ? resolvedBackgrounds[i - 1] : undefined) ?? background;
    resolvedBackgrounds[i] = resolved ?? undefined;
  }

  const firstBg = resolvedBackgrounds[0];

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* Beat 1 background covers both the headline intro slot and beat 1 */}
      {firstBg && (
        <Sequence from={0} durationInFrames={headlineSlotFrames + BEAT_FRAMES} layout="none">
          <BackgroundLayer background={firstBg} durationOverride={headlineSlotFrames + BEAT_FRAMES} />
        </Sequence>
      )}
      {/* Beats 2+ get their own background sequence — hard cut at each beat boundary */}
      {beats.slice(1).map((_, i) => {
        const bg = resolvedBackgrounds[i + 1];
        if (!bg) return null;
        const from = headlineSlotFrames + (i + 1) * BEAT_FRAMES;
        return (
          <Sequence key={i} from={from} durationInFrames={BEAT_FRAMES} layout="none">
            <BackgroundLayer background={bg} durationOverride={BEAT_FRAMES} />
          </Sequence>
        );
      })}
      <FilmOverlayLayer />
      {headlineWord?.trim() && (
        <HeadlineWord word={headlineWord} fontChoice={fontChoice} background={firstBg} />
      )}
      <BeatText beats={beats} fontChoice={fontChoice} frameOffset={headlineSlotFrames} />
      <MusicTrack music={music} />
    </AbsoluteFill>
  );
};
