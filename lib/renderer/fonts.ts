/**
 * lib/renderer/fonts.ts — font loading for the Canvas2D renderer, replacing
 * @remotion/google-fonts' loadFont + remotion/fonts/load-theme-fonts.ts.
 *
 * ⚠️  The renderer's font loading MUST fully resolve before any text is
 * measured or drawn — Canvas2D measureText silently falls back to system
 * fonts otherwise, and every lyric/layout line-width computed from the wrong
 * metrics shifts the whole composition. session.ts awaits these loaders in
 * its prepare phase, before frame 0.
 *
 * Two mechanisms, both replicated from the Remotion path:
 *   1. FontFace API (`loadRendererFonts`) — direct woff2 URLs.
 *   2. Google Fonts CSS API (`loadThemeFont`) — injects a css2 stylesheet and
 *      polls document.fonts.load until the face is usable, exactly how
 *      remotion/fonts/load-theme-fonts.ts loads Noto Sans SC. THEME_FONTS
 *      (constants/fonts.ts) are all Google families, so this covers them.
 */

import { THEME_FONTS, type ThemeFontKey } from '@/constants/fonts';

export interface RendererFontFace {
  family: string;
  /** Font source: a font file URL or a full CSS `src` descriptor value. */
  source: string;
  /** CSS weight: '400', '100 900' for variable fonts, etc. Default '400'. */
  weight?: string;
  style?: string;
  unicodeRange?: string;
}

/**
 * Register and load a set of font faces via the FontFace API. Resolves only
 * once every face is usable for measureText/fillText. Throws on failure —
 * callers that can tolerate a fallback should catch.
 */
export async function loadRendererFonts(faces: RendererFontFace[]): Promise<void> {
  if (typeof document === 'undefined' || typeof FontFace === 'undefined') return;
  await Promise.all(
    faces.map(async ({ family, source, weight = '400', style = 'normal', unicodeRange }) => {
      const src = source.startsWith('url(') ? source : `url(${source}) format('woff2')`;
      const face = new FontFace(family, src, { style, weight, unicodeRange });
      const loaded = await face.load();
      document.fonts.add(loaded);
      // Force instantiation so the first measured frame never falls back.
      await document.fonts.load(`${weight} 20px "${family}"`);
    }),
  );
}

// ─── THEME_FONTS via the Google Fonts CSS API ───────────────────────────────

const loadedThemeFonts = new Set<string>();
const loadingThemeFonts = new Map<string, Promise<void>>();

/**
 * Load one Google font family at the given weights through the css2 API and
 * wait until every weight is usable. Never rejects: a failed load is
 * remembered so the render continues with the fallback chain instead of
 * hanging the prepare phase.
 */
export function loadGoogleFontFamily(family: string, weights: string[]): Promise<void> {
  const cacheKey = `${family}:${weights.join(',')}`;
  if (loadedThemeFonts.has(cacheKey)) return Promise.resolve();
  const existing = loadingThemeFonts.get(cacheKey);
  if (existing) return existing;

  const promise = (async () => {
    if (typeof document === 'undefined') return;

    const linkId = `renderer-font-${family.replace(/\s+/g, '-').toLowerCase()}`;
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
        family,
      )}:wght@${weights.join(';')}&display=swap`;
      document.head.appendChild(link);
    }

    // Poll until every weight is ready (max ~3s per weight).
    const start = Date.now();
    for (const weight of weights) {
      while (Date.now() - start < 3000) {
        const ready = await document.fonts.load(`${weight} 16px "${family}"`).catch(() => []);
        if (ready.length > 0) break;
        await new Promise((r) => setTimeout(r, 100));
      }
    }
  })()
    .catch(() => {
      // Allow the render to continue with a fallback.
    })
    .then(() => {
      loadedThemeFonts.add(cacheKey);
      loadingThemeFonts.delete(cacheKey);
    });

  loadingThemeFonts.set(cacheKey, promise);
  return promise;
}

/** Load a single THEME_FONTS entry so Canvas2D can use it. Idempotent. */
export function loadThemeFont(key: ThemeFontKey): Promise<void> {
  const entry = THEME_FONTS[key];
  if (!entry) return Promise.resolve();
  return loadGoogleFontFamily(entry.name, [...entry.weights]);
}

/**
 * TikTok Sans — the TikTok layout's single typeface for hook / lyrics /
 * outro credit (roughclip remotion/fonts/load-tiktok-sans.ts). Weights
 * 300–900 cover the full mood→weight map; the css2 response's unicode-range
 * slices serve latin + latin-ext (accented Latin lyrics), CJK/Arabic/
 * Devanagari fall back to the Noto chain. Idempotent.
 */
export function loadTikTokSans(): Promise<void> {
  return loadGoogleFontFamily('TikTok Sans', ['300', '400', '500', '600', '700', '800', '900']);
}

/** Script fallback families the DOM overlays rely on (Noto for
 * Arabic/Devanagari/CJK), from remotion/fonts/load-theme-fonts.ts. */
const SCRIPT_FALLBACK_FONTS: { family: string; weights: string[] }[] = [
  { family: 'Noto Sans Arabic', weights: ['400', '500', '600', '700', '800', '900'] },
  { family: 'Noto Sans Devanagari', weights: ['400', '500', '600', '700', '800', '900'] },
  { family: 'Noto Sans SC', weights: ['400', '500', '600', '700', '900'] },
];

/**
 * Everything remotion/fonts/load-theme-fonts.ts registers: all THEME_FONTS
 * families (Cormorant Garamond is a load-theme-fonts-only extra, kept here
 * with its 700/latin specificity) plus the script fallbacks.
 */
export function loadAllRendererFonts(): Promise<void> {
  const themeFaces = Object.values(THEME_FONTS).map((entry) =>
    loadGoogleFontFamily(entry.name, [...entry.weights]),
  );
  return Promise.all([
    ...themeFaces,
    loadGoogleFontFamily('Cormorant Garamond', ['700']),
    ...SCRIPT_FALLBACK_FONTS.map((f) => loadGoogleFontFamily(f.family, f.weights)),
  ]).then(() => undefined);
}

/** Resolve a theme font key to its display family name. */
export function themeFontFamily(key: ThemeFontKey | undefined): string {
  if (!key) return 'Inter';
  return THEME_FONTS[key]?.name ?? 'Inter';
}

/**
 * CSS font shorthand for a renderer text role, with the same script fallback
 * chain the DOM overlays use (Noto for Arabic/Devanagari/CJK).
 */
export function rendererFontString(weight: number, sizePx: number, family: string): string {
  return `${weight} ${sizePx}px '${family}', 'Noto Sans Arabic', 'Noto Sans Devanagari', 'Noto Sans SC', system-ui, sans-serif`;
}
