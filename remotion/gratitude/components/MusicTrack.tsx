import React from 'react';
import { Audio, useVideoConfig } from 'remotion';

interface MusicTrackProps {
  music?: {
    url: string;
  };
}

export const MusicTrack: React.FC<MusicTrackProps> = ({ music }) => {
  const { durationInFrames, fps } = useVideoConfig();

  if (!music) {
    return null;
  }

  // Loop is implicit when source is shorter than the composition.
  // We let Remotion handle clipping at durationInFrames.
  return (
    <Audio
      src={music.url}
      volume={1}
      // Trim to composition length so encoder writes a single contiguous track.
      endAt={durationInFrames}
      // Keep playbackRate at 1 to avoid pitch/tempo drift vs ffmpeg afade/amix output.
      playbackRate={1}
      // Help long files start at zero like ffmpeg's stream_loop behavior.
      startFrom={0}
      // fps reference (no-op visually) keeps prop signature explicit.
      data-fps={fps}
    />
  );
};
