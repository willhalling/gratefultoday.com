/**
 * Aesthetics registry — the single source of truth for curated visual worlds.
 *
 * An aesthetic is a curated bundle: colour grade + overlays + camera motion +
 * motion effect + an editing grammar (shot lengths, cut intensity, transition
 * palette) + a media pool recipe (stockQuery / pinned assets) that the
 * cut-world renderer loops for the full length of the song.
 *
 * Pure data only (no React imports) so the drawer, the affinity scorer and
 * generation code can all consume it.
 *
 * Ported from roughclip's aesthetics system and translated to wavecanvas
 * registry ids — roughclip ids (e.g. grade 'signature-vivid') do not exist
 * here; each recipe references the closest wavecanvas option.
 *
 * Adding a new aesthetic:
 *   1. Add an entry to AESTHETICS_REGISTRY below. Every visual.* id must
 *      reference an existing option in its target registry:
 *        colourGradePreset → lib/renderer/vendor/three/colourGrade.ts (GRADE_PRESETS)
 *        overlayEffects    → constants/overlays.ts (OVERLAY_OPTIONS)
 *        cameraMotion      → lib/renderer/vendor/three/camera/cameraMotion.ts (CAMERA_MOTION_OPTIONS)
 *        motionEffect      → constants/atmosphere.ts (ATMOSPHERE_OPTIONS)
 *   2. Run `npm run validate:visual-registries` — broken references fail loudly.
 *
 * NAMING — hard rules, non-negotiable:
 *   - Name the FEELING or the lived moment, never the subject.
 *     "LAST SUMMER ON TAPE", "BASEMENT TAPES", "VAST QUIET" — not
 *     "VHS CLUB", "FIRESIDE", "SLASHER".
 *   - Test: if the name could be a stock-photo search query, it's wrong.
 *     If it could be a song title that makes you feel something, it's right.
 *   - The description completes the thought; the name must carry the card alone.
 *   - Names are ALL CAPS, short, and changeable. ids are kebab-case and
 *     PERMANENT — saved videos reference them (activeAestheticId), so never
 *     rename an id, only the display name.
 */

export type AestheticEnergy = 'low' | 'mid' | 'high';

export type AestheticTransition = 'cut' | 'flash' | 'crossfade';

export interface AestheticDefinition {
  id: string;
  name: string;
  description: string;
  /** Drawer search terms — genre words, moods, era markers, subject nouns. */
  searchTags: string[];
  /** Affinity metadata consumed by the recommendation scorer (a nudge, never
   *  a filter — picking "wrong" on purpose is a feature). */
  affinity: {
    energies: AestheticEnergy[];
    bpmRange?: [number, number];
    /** Matched against SongAnalysis mood / emotionProfile (fuzzy). */
    moods?: string[];
    genres?: string[];
  };
  /** Visual recipe — every id must exist in its target registry (see header). */
  visual: {
    colourGradePreset: string;
    colourGradeIntensity: number;
    overlayEffects: string[];
    cameraMotion?: string;
    /** 0–1, see cameraIntensityScale in cameraMotion.ts. */
    cameraMotionIntensity?: number;
    motionEffect?: string;
    motionEffectIntensity?: number;
  };
  /** Editing grammar — consumed by the cut-world media pool resolver. */
  editing: {
    /** Allowed shot lengths in beats, e.g. [2, 4]. */
    shotDurationBeats: number[];
    /** 0–1 — how aggressively high-energy windows shorten shots. */
    cutIntensity: number;
    transitions: AestheticTransition[];
  };
  /** Media pool recipe. */
  media: {
    /** Curated stock search query — the taste lives here. */
    stockQuery: string;
    /** Frozen curated picks (filled in by the phase-3 sync script). */
    pinnedAssetIds?: string[];
    /** Target pool size, 10–14. */
    poolTargetSize: number;
    /** Fraction of the pool that is video (roughly a quarter). */
    videoRatio?: number;
  };
  /** Typography + visualizer that complete the look, applied with it (undo
   *  restores the previous ones). Free visualizers only — curated aesthetics
   *  stay free to export. */
  pairing?: {
    /** constants/fonts.ts THEME_FONTS key — also the lyric typography. */
    font?: string;
    /** constants/visualizers.ts preset id (never a Pro/WebGL preset). */
    visualizer?: string;
  };
  /** Drawer card thumbnail — /public path. */
  thumbnail: string;
  /** Seasonal surfacing window (local date, yearly recurring). */
  seasonal?: {
    opens: string;   // 'MM-DD'
    closes: string;  // 'MM-DD'
    label: string;   // 'Christmas', 'Halloween', "New Year's Eve"
    /** exclusive = hidden outside window; boosted = always listed, boosted in window */
    mode: 'exclusive' | 'boosted';
  };
}

/**
 * Seasonal window check against the client's local date (no timezone
 * cleverness). Returns null for non-seasonal aesthetics. Handles
 * year-wrapping windows (e.g. opens 12-26, closes 01-01 → in-window when
 * date ≥ opens OR date ≤ closes). Window boundaries are inclusive; closes
 * '01-01' means the New Year's Eve aesthetic stays up through Jan 1.
 */
export function getSeasonalState(
  aesthetic: AestheticDefinition,
  now: Date,
): 'in-window' | 'out-of-window' | null {
  const s = aesthetic.seasonal;
  if (!s) return null;
  const toDayOfYear = (mmdd: string): number => {
    const [mm, dd] = mmdd.split('-').map((n) => parseInt(n, 10));
    return mm * 100 + dd; // comparable MMDD int — not a real ordinal, but monotonic
  };
  const today = (now.getMonth() + 1) * 100 + now.getDate();
  const opens = toDayOfYear(s.opens);
  const closes = toDayOfYear(s.closes);
  const inWindow =
    opens <= closes
      ? today >= opens && today <= closes
      : today >= opens || today <= closes; // year-wrap
  return inWindow ? 'in-window' : 'out-of-window';
}

export const AESTHETICS_REGISTRY: AestheticDefinition[] = [
  {
    id: 'vhs-club',
    name: 'LAST SUMMER ON TAPE',
    description: "Blown highlights, home-video texture and summers you can't quite get back.",
    searchTags: ['camcorder', 'home video', 'nostalgia', 'retro', 'summer', 'friends', 'memory', 'vhs', '90s', 'party', 'flash', 'imperfect'],
    affinity: {
      energies: ['mid', 'high'],
      bpmRange: [90, 140],
      moods: ['nostalgic', 'joyful', 'euphoric'],
      genres: ['pop', 'dance', 'indie'],
    },
    visual: {
      // roughclip: grade 'analog' + overlay 'grain' — same ids exist here.
      colourGradePreset: 'analog',
      colourGradeIntensity: 0.7,
      overlayEffects: ['grain'],
      // Handheld camcorder sway.
      cameraMotion: 'drift-left',
      cameraMotionIntensity: 0.4,
    },
    editing: {
      shotDurationBeats: [2, 4],
      cutIntensity: 0.5,
      transitions: ['cut', 'flash'],
    },
    media: {
      stockQuery: 'nightclub dancing party flash photography',
      poolTargetSize: 12,
      videoRatio: 0.25,
    },
    pairing: { font: 'retro', visualizer: 'bars' },
    thumbnail: '/aesthetics/vhs-club/thumb.jpg',
  },
  {
    id: 'moshpit',
    name: 'FRONT ROW',
    description: 'Sweat, stage lights and the beautiful chaos of being crushed against the barrier.',
    searchTags: ['moshpit', 'concert', 'live', 'gig', 'crowd', 'stage', 'punk', 'energy', 'sweat', 'lights', 'chaotic', 'aggressive'],
    affinity: {
      energies: ['high'],
      bpmRange: [140, 220],
      moods: ['aggressive', 'euphoric', 'chaotic'],
      genres: ['punk', 'metal', 'rock', 'hardcore'],
    },
    visual: {
      // roughclip grade 'signature-vivid' → closest wavecanvas grade 'vivid'.
      colourGradePreset: 'vivid',
      colourGradeIntensity: 0.9,
      // roughclip had no overlay; 'grain' carries the gritty photo intent.
      overlayEffects: ['grain'],
      cameraMotion: 'push-in',
      cameraMotionIntensity: 0.6,
      motionEffect: 'rgb-glitch',
      motionEffectIntensity: 0.8,
    },
    editing: {
      shotDurationBeats: [1, 2],
      cutIntensity: 0.9,
      transitions: ['cut', 'flash'],
    },
    media: {
      stockQuery: 'mosh pit concert crowd stage lights',
      poolTargetSize: 14,
      videoRatio: 0.25,
    },
    pairing: { font: 'impact', visualizer: 'bars' },
    thumbnail: '/aesthetics/moshpit/thumb.jpg',
  },
  {
    id: 'eighties',
    name: 'CHROME NIGHTS',
    description: 'Neon signs, retro cars and the warm static of a city that never slept.',
    searchTags: ['80s', 'retro', 'neon', 'night', 'car', 'chrome', 'city', 'analog', 'synthwave', 'nostalgic', 'smoky', 'cinematic'],
    affinity: {
      energies: ['mid', 'high'],
      bpmRange: [100, 140],
      moods: ['nostalgic', 'romantic', 'cool'],
      genres: ['synthwave', 'pop', 'electronic'],
    },
    visual: {
      // roughclip: grade 'warm-film' + overlay 'grain' — same ids exist here.
      colourGradePreset: 'warm-film',
      colourGradeIntensity: 0.4,
      overlayEffects: ['grain'],
      // Slow drive-by drift.
      cameraMotion: 'drift-right',
      cameraMotionIntensity: 0.4,
    },
    editing: {
      shotDurationBeats: [4],
      cutIntensity: 0.4,
      transitions: ['crossfade', 'flash'],
    },
    media: {
      stockQuery: '80s neon night drive retro car',
      poolTargetSize: 12,
      videoRatio: 0.25,
    },
    pairing: { font: 'retro', visualizer: 'wave' },
    thumbnail: '/aesthetics/eighties/thumb.jpg',
  },
  {
    id: 'older-brother',
    name: 'BASEMENT TAPES',
    description: "Skate clips, streetwear and the hand-me-down culture of someone else's adolescence.",
    searchTags: ['skate', 'streetwear', 'basement', 'indie', 'gritty', 'youth', '2010s', 'film', 'candid', 'urban', 'diy', 'older sibling'],
    affinity: {
      energies: ['mid', 'high'],
      bpmRange: [110, 150],
      moods: ['rebellious', 'nostalgic', 'youthful'],
      genres: ['indie', 'punk', 'hip-hop'],
    },
    visual: {
      // roughclip: grade 'analog' @ 0.25 + overlay 'grain' — same ids exist here.
      colourGradePreset: 'analog',
      colourGradeIntensity: 0.25,
      overlayEffects: ['grain'],
      // Loose handheld breathing, like a fisheye skate clip.
      cameraMotion: 'breathing',
      cameraMotionIntensity: 0.4,
    },
    editing: {
      shotDurationBeats: [2, 4],
      cutIntensity: 0.45,
      transitions: ['cut', 'flash'],
    },
    media: {
      stockQuery: 'streetwear skate basement show older brother core',
      poolTargetSize: 12,
      videoRatio: 0.25,
    },
    pairing: { font: 'sketchy', visualizer: 'bars' },
    thumbnail: '/aesthetics/older-brother/thumb.jpg',
  },
  {
    id: 'dream',
    name: 'IN THE CLOUDS',
    description: 'Moonlight, soft focus and landscapes that feel half-remembered from sleep.',
    searchTags: ['dream', 'clouds', 'moonlight', 'surreal', 'ethereal', 'soft', 'landscape', 'floating', 'calm', 'otherworldly', 'bloom', 'cinematic'],
    affinity: {
      energies: ['low', 'mid'],
      bpmRange: [60, 100],
      moods: ['calm', 'ethereal', 'peaceful'],
      genres: ['ambient', 'dream-pop', 'shoegaze'],
    },
    visual: {
      // roughclip: grade 'dream' @ 0.25 — same id exists here.
      colourGradePreset: 'dream',
      colourGradeIntensity: 0.25,
      // roughclip had no overlay; 'sparkles' carries the floating-light intent.
      overlayEffects: ['sparkles'],
      cameraMotion: 'vertical-float',
      cameraMotionIntensity: 0.45,
    },
    editing: {
      shotDurationBeats: [4, 8],
      cutIntensity: 0.1,
      transitions: ['crossfade'],
    },
    media: {
      stockQuery: 'dreamy clouds moonlight surreal landscape',
      poolTargetSize: 10,
      videoRatio: 0.25,
    },
    pairing: { font: 'elegant', visualizer: 'wave' },
    thumbnail: '/aesthetics/dream/thumb.jpg',
  },
  {
    id: 'underwater',
    name: 'DEEP END',
    description: 'Caustic light, slow drift and the muffled quiet of being completely submerged.',
    searchTags: ['underwater', 'ocean', 'blue', 'submerged', 'deep', 'aquatic', 'ethereal', 'calm', 'drift', 'light rays', 'cinematic', 'surreal'],
    affinity: {
      energies: ['low'],
      bpmRange: [50, 90],
      moods: ['calm', 'melancholic', 'ethereal'],
      genres: ['ambient', 'electronic', 'downtempo'],
    },
    visual: {
      // roughclip: grade 'cold-night' + motionEffect 'dream' — same ids exist here.
      colourGradePreset: 'cold-night',
      colourGradeIntensity: 0.6,
      // roughclip had no overlay; 'dust' carries the suspended-particles intent.
      overlayEffects: ['dust'],
      cameraMotion: 'vertical-float',
      cameraMotionIntensity: 0.3,
      motionEffect: 'dream',
      motionEffectIntensity: 0.1,
    },
    editing: {
      shotDurationBeats: [4, 8],
      cutIntensity: 0.15,
      transitions: ['crossfade'],
    },
    media: {
      stockQuery: 'underwater blue light rays submerged ocean',
      poolTargetSize: 10,
      videoRatio: 0.25,
    },
    pairing: { font: 'minimalist', visualizer: 'wave' },
    thumbnail: '/aesthetics/underwater/thumb.jpg',
  },
  {
    id: 'cathedral',
    name: 'VAST QUIET',
    description: 'Towering stone, warm gold light and the kind of silence that has a physical weight.',
    searchTags: ['cathedral', 'architecture', 'church', 'vast', 'gold', 'light', 'scale', 'quiet', 'stone', 'arches', 'cinematic', 'dramatic'],
    affinity: {
      energies: ['low'],
      bpmRange: [40, 90],
      moods: ['awe', 'solemn', 'calm'],
      genres: ['ambient', 'classical', 'post-rock'],
    },
    visual: {
      // roughclip grade 'signature-warm' → closest wavecanvas grade 'warm-film'.
      colourGradePreset: 'warm-film',
      colourGradeIntensity: 0.7,
      // roughclip had no overlay; 'dust' carries the volumetric-light-motes intent.
      overlayEffects: ['dust'],
      // roughclip explicitly pinned 'static' — the stillness is the point.
      cameraMotion: 'static',
      cameraMotionIntensity: 0,
    },
    editing: {
      shotDurationBeats: [8],
      cutIntensity: 0.1,
      transitions: ['crossfade'],
    },
    media: {
      stockQuery: 'cathedral architecture light beams arches',
      poolTargetSize: 10,
      videoRatio: 0.25,
    },
    pairing: { font: 'serif', visualizer: 'wave' },
    thumbnail: '/aesthetics/cathedral/thumb.jpg',
  },
  {
    id: 'night-drive',
    name: 'NEON RAIN',
    description: 'Wet streets, blurred signs and the rhythm of driving nowhere at 2am.',
    searchTags: ['night drive', 'rain', 'neon', 'city', 'motorway', 'car', 'late night', 'urban', 'cinematic', 'moody', 'blur'],
    affinity: {
      energies: ['low', 'mid'],
      bpmRange: [60, 120],
      moods: ['moody', 'lonely', 'reflective'],
      genres: ['synthwave', 'electronic', 'hip-hop', 'r&b'],
    },
    visual: {
      // roughclip: grade 'noir' — same id exists here.
      colourGradePreset: 'noir',
      colourGradeIntensity: 0.8,
      overlayEffects: [],
      // Passing streetlights.
      cameraMotion: 'drift-right',
      cameraMotionIntensity: 0.45,
      // roughclip had no motion effect; wavecanvas's 'rain' shader IS the
      // rainy-windshield intent of this aesthetic.
      motionEffect: 'rain',
      motionEffectIntensity: 0.35,
    },
    editing: {
      shotDurationBeats: [4, 6],
      cutIntensity: 0.25,
      transitions: ['crossfade'],
    },
    media: {
      stockQuery: 'night drive car rain neon city lights',
      poolTargetSize: 10,
      videoRatio: 0.25,
    },
    pairing: { font: 'cinematic', visualizer: 'wave' },
    thumbnail: '/aesthetics/night-drive/thumb.jpg',
  },
  {
    id: 'empty-mall',
    name: 'AFTER HOURS',
    description: 'Fluorescent corridors, shuttered shops and the specific loneliness of retail after close.',
    searchTags: ['empty mall', 'liminal', 'fluorescent', 'abandoned', 'retail', 'corridor', 'eerie', 'nostalgic', 'uneasy', 'night', 'quiet', 'space'],
    affinity: {
      energies: ['low', 'mid'],
      bpmRange: [50, 100],
      moods: ['eerie', 'lonely', 'nostalgic'],
      genres: ['ambient', 'vaporwave', 'electronic'],
    },
    visual: {
      // roughclip: grade 'cold-night' — same id exists here.
      colourGradePreset: 'cold-night',
      colourGradeIntensity: 0.6,
      overlayEffects: [],
      // Slow dolly down the corridor.
      cameraMotion: 'push-in',
      cameraMotionIntensity: 0.35,
    },
    editing: {
      shotDurationBeats: [6, 8],
      cutIntensity: 0.1,
      transitions: ['crossfade'],
    },
    media: {
      stockQuery: 'empty abandoned mall fluorescent liminal space',
      poolTargetSize: 10,
      videoRatio: 0.25,
    },
    pairing: { font: 'modern', visualizer: 'waveform-progress' },
    thumbnail: '/aesthetics/empty-mall/thumb.jpg',
  },
  {
    id: 'no-signal',
    name: 'NO SIGNAL',
    description: 'CRT glow, desktop windows and the loneliness of a dial-up midnight.',
    searchTags: ['crt', 'computer', 'desktop', 'glitch', 'internet', 'dial-up', 'retro tech', 'screen', 'windows', 'static', 'lonely', 'late night'],
    affinity: {
      energies: ['low', 'mid'],
      bpmRange: [60, 120],
      moods: ['lonely', 'anxious', 'nostalgic'],
      genres: ['electronic', 'idm', 'ambient'],
    },
    visual: {
      // roughclip: grade 'cold-night' + overlay 'grain' + motionEffect
      // 'rgb-glitch' @ 0.3 — same ids exist here.
      colourGradePreset: 'cold-night',
      colourGradeIntensity: 0.7,
      overlayEffects: ['grain'],
      // Fixed on the screen — the glitch does the moving.
      cameraMotion: 'static',
      cameraMotionIntensity: 0,
      motionEffect: 'rgb-glitch',
      motionEffectIntensity: 0.3,
    },
    editing: {
      shotDurationBeats: [3, 6],
      cutIntensity: 0.3,
      transitions: ['cut'],
    },
    media: {
      stockQuery: 'old computer crt screen glitch retro tech',
      poolTargetSize: 12,
      videoRatio: 0.25,
    },
    pairing: { font: 'pixel', visualizer: 'bars' },
    thumbnail: '/aesthetics/no-signal/thumb.jpg',
  },
  // ── Added for the biggest audience segments (EDM 28%, Ambient 24%, R&B
  //    17%, Pop 16%; moods Chill 45%, Euphoric 33%) ──────────────────────
  {
    id: 'peak-time',
    name: 'THE DROP',
    description: 'Lasers, a sea of hands and the second the bass comes back in.',
    searchTags: ['festival', 'edm', 'rave', 'lasers', 'crowd', 'dance', 'drop', 'club', 'euphoric', 'strobe', 'dj', 'night'],
    affinity: {
      energies: ['high'],
      bpmRange: [120, 150],
      moods: ['euphoric', 'energetic', 'uplifting'],
      genres: ['edm', 'dance', 'electronic', 'house', 'trance'],
    },
    visual: {
      colourGradePreset: 'vivid',
      colourGradeIntensity: 0.85,
      overlayEffects: ['vignette'],
      cameraMotion: 'push-in',
      cameraMotionIntensity: 0.55,
      motionEffect: 'pulse',
      motionEffectIntensity: 0.7,
    },
    editing: {
      shotDurationBeats: [1, 2],
      cutIntensity: 0.9,
      transitions: ['cut', 'flash'],
    },
    media: {
      stockQuery: 'festival laser crowd hands edm stage',
      poolTargetSize: 14,
      videoRatio: 0.25,
    },
    pairing: { font: 'bold', visualizer: 'bars' },
    thumbnail: '/aesthetics/peak-time/thumb.jpg',
  },
  {
    id: 'after-midnight',
    name: 'THREE AM',
    description: 'Candlelight, silk and a city that only feels close at 3am.',
    searchTags: ['r&b', 'rnb', 'soul', 'intimate', 'sensual', 'night', 'candle', 'romance', 'slow', 'bedroom', 'city window', 'late night'],
    affinity: {
      energies: ['low', 'mid'],
      bpmRange: [60, 100],
      moods: ['romantic', 'sensual', 'intimate', 'melancholic'],
      genres: ['r&b', 'soul', 'neo-soul'],
    },
    visual: {
      colourGradePreset: 'warm-film',
      colourGradeIntensity: 0.75,
      overlayEffects: ['grain', 'vignette'],
      cameraMotion: 'drift-right',
      cameraMotionIntensity: 0.3,
    },
    editing: {
      shotDurationBeats: [4, 8],
      cutIntensity: 0.3,
      transitions: ['crossfade'],
    },
    media: {
      stockQuery: 'candlelight silk night city window intimate',
      poolTargetSize: 12,
      videoRatio: 0.25,
    },
    pairing: { font: 'romantic', visualizer: 'wave' },
    thumbnail: '/aesthetics/after-midnight/thumb.jpg',
  },
  {
    id: 'rainy-day-study',
    name: 'NOWHERE TO BE',
    description: 'Rain on the window, a warm lamp and nowhere you need to be.',
    searchTags: ['lofi', 'lo-fi', 'study', 'chill', 'rain', 'cozy', 'coffee', 'cafe', 'focus', 'relax', 'homework', 'window'],
    affinity: {
      energies: ['low'],
      bpmRange: [60, 95],
      moods: ['chill', 'relaxed', 'calm', 'cozy', 'nostalgic'],
      genres: ['lofi', 'lo-fi', 'chillhop', 'jazz', 'ambient'],
    },
    visual: {
      colourGradePreset: 'warm-film',
      colourGradeIntensity: 0.6,
      overlayEffects: ['grain'],
      cameraMotion: 'vertical-float',
      cameraMotionIntensity: 0.25,
      motionEffect: 'rain',
      motionEffectIntensity: 0.6,
    },
    editing: {
      shotDurationBeats: [8, 16],
      cutIntensity: 0.2,
      transitions: ['crossfade'],
    },
    media: {
      stockQuery: 'rain window cozy desk lamp coffee study',
      poolTargetSize: 12,
      videoRatio: 0.25,
    },
    pairing: { font: 'lofi', visualizer: 'waveform-progress' },
    thumbnail: '/aesthetics/rainy-day-study/thumb.jpg',
  },
  {
    id: 'golden-hour',
    name: 'ONE MORE SUMMER',
    description: 'Sun flare, open roads and the feeling that summer will never end.',
    searchTags: ['sunset', 'summer', 'road trip', 'sun', 'warm', 'pop', 'indie', 'happy', 'beach', 'fields', 'freedom', 'uplifting'],
    affinity: {
      energies: ['mid', 'high'],
      bpmRange: [90, 130],
      moods: ['happy', 'uplifting', 'joyful', 'hopeful', 'carefree'],
      genres: ['pop', 'indie', 'folk', 'country'],
    },
    visual: {
      colourGradePreset: 'warm-film',
      colourGradeIntensity: 0.7,
      overlayEffects: ['dust'],
      cameraMotion: 'drift-left',
      cameraMotionIntensity: 0.35,
    },
    editing: {
      shotDurationBeats: [2, 4],
      cutIntensity: 0.5,
      transitions: ['cut', 'crossfade'],
    },
    media: {
      stockQuery: 'golden hour sunset sun flare road trip summer',
      poolTargetSize: 12,
      videoRatio: 0.25,
    },
    pairing: { font: 'organic', visualizer: 'wave' },
    thumbnail: '/aesthetics/golden-hour/thumb.jpg',
  },
  {
    id: 'concrete-strobe',
    name: 'NO PHOTOS',
    description: 'Bare concrete, a single strobe and a kick drum you feel in your chest.',
    searchTags: ['techno', 'house', 'warehouse', 'berlin', 'rave', 'strobe', 'underground', 'club', 'dark', 'industrial', 'minimal', 'black and white'],
    affinity: {
      energies: ['mid', 'high'],
      bpmRange: [120, 150],
      moods: ['dark', 'hypnotic', 'intense', 'driving'],
      genres: ['techno', 'house', 'electronic'],
    },
    visual: {
      colourGradePreset: 'noir',
      colourGradeIntensity: 0.9,
      overlayEffects: ['grain'],
      cameraMotion: 'push-in',
      cameraMotionIntensity: 0.45,
      motionEffect: 'pulse',
      motionEffectIntensity: 0.5,
    },
    editing: {
      shotDurationBeats: [1, 2, 4],
      cutIntensity: 0.85,
      transitions: ['cut', 'flash'],
    },
    media: {
      stockQuery: 'dark warehouse rave strobe light concrete',
      poolTargetSize: 12,
      videoRatio: 0.25,
    },
    pairing: { font: 'condensed', visualizer: 'bars' },
    thumbnail: '/aesthetics/concrete-strobe/thumb.jpg',
  },
  {
    id: 'streetlights',
    name: 'PAST CURFEW',
    description: 'Sodium-lit corners, rooftops and the city talking back after dark.',
    searchTags: ['hip hop', 'rap', 'drill', 'trap', 'street', 'city', 'night', 'urban', 'rooftop', 'cars', 'graffiti', 'gritty'],
    affinity: {
      energies: ['mid', 'high'],
      bpmRange: [70, 160],
      moods: ['confident', 'dark', 'aggressive', 'gritty'],
      genres: ['hip-hop', 'rap', 'trap', 'drill'],
    },
    visual: {
      colourGradePreset: 'cold-night',
      colourGradeIntensity: 0.75,
      overlayEffects: ['grain', 'vignette'],
      cameraMotion: 'diagonal-drift',
      cameraMotionIntensity: 0.4,
    },
    editing: {
      shotDurationBeats: [2, 4],
      cutIntensity: 0.7,
      transitions: ['cut', 'flash'],
    },
    media: {
      stockQuery: 'city street night streetlights urban rooftop',
      poolTargetSize: 12,
      videoRatio: 0.25,
    },
    pairing: { font: 'statement', visualizer: 'bars' },
    thumbnail: '/aesthetics/streetlights/thumb.jpg',
  },
  {
    id: 'tokyo-1985',
    name: 'LAST TRAIN HOME',
    description: 'Pastel neon, late trains and a city pop record spinning somewhere.',
    searchTags: ['city pop', 'japan', 'tokyo', '80s', 'retro', 'anime', 'pastel', 'neon', 'train', 'nostalgia', 'funk', 'synthwave'],
    affinity: {
      energies: ['mid'],
      bpmRange: [95, 125],
      moods: ['nostalgic', 'romantic', 'dreamy', 'happy'],
      genres: ['city pop', 'pop', 'funk', 'synthwave'],
    },
    visual: {
      colourGradePreset: 'bleached',
      colourGradeIntensity: 0.55,
      overlayEffects: ['grain'],
      cameraMotion: 'drift-right',
      cameraMotionIntensity: 0.35,
    },
    editing: {
      shotDurationBeats: [2, 4],
      cutIntensity: 0.5,
      transitions: ['cut', 'crossfade'],
    },
    media: {
      stockQuery: 'tokyo night neon train 80s retro japan city',
      poolTargetSize: 12,
      videoRatio: 0.25,
    },
    pairing: { font: 'retro', visualizer: 'radial-bars' },
    thumbnail: '/aesthetics/tokyo-1985/thumb.jpg',
  },
  {
    id: 'cosmos',
    name: 'PALE BLUE DOT',
    description: "Nebulae, slow orbits and the scale of everything that isn't us.",
    searchTags: ['space', 'galaxy', 'nebula', 'stars', 'cosmic', 'ambient', 'meditation', 'sleep', 'universe', 'planets', 'astronomy', 'epic'],
    affinity: {
      energies: ['low'],
      bpmRange: [50, 100],
      moods: ['calm', 'dreamy', 'epic', 'peaceful', 'ethereal'],
      genres: ['ambient', 'cinematic', 'electronic', 'new age'],
    },
    visual: {
      colourGradePreset: 'cold-night',
      colourGradeIntensity: 0.6,
      overlayEffects: ['sparkles'],
      cameraMotion: 'orbit',
      cameraMotionIntensity: 0.25,
      motionEffect: 'dream',
      motionEffectIntensity: 0.5,
    },
    editing: {
      shotDurationBeats: [8, 16],
      cutIntensity: 0.15,
      transitions: ['crossfade'],
    },
    media: {
      stockQuery: 'nebula galaxy stars space',
      poolTargetSize: 12,
      videoRatio: 0.25,
    },
    pairing: { font: 'elegant', visualizer: 'radial-bars' },
    thumbnail: '/aesthetics/cosmos/thumb.jpg',
  },

  // ── Seasonal (Christmas) — exclusive window Nov 1 → Dec 26 ────────────
  {
    id: 'home-alone',
    name: 'THE TREE FROM THE STAIRS',
    description: 'Tree lights, torn wrapping paper and Christmas morning on the family camcorder.',
    searchTags: ['christmas', 'xmas', 'home video', 'camcorder', 'family', 'tree', 'nostalgia', 'morning', 'retro', 'vhs', 'wrapping paper', 'holiday', 'cozy'],
    affinity: {
      energies: ['low', 'mid'],
      bpmRange: [60, 110],
      moods: ['nostalgic', 'joyful', 'cozy'],
      genres: ['lofi', 'jazz', 'ambient', 'pop'],
    },
    visual: {
      // Family-camcorder warmth: analog grade + grain, loose handheld breathing.
      colourGradePreset: 'analog',
      colourGradeIntensity: 0.65,
      overlayEffects: ['grain'],
      cameraMotion: 'breathing',
      cameraMotionIntensity: 0.35,
    },
    editing: {
      shotDurationBeats: [4, 8],
      cutIntensity: 0.2,
      transitions: ['crossfade'],
    },
    media: {
      stockQuery: 'retro family christmas morning tree home video',
      poolTargetSize: 12,
      videoRatio: 0.25,
    },
    pairing: { font: 'retro', visualizer: 'bars' },
    thumbnail: '/aesthetics/home-alone/thumb.jpg',
    seasonal: { opens: '11-01', closes: '12-26', label: 'Christmas', mode: 'exclusive' },
  },
  {
    id: 'fireside',
    name: 'SNOWED IN',
    description: 'Fireplace glow, drifting embers and nowhere you need to be.',
    searchTags: ['fireplace', 'fire', 'cabin', 'winter', 'cozy', 'warm', 'embers', 'hygge', 'snow', 'calm', 'christmas', 'xmas', 'night in'],
    affinity: {
      energies: ['low'],
      bpmRange: [50, 95],
      moods: ['calm', 'cozy', 'peaceful'],
      genres: ['ambient', 'lofi', 'acoustic'],
    },
    visual: {
      // Pinned stillness — the fire and the snowfall do the moving.
      colourGradePreset: 'warm-film',
      colourGradeIntensity: 0.7,
      overlayEffects: ['snow', 'dust'],
      cameraMotion: 'static',
      cameraMotionIntensity: 0,
    },
    editing: {
      shotDurationBeats: [8, 16],
      cutIntensity: 0.1,
      transitions: ['crossfade'],
    },
    media: {
      stockQuery: 'fireplace cabin winter warm lights cozy',
      poolTargetSize: 12,
      videoRatio: 0.25,
    },
    pairing: { font: 'script', visualizer: 'wave' },
    thumbnail: '/aesthetics/fireside/thumb.jpg',
    seasonal: { opens: '11-01', closes: '12-26', label: 'Christmas', mode: 'exclusive' },
  },
  {
    id: 'wrapping-paper',
    name: 'SIX AM',
    description: 'Morning bokeh, tree-light twinkle and the good kind of chaos.',
    searchTags: ['christmas', 'xmas', 'tree lights', 'bokeh', 'decorations', 'morning', 'twinkle', 'presents', 'joyful', 'sparkle', 'holiday', 'festive', 'glow'],
    affinity: {
      energies: ['mid'],
      bpmRange: [90, 130],
      moods: ['joyful', 'uplifting', 'happy'],
      genres: ['pop', 'indie', 'folk'],
    },
    visual: {
      // Gentle float over warm bokeh; snow + sparkles carry the twinkle.
      colourGradePreset: 'warm-film',
      colourGradeIntensity: 0.55,
      overlayEffects: ['snow', 'sparkles'],
      cameraMotion: 'vertical-float',
      cameraMotionIntensity: 0.3,
    },
    editing: {
      shotDurationBeats: [2, 4],
      cutIntensity: 0.4,
      transitions: ['cut', 'crossfade'],
    },
    media: {
      stockQuery: 'christmas tree lights bokeh decorations morning',
      poolTargetSize: 12,
      videoRatio: 0.25,
    },
    pairing: { font: 'thick', visualizer: 'bars' },
    thumbnail: '/aesthetics/wrapping-paper/thumb.jpg',
    seasonal: { opens: '11-01', closes: '12-26', label: 'Christmas', mode: 'exclusive' },
  },
  {
    id: 'office-party',
    name: 'BAD DECISIONS',
    description: "Flash photography, paper crowns and decisions you'll laugh about in January.",
    searchTags: ['christmas party', 'xmas', 'office party', 'flash photography', 'dancing', 'celebration', 'drunk', 'work party', 'festive', 'chaotic', 'fun', 'december', 'colleagues'],
    affinity: {
      energies: ['mid', 'high'],
      bpmRange: [110, 150],
      moods: ['euphoric', 'chaotic', 'joyful'],
      genres: ['dance', 'pop', 'funk'],
    },
    visual: {
      // Hard flash-party look — same family as vhs-club, pushed faster.
      colourGradePreset: 'analog',
      colourGradeIntensity: 0.8,
      overlayEffects: ['grain'],
      cameraMotion: 'drift-left',
      cameraMotionIntensity: 0.5,
    },
    editing: {
      shotDurationBeats: [1, 2],
      cutIntensity: 0.85,
      transitions: ['cut', 'flash'],
    },
    media: {
      stockQuery: 'christmas party flash photography dancing celebration',
      poolTargetSize: 12,
      videoRatio: 0.25,
    },
    pairing: { font: 'bold', visualizer: 'bars' },
    thumbnail: '/aesthetics/office-party/thumb.jpg',
    seasonal: { opens: '11-01', closes: '12-26', label: 'Christmas', mode: 'exclusive' },
  },
  {
    id: 'carol-service',
    name: 'HELD BREATH',
    description: 'Candlelight, held breath and a silence with physical weight.',
    searchTags: ['carols', 'candlelight', 'choir', 'church', 'advent', 'candles', 'christmas', 'xmas', 'solemn', 'hymns', 'quiet', 'sacred', 'winter'],
    affinity: {
      energies: ['low'],
      bpmRange: [40, 90],
      moods: ['solemn', 'awe', 'peaceful'],
      genres: ['classical', 'choral', 'ambient'],
    },
    visual: {
      // Same stillness doctrine as cathedral — the camera never moves.
      colourGradePreset: 'warm-film',
      colourGradeIntensity: 0.8,
      overlayEffects: ['dust'],
      cameraMotion: 'static',
      cameraMotionIntensity: 0,
    },
    editing: {
      shotDurationBeats: [8],
      cutIntensity: 0.05,
      transitions: ['crossfade'],
    },
    media: {
      stockQuery: 'candlelight choir church advent candles',
      poolTargetSize: 12,
      videoRatio: 0.25,
    },
    pairing: { font: 'serif', visualizer: 'wave' },
    thumbnail: '/aesthetics/carol-service/thumb.jpg',
    seasonal: { opens: '11-01', closes: '12-26', label: 'Christmas', mode: 'exclusive' },
  },
  {
    id: 'midnight-countdown',
    name: 'KISS AT MIDNIGHT',
    description: 'Fireworks, champagne and the city counting down together.',
    searchTags: ['new year', 'fireworks', 'countdown', 'midnight', 'champagne', 'city', 'celebration', 'nye', 'party', 'night', 'sparklers', 'hopeful'],
    affinity: {
      energies: ['mid', 'high'],
      bpmRange: [100, 140],
      moods: ['euphoric', 'hopeful', 'uplifting'],
      genres: ['pop', 'dance', 'electronic'],
    },
    visual: {
      // Noir night city + sparkles; pulse hits with the countdown.
      colourGradePreset: 'noir',
      colourGradeIntensity: 0.5,
      overlayEffects: ['sparkles'],
      cameraMotion: 'push-in',
      cameraMotionIntensity: 0.5,
      motionEffect: 'pulse',
      motionEffectIntensity: 0.4,
    },
    editing: {
      shotDurationBeats: [2, 4],
      cutIntensity: 0.7,
      transitions: ['cut', 'flash'],
    },
    media: {
      stockQuery: 'fireworks new year celebration night city champagne',
      poolTargetSize: 12,
      videoRatio: 0.25,
    },
    pairing: { font: 'statement', visualizer: 'radial-bars' },
    thumbnail: '/aesthetics/midnight-countdown/thumb.jpg',
    // Year-wrapping window: Dec 26 → Jan 1.
    seasonal: { opens: '12-26', closes: '01-01', label: "New Year's Eve", mode: 'exclusive' },
  },

  // ── Seasonal (Halloween) — window Oct 1 → Nov 1 ────────────────────────
  {
    id: 'slasher',
    name: "DON'T GO IN THERE",
    description: 'Fog in the treeline and a score you can hear before you see it.',
    searchTags: ['horror', 'slasher', 'halloween', 'fog', 'forest', 'moon', 'night', 'retro horror', 'creepy', 'tense', 'film grain', '80s horror', 'eerie'],
    affinity: {
      energies: ['low', 'mid'],
      bpmRange: [70, 120],
      moods: ['dark', 'eerie', 'tense'],
      genres: ['synthwave', 'electronic', 'rock'],
    },
    visual: {
      // Retro-horror film stock: analog + grain + vignette, slow push-in dread.
      colourGradePreset: 'analog',
      colourGradeIntensity: 0.75,
      overlayEffects: ['grain', 'vignette'],
      cameraMotion: 'push-in',
      cameraMotionIntensity: 0.3,
    },
    editing: {
      shotDurationBeats: [4, 8],
      cutIntensity: 0.3,
      transitions: ['cut'],
    },
    media: {
      stockQuery: 'retro horror film fog night forest moon',
      poolTargetSize: 12,
      videoRatio: 0.25,
    },
    pairing: { font: 'impact', visualizer: 'bars' },
    thumbnail: '/aesthetics/slasher/thumb.jpg',
    seasonal: { opens: '10-01', closes: '11-01', label: 'Halloween', mode: 'exclusive' },
  },
  {
    id: 'found-footage',
    name: 'DID YOU HEAR THAT',
    description: 'Night-vision panic from a camera that never stops shaking.',
    searchTags: ['found footage', 'halloween', 'night vision', 'flashlight', 'abandoned', 'dark forest', 'panic', 'horror', 'blair witch', 'shaky', 'scary', 'urbex', 'glitch'],
    affinity: {
      energies: ['high'],
      bpmRange: [120, 180],
      moods: ['anxious', 'aggressive', 'dark'],
      genres: ['trap', 'drill', 'metal', 'electronic'],
    },
    visual: {
      // Max handheld breathing + a low rgb-glitch undercurrent — the camera
      // is a character.
      colourGradePreset: 'cold-night',
      colourGradeIntensity: 0.85,
      overlayEffects: ['grain'],
      cameraMotion: 'breathing',
      cameraMotionIntensity: 0.8,
      motionEffect: 'rgb-glitch',
      motionEffectIntensity: 0.25,
    },
    editing: {
      shotDurationBeats: [1, 2],
      cutIntensity: 0.9,
      transitions: ['cut'],
    },
    media: {
      stockQuery: 'dark forest flashlight night abandoned building',
      poolTargetSize: 12,
      videoRatio: 0.25,
    },
    pairing: { font: 'data', visualizer: 'waveform-progress' },
    thumbnail: '/aesthetics/found-footage/thumb.jpg',
    seasonal: { opens: '10-01', closes: '11-01', label: 'Halloween', mode: 'exclusive' },
  },
  {
    id: 'trick-or-treat',
    name: 'PORCH LIGHT',
    description: 'Pumpkins on porches and suburbia glowing at dusk.',
    searchTags: ['halloween', 'pumpkins', 'porch', 'suburbia', 'dusk', 'autumn', 'trick or treat', 'jack-o-lantern', 'neighbourhood', 'october', 'nostalgic', 'fall'],
    affinity: {
      energies: ['low', 'mid'],
      bpmRange: [70, 120],
      moods: ['nostalgic', 'melancholic', 'dreamy'],
      genres: ['indie', 'lofi', 'folk'],
    },
    visual: {
      // Cool dusk grade kept gentle; slow drift down the street.
      colourGradePreset: 'cold-night',
      colourGradeIntensity: 0.4,
      overlayEffects: ['grain'],
      cameraMotion: 'drift-right',
      cameraMotionIntensity: 0.3,
    },
    editing: {
      shotDurationBeats: [4, 6],
      cutIntensity: 0.25,
      transitions: ['crossfade'],
    },
    media: {
      stockQuery: 'halloween pumpkins porch suburb dusk autumn',
      poolTargetSize: 12,
      videoRatio: 0.25,
    },
    pairing: { font: 'thick', visualizer: 'bars' },
    thumbnail: '/aesthetics/trick-or-treat/thumb.jpg',
    seasonal: { opens: '10-01', closes: '11-01', label: 'Halloween', mode: 'exclusive' },
  },
  {
    id: 'gothic-romance',
    name: 'TIL DEATH',
    description: 'Candlelit velvet and a love that outlives the grave.',
    searchTags: ['gothic', 'halloween', 'candles', 'velvet', 'dark romance', 'moody', 'vampire', 'baroque', 'candlelit', 'dramatic', 'elegant', 'melancholy', 'goth'],
    affinity: {
      energies: ['low', 'mid'],
      bpmRange: [60, 110],
      moods: ['romantic', 'dark', 'melancholic'],
      genres: ['goth', 'darkwave', 'alt', 'r&b'],
    },
    visual: {
      // Warm candlelit grade at near-full strength; dust + vignette for the
      // velvet gloom, a slow vertical float like rising smoke.
      colourGradePreset: 'warm-film',
      colourGradeIntensity: 0.85,
      overlayEffects: ['dust', 'vignette'],
      cameraMotion: 'vertical-float',
      cameraMotionIntensity: 0.25,
    },
    editing: {
      shotDurationBeats: [4, 8],
      cutIntensity: 0.2,
      transitions: ['crossfade'],
    },
    media: {
      stockQuery: 'gothic candles velvet dark romance moody',
      poolTargetSize: 12,
      videoRatio: 0.25,
    },
    pairing: { font: 'romantic', visualizer: 'wave' },
    thumbnail: '/aesthetics/gothic-romance/thumb.jpg',
    // Year-round, boosted in October.
    seasonal: { opens: '10-01', closes: '11-01', label: 'Halloween', mode: 'boosted' },
  },
  {
    id: 'monster-mash',
    name: 'SUGAR RUSH',
    description: 'Costume chaos, fake cobwebs and the fun side of the graveyard.',
    searchTags: ['halloween', 'costume party', 'decorations', 'fun', 'cobwebs', 'monster', 'party', 'silly', 'spooky', 'candy', 'dance', 'playful'],
    affinity: {
      energies: ['mid', 'high'],
      bpmRange: [100, 140],
      moods: ['playful', 'euphoric', 'joyful'],
      genres: ['pop', 'funk'],
    },
    visual: {
      // Bright party grade — Halloween as a kids'-party palette, not horror.
      colourGradePreset: 'vivid',
      colourGradeIntensity: 0.7,
      overlayEffects: ['grain'],
      cameraMotion: 'drift-left',
      cameraMotionIntensity: 0.45,
      motionEffect: 'pulse',
      motionEffectIntensity: 0.3,
    },
    editing: {
      shotDurationBeats: [2],
      cutIntensity: 0.7,
      transitions: ['cut', 'flash'],
    },
    media: {
      stockQuery: 'halloween costume party decorations fun',
      poolTargetSize: 12,
      videoRatio: 0.25,
    },
    pairing: { font: 'sketchy', visualizer: 'bars' },
    thumbnail: '/aesthetics/monster-mash/thumb.jpg',
    seasonal: { opens: '10-01', closes: '11-01', label: 'Halloween', mode: 'exclusive' },
  },
];

export function getAestheticById(id: string): AestheticDefinition | undefined {
  return AESTHETICS_REGISTRY.find((a) => a.id === id);
}
