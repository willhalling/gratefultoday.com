/**
 * Reusable caption/subtitle renderer for Remotion videos
 * Can be used across milestone videos, video editor, and other compositions
 */

import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import type { CaptionData, CaptionStyle } from '../../lib/remotion/caption-types';
import { getActiveCaptionSegment, framesToSeconds, calculateCaptionOpacity } from '../../lib/remotion/caption-utils';

interface CaptionRendererProps {
  captionData: CaptionData;
  style?: CaptionStyle;
  fadeInDuration?: number;
  fadeOutDuration?: number;
  captionOpacity?: number; // 0-100
}

const defaultStyle: CaptionStyle = {
  fontSize: 52,
  fontFamily: 'Inter, system-ui, sans-serif',
  color: '#F2F2EF',
  backgroundColor: 'transparent',
  backgroundOpacity: 0,
  padding: 40,
  maxWidth: 900,
  position: 'center',
  textAlign: 'center',
  lineHeight: 1.4,
  letterSpacing: '-0.01em',
  textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)',
  borderRadius: 0,
};

export const CaptionRenderer: React.FC<CaptionRendererProps> = ({
  captionData,
  style = {},
  fadeInDuration = 0.3,
  fadeOutDuration = 0.3,
  captionOpacity = 100,
}) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const currentTime = framesToSeconds(frame, fps);

  const activeSegment = getActiveCaptionSegment(captionData.segments, currentTime);

  if (!activeSegment) {
    return null;
  }

  const mergedStyle = { ...defaultStyle, ...style };
  const fadeOpacity = calculateCaptionOpacity(activeSegment, currentTime, fadeInDuration, fadeOutDuration);
  const opacity = fadeOpacity * (captionOpacity / 100);

  // Calculate position based on style.position
  let topPosition = '50%';
  let transform = 'translate(-50%, -50%)';

  if (mergedStyle.position === 'top') {
    topPosition = '15%';
    transform = 'translate(-50%, 0)';
  } else if (mergedStyle.position === 'bottom') {
    topPosition = '85%';
    transform = 'translate(-50%, -100%)';
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: topPosition,
        left: '50%',
        transform,
        zIndex: 20,
        maxWidth: mergedStyle.maxWidth,
        padding: `0 ${mergedStyle.padding}px`,
        opacity,
      }}
    >
      {mergedStyle.backgroundColor !== 'transparent' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: mergedStyle.backgroundColor,
            opacity: mergedStyle.backgroundOpacity,
            borderRadius: mergedStyle.borderRadius,
          }}
        />
      )}
      <div
        style={{
          position: 'relative',
          padding: mergedStyle.backgroundColor !== 'transparent' ? mergedStyle.padding : 0,
        }}
      >
        <p
          style={{
            fontSize: mergedStyle.fontSize,
            fontFamily: mergedStyle.fontFamily,
            color: mergedStyle.color,
            textAlign: mergedStyle.textAlign,
            lineHeight: mergedStyle.lineHeight,
            letterSpacing: mergedStyle.letterSpacing,
            textShadow: mergedStyle.textShadow,
            margin: 0,
            whiteSpace: 'normal',
            fontWeight: 400,
            wordBreak: 'keep-all',
            overflowWrap: 'break-word',
            hyphens: 'none',
          }}
        >
          {activeSegment.text.split(' ').map((word, i) => (
            <span key={i} style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>
              {word}{' '}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
};
