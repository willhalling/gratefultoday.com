import React from 'react';
import { useCurrentFrame, useVideoConfig, Sequence } from 'remotion';
import type { CaptionData, CaptionStyle } from '../../lib/remotion/caption-types';
import {
  getActiveCaptionSegment,
  framesToSeconds,
  secondsToFrames,
} from '../../lib/remotion/caption-utils';
import { AnimatedTextEffect3 } from '../AnimatedTextEffect3';

interface CaptionAnimatedRendererProps {
  captionData: CaptionData;
  style?: CaptionStyle;
  captionOpacity?: number; // 0-100
  animationSpeed?: 'slow' | 'normal' | 'fast'; // Animation speed (default: slow)
}

const defaultStyle: CaptionStyle = {
  fontSize: 72,
  fontFamily: 'Inter, system-ui, sans-serif',
  color: '#F2F2EF',
  padding: 40,
  position: 'center',
  textAlign: 'center',
  lineHeight: 1.4,
  letterSpacing: '-0.01em',
};

export const CaptionAnimatedRenderer: React.FC<CaptionAnimatedRendererProps> = ({
  captionData,
  style = {},
  captionOpacity = 100,
  animationSpeed = 'slow',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = framesToSeconds(frame, fps);

  const activeSegment = getActiveCaptionSegment(captionData.segments, currentTime);
  if (!activeSegment) return null;

  const merged = { ...defaultStyle, ...style };

  // Calculate segment timing for Sequence
  const segmentStartFrame = secondsToFrames(activeSegment.startTime, fps);
  const segmentDuration = secondsToFrames(activeSegment.endTime - activeSegment.startTime, fps);

  // Calculate gradual fade-out based on animation speed
  const fadeOutDuration = animationSpeed === 'fast' ? 0.5 : animationSpeed === 'normal' ? 1.0 : 2.0;
  const segmentProgress = currentTime - activeSegment.startTime;
  const segmentLength = activeSegment.endTime - activeSegment.startTime;
  const timeRemaining = segmentLength - segmentProgress;

  let opacity = 1;
  if (timeRemaining < fadeOutDuration) {
    // Gradual fade out
    opacity = Math.max(0, timeRemaining / fadeOutDuration);
  }

  // Apply caption opacity setting (0-100 to 0-1)
  const finalOpacity = opacity * (captionOpacity / 100);

  // Use Sequence to reset frame counter for each segment
  return (
    <Sequence from={segmentStartFrame} durationInFrames={segmentDuration} key={activeSegment.id}>
      <AnimatedTextEffect3
        text={activeSegment.text}
        color={merged.color}
        position={(merged.position as any) || 'center'}
        fontSize={merged.fontSize || 72}
        opacity={finalOpacity}
        delaySeconds={0}
        font={merged.fontFamily?.includes('Inter') ? 'Inter' : 'Playfair Display'}
        animationSpeed={animationSpeed}
      />
    </Sequence>
  );
};
