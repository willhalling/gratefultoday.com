import React from 'react';
import { AbsoluteFill } from 'remotion';
import { loadFont as loadPlayfair } from '@remotion/google-fonts/PlayfairDisplay';
import { BackgroundLayer } from './components/BackgroundLayer';
import { DarkenLayer } from './components/DarkenLayer';
import { FilmOverlayLayer } from './components/FilmOverlayLayer';
import { BeatText } from './components/BeatText';
import { MusicTrack } from './components/MusicTrack';
import { DEFAULT_FONT_CHOICE, type GratitudePostProps } from './constants';

// Pre-load the default font so the very first frame of a render isn't a
// flash of fallback text. Other fonts in the registry are loaded lazily as
// we add them in Phase 2.
loadPlayfair();

export const GratitudePost: React.FC<GratitudePostProps> = ({
  beats,
  background,
  music,
  fontChoice = DEFAULT_FONT_CHOICE,
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <BackgroundLayer background={background} />
      <FilmOverlayLayer />
      {/* FilmOverlayLayer added in Phase 3 */}
      <BeatText beats={beats} fontChoice={fontChoice} />
      <MusicTrack music={music} />
    </AbsoluteFill>
  );
};
