/**
 * Shared helpers for per-word highlight colouring across all lyric style components.
 *
 * Usage:
 *   const hlSet = buildHighlightSet(highlightWords);
 *   // Single-span text → word spans:
 *   renderHighlightedWords(text, hlSet, accentColor)
 *   // Per-word loop:
 *   const col = isWordHighlighted(word, hlSet) ? accentColor : baseColor;
 *   // Per-char arrays (TypewriterPulse, InkBleed):
 *   const flags = buildCharHighlightFlags(text, hlSet);
 */

import React from 'react';

function normalizeWord(w: string): string {
  return w.toLowerCase().replace(/[^a-z0-9']/g, '');
}

/** Build a normalized Set for O(1) highlight lookups. */
export function buildHighlightSet(highlightWords?: string[]): Set<string> {
  if (!highlightWords?.length) return new Set();
  return new Set(highlightWords.map(normalizeWord));
}

/** True if the given word (any case/punctuation) is in the highlight set. */
export function isWordHighlighted(word: string, set: Set<string>): boolean {
  return set.size > 0 && set.has(normalizeWord(word));
}

/**
 * Replace a plain text string with word spans, colouring matched words in
 * accentColor + fontWeight 900. Non-highlighted words are plain text nodes.
 * Returns the original string if no highlights are set.
 */
export function renderHighlightedWords(
  text: string,
  hlSet: Set<string>,
  accentColor: string,
): React.ReactNode {
  if (!hlSet.size) return text;
  const parts = text.split(' ');
  return (
    <>
      {parts.map((word, i) => (
        <React.Fragment key={i}>
          {isWordHighlighted(word, hlSet) ? (
            <span style={{ color: accentColor, fontWeight: 900 }}>{word}</span>
          ) : (
            word
          )}
          {i < parts.length - 1 ? ' ' : null}
        </React.Fragment>
      ))}
    </>
  );
}

/**
 * Build a boolean[] parallel to Array.from(text) where each index is true
 * if that character belongs to a highlighted word (spaces always false).
 * Used by per-character components (TypewriterPulse, InkBleed).
 */
export function buildCharHighlightFlags(text: string, hlSet: Set<string>): boolean[] {
  const flags: boolean[] = [];
  if (!hlSet.size) {
    Array.from(text).forEach(() => flags.push(false));
    return flags;
  }
  const parts = text.split(' ');
  parts.forEach((word, wi) => {
    const hl = isWordHighlighted(word, hlSet);
    Array.from(word).forEach(() => flags.push(hl));
    if (wi < parts.length - 1) flags.push(false); // space
  });
  return flags;
}
