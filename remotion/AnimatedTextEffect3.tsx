'use client';
import React, { useEffect } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';

interface AnimatedTextEffect3Props {
  text: string;
  color?: string;
  position?:
    | 'top-left'
    | 'top-center'
    | 'top-right'
    | 'center-left'
    | 'center'
    | 'center-right'
    | 'bottom-left'
    | 'bottom-center'
    | 'bottom-right';
  fontSize?: number; // font size in pixels
  opacity?: number; // opacity 0-1
  delaySeconds?: number; // delay before animation starts
  font?: 'Playfair Display' | 'Inter'; // font family (default: Playfair Display)
  animationSpeed?: 'normal' | 'fast' | 'slow'; // animation speed (default: slow for captions)
}

// Implements Moving Letters Effect #3 (opacity stagger + fade out), frame-based
export const AnimatedTextEffect3: React.FC<AnimatedTextEffect3Props> = ({
  text,
  color = '#ffffff',
  position = 'center',
  fontSize = 96,
  opacity = 1,
  delaySeconds = 0,
  font = 'Playfair Display',
  animationSpeed = 'slow',
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  // Parameters derived from original JS - adjust based on speed
  const perLetterDelayMs = animationSpeed === 'slow' ? 80 : animationSpeed === 'fast' ? 40 : 50; // delay step per letter
  const letterDurationMs =
    animationSpeed === 'slow' ? 2500 : animationSpeed === 'fast' ? 600 : 1200; // opacity tween duration
  // No fade-out and no looping per request

  // Split text into words and then characters to prevent mid-word breaks
  // Handle newlines and spaces separately
  const wordStructures = React.useMemo(() => {
    let globalIndex = 0;
    const parts: Array<{
      type: 'word' | 'newline' | 'space';
      letters?: Array<{ char: string; index: number }>;
    }> = [];

    // Split by newlines first
    const lines = text.split('\n');
    lines.forEach((line, lineIdx) => {
      // Split each line by spaces
      const words = line.split(' ');
      words.forEach((word, wordIdx) => {
        if (word.length > 0) {
          parts.push({
            type: 'word',
            letters: Array.from(word).map((ch) => ({
              char: ch,
              index: globalIndex++,
            })),
          });
        }
        // Add space after word (except last word in line)
        if (wordIdx < words.length - 1) {
          parts.push({ type: 'space' });
        }
      });
      // Add newline after line (except last line)
      if (lineIdx < lines.length - 1) {
        parts.push({ type: 'newline' });
      }
    });

    return parts;
  }, [text]);

  // Compute time since composition start (no loop), accounting for delay
  const localTimeMs = (frame / fps) * 1000 - delaySeconds * 1000;

  // Easing functions
  const easeInOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
  // Keep available for future smoothing variants (not used now)

  // Load fonts in browser
  useEffect(() => {
    if (typeof document === 'undefined') return;

    // Load Playfair Display
    const playfairId = 'playfair-display-font';
    if (!document.getElementById(playfairId)) {
      const playfairLink = document.createElement('link');
      playfairLink.id = playfairId;
      playfairLink.rel = 'stylesheet';
      playfairLink.href =
        'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&display=swap';
      document.head.appendChild(playfairLink);
    }

    // Load Inter
    const interId = 'inter-font';
    if (!document.getElementById(interId)) {
      const interLink = document.createElement('link');
      interLink.id = interId;
      interLink.rel = 'stylesheet';
      interLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@700;900&display=swap';
      document.head.appendChild(interLink);
    }
  }, []);

  // Calculate positioning based on position prop
  const getPositionStyles = () => {
    // Much larger padding to avoid YouTube play buttons and controls
    const horizontalPadding = 80;
    const verticalPadding = 160; // Increased significantly for top and bottom
    const styles: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'row', // Explicit: main axis = horizontal, cross axis = vertical
      pointerEvents: 'none',
      color,
      paddingLeft: horizontalPadding,
      paddingRight: horizontalPadding,
      paddingTop: verticalPadding,
      paddingBottom: verticalPadding,
    };

    // Horizontal positioning (left/center/right) - justifyContent controls main axis
    if (position.endsWith('left')) {
      styles.justifyContent = 'flex-start';
    } else if (position.endsWith('right')) {
      styles.justifyContent = 'flex-end';
    } else {
      styles.justifyContent = 'center';
    }

    // Vertical positioning (top/center/bottom) - alignItems controls cross axis
    if (position.startsWith('top')) {
      styles.alignItems = 'flex-start';
    } else if (position.startsWith('bottom')) {
      styles.alignItems = 'flex-end';
    } else {
      styles.alignItems = 'center';
    }

    return styles;
  };

  // Get text alignment based on position
  const getTextAlign = (): React.CSSProperties['textAlign'] => {
    if (position.endsWith('left')) return 'left';
    if (position.endsWith('right')) return 'right';
    return 'center';
  };

  return (
    <AbsoluteFill style={getPositionStyles()}>
      <div
        style={{
          fontWeight: 900,
          fontSize,
          textAlign: getTextAlign(),
          fontFamily: font === 'Inter' ? 'Inter, sans-serif' : 'Playfair Display, serif',
          opacity: opacity,
          maxWidth: '90%',
          letterSpacing: '0.1em',
          wordBreak: 'keep-all',
          overflowWrap: 'normal',
          hyphens: 'none',
        }}
      >
        {wordStructures.map((part, partIdx) => {
          if (part.type === 'newline') {
            return <br key={`br-${partIdx}`} />;
          }

          if (part.type === 'space') {
            return (
              <span key={`space-${partIdx}`} style={{ display: 'inline-block', width: '0.25em' }} />
            );
          }

          // type === 'word'
          const wordLetters = part.letters!.map((letterData, letterIdx) => {
            const startMs = perLetterDelayMs * (letterData.index + 1);
            const endMs = startMs + letterDurationMs;
            let letterOpacity = 0;
            if (localTimeMs <= startMs) {
              letterOpacity = 0;
            } else if (localTimeMs >= endMs) {
              letterOpacity = 1;
            } else {
              const t = Math.min(1, Math.max(0, (localTimeMs - startMs) / letterDurationMs));
              letterOpacity = easeInOutQuad(t);
            }
            // Apply global opacity to letter opacity
            const finalOpacity = letterOpacity * opacity;

            return (
              <span
                key={`${partIdx}-${letterIdx}`}
                style={{ display: 'inline-block', opacity: finalOpacity }}
              >
                {letterData.char}
              </span>
            );
          });

          // Wrap each word's letters in a nowrap container to prevent mid-word breaks
          return (
            <span
              key={`word-${partIdx}`}
              style={{
                display: 'inline-block',
                whiteSpace: 'nowrap',
              }}
            >
              {wordLetters}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
