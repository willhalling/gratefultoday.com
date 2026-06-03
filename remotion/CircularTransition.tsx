'use client';
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';

interface CircularTransitionProps {
  startFrame: number;
  duration: number;
  mode: 'reveal' | 'fadeToBlack'; // reveal = fade in from black, fadeToBlack = fade out to black
  color?: string; // Hex color for the transition (default: black)
}

export const CircularTransition: React.FC<CircularTransitionProps> = ({
  startFrame,
  duration,
  mode,
  color = '#525252',
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Only render during the transition period
  const localFrame = frame - startFrame;
  if (localFrame < 0 || localFrame >= duration) {
    // For fadeToBlack, show color after transition completes
    if (mode === 'fadeToBlack' && localFrame >= duration) {
      return <AbsoluteFill style={{ pointerEvents: 'none', background: color }} />;
    }
    return null;
  }

  const progress = Math.min(1, localFrame / duration);
  // Ease in cubic for slow start, then accelerates
  const easedProgress = progress * progress * progress;

  // Calculate diagonal to ensure full coverage
  const diagonal = Math.sqrt(width * width + height * height);

  // For reveal: expand from 5% to 100%
  // For fadeToBlack: shrink from 100% to 0% (completely black)
  let revealRadiusPx: number;
  if (mode === 'reveal') {
    revealRadiusPx = (diagonal / 2) * 0.05 + easedProgress * (diagonal / 2) * 0.95;
  } else {
    // Reverse: start at 100%, shrink to 0%
    const reverseProgress = 1 - easedProgress;
    revealRadiusPx = Math.max(0, reverseProgress * (diagonal / 2));

    // When circle gets too small, just show full color instead
    if (revealRadiusPx < 10) {
      return <AbsoluteFill style={{ pointerEvents: 'none', background: color }} />;
    }
  }

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <svg
        width={width}
        height={height}
        style={{ position: 'absolute', top: 0, left: 0 }}
        viewBox={`0 0 ${width} ${height}`}
      >
        <defs>
          <radialGradient id={`revealMask-${mode}`}>
            <stop offset="0%" stopColor="black" stopOpacity="1" />
            <stop offset="60%" stopColor="black" stopOpacity="1" />
            <stop offset="100%" stopColor="black" stopOpacity="0" />
          </radialGradient>
          <mask id={`circleMask-${mode}`}>
            <rect width={width} height={height} fill="white" />
            <circle
              cx={width / 2}
              cy={height / 2}
              r={revealRadiusPx * 1.3}
              fill={`url(#revealMask-${mode})`}
            />
          </mask>
        </defs>
        <rect width={width} height={height} fill={color} mask={`url(#circleMask-${mode})`} />
      </svg>
    </AbsoluteFill>
  );
};
