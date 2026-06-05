/**
 * INK BLEED
 *
 * Best for 1–2 word phrases. Characters bloom in from a blurred, oversized
 * state and resolve into crisp letterforms — left to right across all chars.
 * A warm accent undertone at entry cools to the target colour once settled.
 */

import React from 'react';
import { interpolate } from 'remotion';
import type { LyricStyleProps } from './types';
import { useJustifiedLayout } from './useJustifiedLayout';
import { buildHighlightSet, isWordHighlighted } from './highlightUtils';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

export const InkBleed: React.FC<LyricStyleProps> = ({
  text,
  frame,
  durationInFrames,
  width,
  height,
  color = '#ffffff',
  accentColor = '#c8a96e',
  fontFamily = 'Inter, Helvetica Neue, Arial, sans-serif',
  fontSize,
  highlightWords,
}) => {
  const hlSet = buildHighlightSet(highlightWords);
  const layout = useJustifiedLayout(text, width, height, {
    fontFamily,
    fontWeight: 700,
    letterSpacingEm: 0.03,
    lineHeightRatio: 1.1,
    fontSize,
  });
  const { subLines, lineFontSizes, containerW, blockH, lineHeightRatio } = layout;

  // All characters across all words stagger left→right from frame 0.
  // SETTLE: frames each char takes to resolve.
  // STAGGER: frames between each successive character start.
  const SETTLE  = 6;
  const STAGGER = 2;
  const EXIT_DUR = 10;

  // Count total chars (excl. spaces) to know when the last one finishes
  const allChars = subLines.flat().join('');
  const totalChars = Array.from(allChars).length;
  // Ensure the final char always has SETTLE frames before exit
  const latestStart = durationInFrames - EXIT_DUR - SETTLE;
  // If too many chars to fit, compress stagger
  const effectiveStagger = totalChars > 1
    ? Math.min(STAGGER, Math.floor(latestStart / (totalChars - 1)))
    : STAGGER;

  const exitStart   = durationInFrames - EXIT_DUR;
  const exitOpacity = interpolate(frame, [exitStart, durationInFrames], [1, 0], clamp);

  // Pre-compute cumulative char start offsets per word to avoid mutation during render
  const wordCharStarts: number[][] = [];
  {
    let running = 0;
    for (const lineWords of subLines) {
      const lineStarts: number[] = [];
      for (const rawWord of lineWords) {
        lineStarts.push(running);
        running += Array.from(rawWord.toUpperCase()).length;
      }
      wordCharStarts.push(lineStarts);
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        opacity: exitOpacity,
      }}
    >
      <div style={{ width: containerW, height: blockH }}>
        {subLines.map((lineWords, li) => {
          const fs = lineFontSizes[li];

          return (
            <div
              key={li}
              style={{
                height: fs * lineHeightRatio,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily,
                fontSize: fs,
                fontStyle: 'italic',
                fontWeight: 700,
                letterSpacing: '0.03em',
                userSelect: 'none',
                lineHeight: 1,
              }}
            >
              {lineWords.map((rawWord, wi) => {
                const displayText = rawWord.toUpperCase();
                const chars       = Array.from(displayText);
                const wordIsHL    = isWordHighlighted(rawWord, hlSet);

                const wordCharStart = wordCharStarts[li][wi];

                return (
                  <React.Fragment key={wi}>
                    {wi > 0 && <span style={{ width: '0.3em', display: 'inline-block' }} />}

                    {chars.map((ch, ci) => {
                      const charStart = (wordCharStart + ci) * effectiveStagger;
                      const rawT      = interpolate(frame, [charStart, charStart + SETTLE], [0, 1], clamp);
                      const easedT    = easeOutQuart(rawT);

                      const blur  = interpolate(easedT, [0, 1], [12, 0], clamp);
                      const scale = interpolate(easedT, [0, 1], [1.4, 1.0], clamp);
                      const opacity = interpolate(Math.min(rawT * 2.5, 1), [0, 1], [0, 1], clamp);
                      const blendedColor = (interpolate(easedT, [0, 1], [1, 0], clamp) > 0.05 || wordIsHL)
                        ? accentColor
                        : color;

                      return (
                        <span
                          key={ci}
                          style={{
                            display: 'inline-block',
                            opacity,
                            transform: `scale(${scale})`,
                            transformOrigin: 'center bottom',
                            filter: `blur(${blur}px)`,
                            color: blendedColor,
                            textShadow: blur > 1
                              ? `0 0 ${Math.round(blur * 3)}px ${accentColor}88`
                              : undefined,
                          }}
                        >
                          {ch}
                        </span>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
