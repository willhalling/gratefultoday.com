import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Video } from '@remotion/media';
import { IMAGE_ZOOM_END } from '../constants';

interface BackgroundLayerProps {
  background?: {
    url: string;
    kind: 'image' | 'video';
  };
}

export const BackgroundLayer: React.FC<BackgroundLayerProps> = ({ background }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  if (!background) {
    return <AbsoluteFill style={{ backgroundColor: '#0a0a0a' }} />;
  }

  if (background.kind === 'video') {
    // <Video> from @remotion/media works in both server renders and
    // @remotion/web-renderer (which does NOT support <OffthreadVideo>).
    return (
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        <Video
          src={background.url}
          muted
          objectFit="cover"
          style={{
            width: '100%',
            height: '100%',
          }}
        />
      </AbsoluteFill>
    );
  }

  // Linear ken-burns zoom 1.0 -> IMAGE_ZOOM_END across the whole clip.
  const scale = interpolate(frame, [0, Math.max(durationInFrames - 1, 1)], [1, IMAGE_ZOOM_END], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Img
        src={background.url}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      />
    </AbsoluteFill>
  );
};
