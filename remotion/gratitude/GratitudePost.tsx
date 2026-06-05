import React from 'react';
import { AbsoluteFill } from 'remotion';
import { loadFont as loadPlayfair } from '@remotion/google-fonts/PlayfairDisplay';
import { BackgroundLayer } from './components/BackgroundLayer';
import { DarkenLayer } from './components/DarkenLayer';
import { FilmOverlayLayer } from './components/FilmOverlayLayer';
import { BeatText } from './components/BeatText';
import { HeadlineWord } from './components/HeadlineWord';
import { MusicTrack } from './components/MusicTrack';
import { DEFAULT_FONT_CHOICE, BEAT_LENGTH_S, FPS, type GratitudePostProps } from './constants';

// Pre-load the default font so the very first frame of a render isn't a
// flash of fallback text. Other fonts in the registry are loaded lazily as
// we add them in Phase 2.
loadPlayfair();

export const GratitudePost: React.FC<GratitudePostProps> = ({
  beats,
  background,
  music,
  fontChoice = DEFAULT_FONT_CHOICE,
  headlineWord,
}) => {
  const frameOffset = headlineWord?.trim() ? Math.round(BEAT_LENGTH_S * FPS) : 0;
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <BackgroundLayer background={background} />
      <FilmOverlayLayer />
      {/* FilmOverlayLayer added in Phase 3 */}
      {headlineWord?.trim() && (
        <HeadlineWord word={headlineWord} fontChoice={fontChoice} />
      )}
      <BeatText beats={beats} fontChoice={fontChoice} frameOffset={frameOffset} />
      <MusicTrack music={music} />
    </AbsoluteFill>
  );
};
