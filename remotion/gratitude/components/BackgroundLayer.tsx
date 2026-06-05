import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Video } from '@remotion/media';
import { IMAGE_ZOOM_END } from '../constants';

interface BackgroundLayerProps {
  background?: {
    url: string;
    kind: 'image' | 'video';
  };
  /**
   * Extra styles applied directly to the <Img> or <Video> element.
   * Use this to pass filter: blur() so the blur is on the media element
   * itself — the Remotion client-side renderer supports filter on elements
   * directly but not on wrapper divs containing media.
   */
  mediaStyle?: React.CSSProperties;
  /**
   * When rendering inside a Remotion <Sequence>, useVideoConfig().durationInFrames
   * still returns the full video duration rather than the sequence duration.
   * Pass the sequence's own duration here so the ken-burns zoom animates
   * correctly over just this background's visible window.
   */
  durationOverride?: number;
}

export const BackgroundLayer: React.FC<BackgroundLayerProps> = ({ background, mediaStyle, durationOverride }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const effectiveDuration = durationOverride ?? durationInFrames;

  if (!background) {
    return <AbsoluteFill style={{ backgroundColor: '#0a0a0a', ...mediaStyle }} />;
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
            ...mediaStyle,
          }}
        />
      </AbsoluteFill>
    );
  }

  // Linear ken-burns zoom 1.0 -> IMAGE_ZOOM_END across this background's window.
  const scale = interpolate(frame, [0, Math.max(effectiveDuration - 1, 1)], [1, IMAGE_ZOOM_END], {
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
          ...mediaStyle,
        }}
      />
    </AbsoluteFill>
  );
};
