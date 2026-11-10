/**
 * Language / script detection helpers for lyric rendering and layout.
 *
 * These are intentionally small and synchronous: they run inside Remotion
 * compositions and the lyric editor, so they must not depend on heavy libraries
 * or async APIs.
 */

/** ISO-639-1 codes that are written right-to-left. */
const RTL_LANGUAGE_CODES = new Set([
  'ar', // Arabic
  'he', // Hebrew
  'fa', // Persian/Farsi
  'ur', // Urdu
]);

/** Returns true if the given ISO-639-1 language is normally written RTL. */
export function isRtlLanguage(code?: string | null): boolean {
  if (!code) return false;
  return RTL_LANGUAGE_CODES.has(code.toLowerCase());
}

/**
 * Returns true if the text contains characters outside the Latin alphabet.
 * Used to disable English-specific styling such as text-transform: uppercase
 * or Latin-only glyph-width estimates.
 */
export function hasNonLatinScript(text: string): boolean {
  if (!text) return false;
  for (let i = 0; i < text.length; i++) {
    const cp = text.codePointAt(i);
    if (cp === undefined) continue;
    // Basic Latin + Latin-1 Supplement + Latin Extended-A/B/C/D
    if (cp > 0x007f && !(cp >= 0x00c0 && cp <= 0x024f)) {
      return true;
    }
  }
  return false;
}

/**
 * Returns true if the text contains CJK characters. Chinese lyrics pasted
 * without spaces need special segmentation/line-breaking treatment.
 */
export function hasCjkScript(text: string): boolean {
  if (!text) return false;
  for (let i = 0; i < text.length; i++) {
    const cp = text.codePointAt(i);
    if (cp === undefined) continue;
    // CJK Unified Ideographs, Hiragana, Katakana, Hangul Syllables
    if (
      (cp >= 0x4e00 && cp <= 0x9fff) ||
      (cp >= 0x3040 && cp <= 0x309f) ||
      (cp >= 0x30a0 && cp <= 0x30ff) ||
      (cp >= 0xac00 && cp <= 0xd7af)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Returns true if the text contains Arabic script characters (including
 * Arabic, Persian, Urdu, and Ajami Hausa).
 */
export function hasArabicScript(text: string): boolean {
  if (!text) return false;
  for (let i = 0; i < text.length; i++) {
    const cp = text.codePointAt(i);
    if (cp === undefined) continue;
    if (cp >= 0x0600 && cp <= 0x06ff) return true;
    if (cp >= 0x0750 && cp <= 0x077f) return true;
    if (cp >= 0x08a0 && cp <= 0x08ff) return true;
    if (cp >= 0xfb50 && cp <= 0xfdff) return true;
    if (cp >= 0xfe70 && cp <= 0xfeff) return true;
  }
  return false;
}

/**
 * Returns true if the text contains Devanagari characters (Hindi, Marathi,
 * Sanskrit, Nepali, etc.).
 */
export function hasDevanagariScript(text: string): boolean {
  if (!text) return false;
  for (let i = 0; i < text.length; i++) {
    const cp = text.codePointAt(i);
    if (cp === undefined) continue;
    if (cp >= 0x0900 && cp <= 0x097f) return true;
  }
  return false;
}

/**
 * Font-family stack that appends Noto fallback fonts for Arabic, Devanagari,
 * and CJK scripts. Use this anywhere lyrics are rendered so non-Latin glyphs
 * still resolve when the active theme font only covers Latin.
 */
export function withScriptFallbackFonts(baseFont?: string | null): string {
  const fallbacks =
    "'Noto Sans Arabic', 'Noto Sans Devanagari', 'Noto Sans SC', system-ui, sans-serif";
  if (baseFont && baseFont.trim()) {
    return `${baseFont}, ${fallbacks}`;
  }
  return `Inter, ${fallbacks}`;
}
