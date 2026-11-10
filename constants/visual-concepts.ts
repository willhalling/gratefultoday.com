/**
 * Reusable visual concepts for AI background generation.
 *
 * Each concept is a deliberate visual metaphor designed to sit behind the
 * WaveCanvas lyric-video composition — the wave visualizer, typography and
 * artwork must always read first, so every concept enforces negative space,
 * low horizon lines and soft, non-competing detail.
 */

export interface VisualConcept {
  id: string;
  label: string;
  /** One-line metaphor summary used in logs / debug UI. */
  metaphor: string;
  /** What the image actually depicts. */
  subject: string;
  /** Framing guidance — must always protect the waveform + text areas. */
  composition: string;
  atmosphere: string;
  lighting: string;
  texture: string;
  /** How the palette should be adapted into the scene. */
  colourBehaviour: string;
  /** Explicit negative-space instruction. */
  negativeSpace: string;
  /** Keywords that trigger this concept from lyric themes / full lyrics. */
  lyricKeywords: string[];
  /** Emotion keys that map well to this concept. */
  emotions: string[];
  /** Genres whose aesthetic pairs naturally with the concept. */
  genres: string[];
}

export const VISUAL_CONCEPTS: VisualConcept[] = [
  {
    id: 'electric-connection',
    label: 'Electric Connection',
    metaphor: 'Current finding its way through darkness.',
    subject:
      'luminous filaments and soft glowing currents flowing through deep shadow, forming abstract synapse-like connections between distant points of light',
    composition:
      'low horizon, wide empty upper two-thirds, focal glow pushed to the lower third, no strong horizontal lines across the centre of the frame',
    atmosphere: 'intimate, charged, quietly energetic',
    lighting: 'deep shadow base with warm electric accent glow',
    texture: 'soft bokeh, subtle film grain, gentle motion blur on the light trails',
    colourBehaviour:
      'background stays near-black; accent colour appears as glowing threads and soft halos',
    negativeSpace:
      'large calm dark area across the middle and upper frame where the wave visualizer and lyrics will sit',
    lyricKeywords: [
      'connection', 'touch', 'electric', 'spark', 'current', 'together', 'energy',
      'alive', 'heartbeat', 'wire', 'signal', 'charge', 'reach', 'hold',
    ],
    emotions: ['love', 'euphoria', 'anxiety'],
    genres: ['edm', 'electronic', 'synthpop', 'pop'],
  },
  {
    id: 'dreamscape',
    label: 'Dreamscape',
    metaphor: 'A soft world half-remembered.',
    subject:
      'slow drifting clouds, soft mist and floating translucent forms suspended in pale pastel haze',
    composition:
      'low horizon, vast open sky, gentle gradients, no busy detail in the centre band',
    atmosphere: 'weightless, calm, quietly surreal',
    lighting: 'diffused ambient light, soft glow from below',
    texture: 'velvet haze, subtle paper grain, soft focus',
    colourBehaviour:
      'background is a pale wash of the dominant palette colour; accents appear as soft highlights on cloud edges',
    negativeSpace:
      'expansive empty middle and upper frame, cloud detail kept to the lower third',
    lyricKeywords: [
      'dream', 'sleep', 'cloud', 'float', 'sky', 'soft', 'drift', 'heaven',
      'imagine', 'sleep', 'wish', 'float away', 'weightless',
    ],
    emotions: ['dreamlike', 'hope', 'love'],
    genres: ['dream-pop', 'ambient', 'lofi', 'indie', 'shoegaze'],
  },
  {
    id: 'cosmic-journey',
    label: 'Cosmic Journey',
    metaphor: 'Travelling through something bigger than yourself.',
    subject:
      'deep space vista with distant stars, a faint nebula glow and one bright point of light far ahead',
    composition:
      'low horizon of darkness, star field above, focal glow near the lower third, generous emptiness in the middle',
    atmosphere: 'vast, contemplative, quietly hopeful',
    lighting: 'starlight and faint nebula glow against near-black',
    texture: 'fine star grain, subtle cosmic dust, deep colour gradients',
    colourBehaviour:
      'background is near-black with subtle palette-tinted nebula; accent colour marks the distant light',
    negativeSpace:
      'wide empty starfield across the middle and upper frame where the waveform and lyrics will sit',
    lyricKeywords: [
      'star', 'space', 'moon', 'galaxy', 'universe', 'journey', 'travel', 'road',
      'night', 'sky', 'infinite', 'fly', 'away', 'distance',
    ],
    emotions: ['freedom', 'existentialism', 'hope'],
    genres: ['cinematic', 'ambient', 'post-rock', 'synthwave'],
  },
  {
    id: 'neon-city',
    label: 'Neon City',
    metaphor: 'Night light reflected in rain.',
    subject:
      'out-of-focus city glow at night with wet reflective surfaces and soft neon colour bleeding into darkness',
    composition:
      'very low horizon, heavy bokeh, no sharp buildings or readable signs, calm empty middle band',
    atmosphere: 'urban, nocturnal, electric but distant',
    lighting: 'neon accent glow reflecting on wet asphalt or glass',
    texture: 'rain sheen, soft lens flare, film grain, deep shadow',
    colourBehaviour:
      'background is near-black; accent and secondary palette colours appear as neon glows and reflections',
    negativeSpace:
      'dark empty middle and upper frame, city light kept low and out of focus',
    lyricKeywords: [
      'city', 'street', 'neon', 'night', 'light', 'rain', 'window', 'drive',
      'midnight', 'traffic', 'bar', 'downtown', 'party',
    ],
    emotions: ['euphoria', 'anxiety', 'loneliness'],
    genres: ['synthwave', 'edm', 'hip-hop', 'trap', 'pop'],
  },
  {
    id: 'endless-ocean',
    label: 'Endless Ocean',
    metaphor: 'Movement that never ends.',
    subject:
      'calm open water stretching to a low horizon under a wide sky, gentle swell catching subtle light',
    composition:
      'very low horizon line, expansive water and sky, no ships or landmarks, empty middle band',
    atmosphere: 'calm, vast, quietly emotional',
    lighting: 'soft directional light on water, low contrast, gentle reflection',
    texture: 'smooth water gradient, fine surface ripple, subtle haze',
    colourBehaviour:
      'water carries the background palette; accent colour appears as light on the swell',
    negativeSpace:
      'open water and sky across the middle and upper frame where the waveform will flow',
    lyricKeywords: [
      'ocean', 'sea', 'wave', 'water', 'river', 'tide', 'sail', 'swim',
      'shore', 'beach', 'deep', 'flow', 'drift', 'blue',
    ],
    emotions: ['freedom', 'grief', 'hope'],
    genres: ['ambient', 'indie', 'folk', 'cinematic'],
  },
  {
    id: 'paper-memories',
    label: 'Paper Memories',
    metaphor: 'Fragments of a past kept too long.',
    subject:
      'warm aged paper textures, soft torn edges and faded photographic fragments arranged with generous empty space',
    composition:
      'asymmetric collage pushed to the edges, large central area kept clean and empty',
    atmosphere: 'warm, nostalgic, slightly worn',
    lighting: 'soft amber window light, gentle vignette',
    texture: 'paper grain, faded ink, subtle fibre, slight crease shadows',
    colourBehaviour:
      'background is a warm cream or muted sepia; accents appear as faded ink and aged photo tones',
    negativeSpace:
      'large clean central area for typography and waveform, textures kept to the borders',
    lyricKeywords: [
      'memory', 'remember', 'past', 'old', 'paper', 'letter', 'photo', 'photograph',
      'yesterday', 'childhood', 'used to', 'back then', 'miss',
    ],
    emotions: ['nostalgia', 'regret', 'heartbreak'],
    genres: ['lofi', 'indie', 'folk', 'acoustic'],
  },
  {
    id: 'golden-hour',
    label: 'Golden Hour',
    metaphor: 'The last warm light before the day ends.',
    subject:
      'soft warm sunset light washing over a minimal landscape or open field, long soft shadows',
    composition:
      'low horizon, wide empty sky, focal warmth near the lower third, no busy foreground detail',
    atmosphere: 'warm, hopeful, gently bittersweet',
    lighting: 'golden directional light, soft lens flare, warm highlights',
    texture: 'soft haze, gentle grain, subtle chromatic warmth',
    colourBehaviour:
      'background is a warm gradient; accent colour appears as sunlight highlights and rim glow',
    negativeSpace:
      'open warm sky across the middle and upper frame where lyrics and waveform will sit',
    lyricKeywords: [
      'sun', 'sunset', 'golden', 'warm', 'light', 'dawn', 'morning', 'day',
      'summer', 'home', 'goodbye', 'see you', 'again',
    ],
    emotions: ['hope', 'nostalgia', 'freedom'],
    genres: ['indie', 'folk', 'pop', 'acoustic', 'country'],
  },
  {
    id: 'floating-particles',
    label: 'Floating Particles',
    metaphor: 'Tiny pieces of light suspended in air.',
    subject:
      'soft glowing dust motes, embers or bokeh particles floating slowly through deep shadow',
    composition:
      'particles distributed evenly but kept small and out of focus, large empty central area',
    atmosphere: 'magical, intimate, quietly celebratory',
    lighting: 'points of light in darkness, soft glow falloff',
    texture: 'bokeh blur, subtle film grain, gentle depth',
    colourBehaviour:
      'background is near-black; accent colour appears as glowing particles and soft halos',
    negativeSpace:
      'deep shadow across the middle and upper frame with sparse particle detail',
    lyricKeywords: [
      'particle', 'dust', 'glow', 'shine', 'sparkle', 'starlight', 'magic',
      'firefly', 'light up', 'glimmer', 'shimmer',
    ],
    emotions: ['euphoria', 'dreamlike', 'love'],
    genres: ['pop', 'edm', 'cinematic', 'christmas'],
  },
  {
    id: 'storm-clouds',
    label: 'Storm Clouds',
    metaphor: 'Weight that has not broken yet.',
    subject:
      'heavy dark storm clouds gathering low with a faint break of light on the horizon',
    composition:
      'very low horizon, dense cloud mass above, small area of light near the lower third, no lightning bolts across the centre',
    atmosphere: 'brooding, heavy, quietly dramatic',
    lighting: 'dim ambient light with one faint warm break',
    texture: 'soft cloud gradients, subtle grain, deep shadow',
    colourBehaviour:
      'background is dark grey-blue; accent colour appears as the faint break of light',
    negativeSpace:
      'dark cloud mass across the upper frame, lower middle kept clean for the waveform',
    lyricKeywords: [
      'storm', 'thunder', 'lightning', 'rain', 'wind', 'dark', 'grey', 'cloud',
      'break', 'fall', 'cold', 'flood',
    ],
    emotions: ['heartbreak', 'anger', 'anxiety', 'grief'],
    genres: ['rock', 'metal', 'alternative', 'post-rock'],
  },
  {
    id: 'ethereal-forest',
    label: 'Ethereal Forest',
    metaphor: 'Light finding its way through.',
    subject:
      'misty forest with soft light filtering through tall trees and low fog',
    composition:
      'low horizon, vertical tree trunks at the edges, open misty centre, no detailed foliage in the middle band',
    atmosphere: 'quiet, mystical, gently alive',
    lighting: 'soft shafts of light through mist, muted green shadows',
    texture: 'fog, moss softness, subtle film grain',
    colourBehaviour:
      'background is deep muted green or cool shadow; accent colour appears as light shafts and fog highlights',
    negativeSpace:
      'misty open centre and upper frame where the waveform and lyrics will sit',
    lyricKeywords: [
      'forest', 'tree', 'leaf', 'wood', 'nature', 'green', 'walk', 'path',
      'wild', 'grow', 'roots', 'earth',
    ],
    emotions: ['rebirth', 'dreamlike', 'hope'],
    genres: ['folk', 'ambient', 'indie', 'cinematic'],
  },
  {
    id: 'inner-fire',
    label: 'Inner Fire',
    metaphor: 'Something burning quietly inside.',
    subject:
      'warm embers and soft flame-like glow rising through deep darkness without showing a literal fire',
    composition:
      'low horizon, glow rising from the lower third, dark empty upper frame, no sharp flames across the centre',
    atmosphere: 'passionate, intense, controlled',
    lighting: 'warm orange-red glow against near-black',
    texture: 'soft ember bokeh, subtle smoke haze, film grain',
    colourBehaviour:
      'background is near-black; accent colour appears as ember glow and warm highlights',
    negativeSpace:
      'dark empty middle and upper frame, warmth kept low and soft',
    lyricKeywords: [
      'fire', 'burn', 'flame', 'ember', 'heat', 'passion', 'desire', 'hot',
      'ignite', 'spark', 'blaze', 'anger',
    ],
    emotions: ['anger', 'love', 'euphoria'],
    genres: ['rock', 'pop', 'hip-hop', 'edm'],
  },
  {
    id: 'quiet-horizon',
    label: 'Quiet Horizon',
    metaphor: 'Space that asks for nothing.',
    subject:
      'minimal empty landscape under a vast sky with one distant point of light or colour',
    composition:
      'extremely low horizon, near-empty frame, focal point small and low, huge negative space',
    atmosphere: 'calm, solitary, contemplative',
    lighting: 'soft ambient dusk or dawn light',
    texture: 'subtle gradient, fine grain, smooth tonal transitions',
    colourBehaviour:
      'background is a muted palette wash; accent colour appears as the single distant point of light',
    negativeSpace:
      'almost the entire frame is empty, leaving maximum room for typography and waveform',
    lyricKeywords: [
      'lonely', 'alone', 'empty', 'quiet', 'cold', 'distance', 'far', 'silence',
      'nothing', 'horizon', 'still', 'wait',
    ],
    emotions: ['loneliness', 'emptiness', 'existentialism'],
    genres: ['ambient', 'minimal', 'classical', 'cinematic'],
  },
  {
    id: 'cracked-mirror',
    label: 'Cracked Mirror',
    metaphor: 'A reflection broken by what happened.',
    subject:
      'shattered mirror fragments reflecting soft light, hairline cracks spreading across a dark reflective surface, no human reflection visible',
    composition:
      'fragments pushed toward the edges, large calm centre kept free of sharp detail',
    atmosphere: 'fragile, fractured, introspective',
    lighting: 'cool directional light catching the crack edges',
    texture: 'glass, fine cracks, subtle dust on the surface',
    colourBehaviour:
      'background is deep shadow; accent colour appears along the bright crack lines and fragment edges',
    negativeSpace:
      'dark empty centre and upper frame, broken glass kept to the borders',
    lyricKeywords: [
      'mirror', 'break', 'crack', 'shatter', 'reflection', 'fragile', 'fracture',
      'split', 'fall apart', 'pieces',
    ],
    emotions: ['heartbreak', 'regret', 'anxiety'],
    genres: ['indie', 'alternative', 'pop', 'rock'],
  },
  {
    id: 'fading-polaroid',
    label: 'Fading Polaroid',
    metaphor: 'A memory losing its colour.',
    subject:
      'single aged instant photograph with faded warm tones, soft white border, image inside gently bleached and indistinct',
    composition:
      'photograph placed off-centre, large empty surrounding space, calm central lower band',
    atmosphere: 'nostalgic, tender, vanishing',
    lighting: 'soft warm desk-lamp glow, gentle vignette',
    texture: 'matte paper, chemical fade, slight curl at the corner',
    colourBehaviour:
      'background is warm cream or deep shadow; accent colour appears in the faded image tones',
    negativeSpace:
      'generous empty area around the polaroid for lyrics and waveform',
    lyricKeywords: [
      'memory', 'remember', 'photo', 'photograph', 'polaroid', 'fade', 'old',
      'yesterday', 'used to', 'gone', 'miss',
    ],
    emotions: ['nostalgia', 'regret', 'heartbreak'],
    genres: ['lofi', 'indie', 'folk', 'acoustic'],
  },
  {
    id: 'tangled-wires',
    label: 'Tangled Wires',
    metaphor: 'Connections that cannot be undone.',
    subject:
      'looped and knotted cables, threads, or vines suspended in soft focus against a dark ground, gentle twists without chaos',
    composition:
      'tangles pushed to the upper corners and lower edges, open calm centre',
    atmosphere: 'entangled, unresolved, intimate',
    lighting: 'subtle rim light defining each strand',
    texture: 'smooth rubber or silk, soft bokeh, shallow depth',
    colourBehaviour:
      'background is near-black; accent colour appears as subtle highlights along the strands',
    negativeSpace:
      'dark empty middle band where the waveform and lyrics will sit',
    lyricKeywords: [
      'wire', 'tangle', 'knot', 'tie', 'bind', 'connection', 'hold', 'thread',
      'string', 'chain', 'pull',
    ],
    emotions: ['love', 'anxiety', 'heartbreak'],
    genres: ['electronic', 'indie', 'pop', 'r&b'],
  },
  {
    id: 'ink-in-water',
    label: 'Ink in Water',
    metaphor: 'Emotion spreading where it cannot be contained.',
    subject:
      'a single drop of ink blooming and swirling through clear water, soft organic clouds of pigment',
    composition:
      'ink drift concentrated to one side, large calm negative space on the opposite side and centre',
    atmosphere: 'fluid, emotional, uncontrollable',
    lighting: 'soft backlight making the ink glow',
    texture: 'liquid diffusion, delicate wisps, slow motion',
    colourBehaviour:
      'background is pale or clear water; accent colour is the ink itself',
    negativeSpace:
      'clear water occupying the centre and upper frame, ink kept to one edge',
    lyricKeywords: [
      'ink', 'water', 'spread', 'bleed', 'drown', 'swim', 'flow', 'wash',
      'stain', 'cloud', 'submerge',
    ],
    emotions: ['grief', 'love', 'dreamlike'],
    genres: ['ambient', 'cinematic', 'indie', 'pop'],
  },
  {
    id: 'burning-letter',
    label: 'Burning Letter',
    metaphor: 'Words too late to take back.',
    subject:
      'a single sheet of paper with edges curling and blackening in flame, embers drifting upward, no readable text',
    composition:
      'paper placed low in frame, flames rising toward the upper third, calm upper area',
    atmosphere: 'final, sorrowful, releasing',
    lighting: 'warm firelight flickering against deep shadow',
    texture: 'charring paper, ash, soft smoke haze',
    colourBehaviour:
      'background is near-black; warm orange-red fire and ember accents',
    negativeSpace:
      'dark empty upper and middle frame, flame and embers kept to the lower third',
    lyricKeywords: [
      'letter', 'burn', 'fire', 'ashes', 'words', 'write', 'sorry', 'goodbye',
      'flame', 'smoke', 'ember',
    ],
    emotions: ['regret', 'heartbreak', 'anger'],
    genres: ['rock', 'pop', 'folk', 'country'],
  },
  {
    id: 'empty-stage',
    label: 'Empty Stage',
    metaphor: 'A performance no one gave.',
    subject:
      'a single spotlight illuminating an empty stage floor, mic stand or chair as a small silhouette, heavy darkness beyond the light pool',
    composition:
      'spotlight low and central but small, vast darkness surrounding it, no performer',
    atmosphere: 'lonely, expectant, unresolved',
    lighting: 'one hard spotlight cone cutting through black',
    texture: 'dust motes in the beam, smooth stage floor, deep shadow',
    colourBehaviour:
      'background is pure black; accent colour appears in the spotlight edge and floor reflection',
    negativeSpace:
      'dark empty centre and upper frame, spotlight pool kept small and low',
    lyricKeywords: [
      'stage', 'spotlight', 'performance', 'empty', 'alone', 'sing', 'microphone',
      'audience', 'curtain', 'show',
    ],
    emotions: ['loneliness', 'regret', 'hope'],
    genres: ['pop', 'rock', 'cinematic', 'indie'],
  },
  {
    id: 'liquid-metal',
    label: 'Liquid Metal',
    metaphor: 'Something hard made soft by heat.',
    subject:
      'molten metallic surface with slow ripples and soft reflections, no sharp edges, abstract and sculptural',
    composition:
      'metal fills lower two-thirds with subtle horizon, calm upper third kept dark and empty',
    atmosphere: 'heavy, sensual, industrial but warm',
    lighting: 'low warm light raking across the liquid surface',
    texture: 'mercury-like sheen, slow ripples, polished metal',
    colourBehaviour:
      'background is dark; accent colour appears as highlights on the liquid ridges',
    negativeSpace:
      'dark empty upper frame, metallic detail kept below the centre',
    lyricKeywords: [
      'metal', 'liquid', 'melt', 'heat', 'silver', 'gold', 'iron', 'steel',
      'mercury', 'flow', 'molten',
    ],
    emotions: ['love', 'anger', 'euphoria'],
    genres: ['electronic', 'metal', 'pop', 'hip-hop'],
  },
  {
    id: 'fabric-ripples',
    label: 'Fabric Ripples',
    metaphor: 'Feeling moving under the surface.',
    subject:
      'soft cloth or silk draped in gentle folds and ripples, catching light and shadow, no figure underneath',
    composition:
      'fabric waves pushed to the lower half and edges, large calm upper centre',
    atmosphere: 'tender, vulnerable, quietly emotional',
    lighting: 'soft side light creating subtle highlight and shadow in the folds',
    texture: 'silk, velvet, fine weave, gentle motion blur',
    colourBehaviour:
      'background matches the fabric shadow; accent colour appears on the fold highlights',
    negativeSpace:
      'calm upper and central area, fabric detail kept to the lower frame',
    lyricKeywords: [
      'fabric', 'silk', 'soft', 'touch', 'skin', 'hold', 'fold', 'ripple',
      'blanket', 'sheet', 'cloth',
    ],
    emotions: ['love', 'nostalgia', 'grief'],
    genres: ['r&b', 'pop', 'indie', 'ambient'],
  },
  {
    id: 'drowning-flower',
    label: 'Drowning Flower',
    metaphor: 'Beauty held under.',
    subject:
      'a single flower submerged in dark water, petals gently spreading, slow bubbles rising, no stem visible',
    composition:
      'flower placed slightly below centre, water surface near top, vast dark water around it',
    atmosphere: 'melancholic, delicate, suspended',
    lighting: 'soft light from above piercing the water surface',
    texture: 'water distortion, delicate petals, fine bubbles',
    colourBehaviour:
      'background is deep water; accent colour appears in the flower petals and light caustics',
    negativeSpace:
      'dark water across the centre and upper frame, flower kept small and low',
    lyricKeywords: [
      'flower', 'drown', 'water', 'submerge', 'petal', 'rose', 'bloom', 'sink',
      'under', 'deep', 'dark',
    ],
    emotions: ['grief', 'love', 'heartbreak'],
    genres: ['indie', 'pop', 'ambient', 'cinematic'],
  },
  {
    id: 'broken-clock',
    label: 'Broken Clock',
    metaphor: 'Time that stopped meaning something.',
    subject:
      'an antique clock face with cracked glass, hands frozen, gears faintly visible, no readable numbers',
    composition:
      'clock pushed to one side, large empty surrounding space, calm centre',
    atmosphere: 'frozen, nostalgic, slightly surreal',
    lighting: 'warm amber light from one side, deep shadows',
    texture: 'aged brass, cracked glass, dust particles',
    colourBehaviour:
      'background is dark; warm metallic accents and glass highlights',
    negativeSpace:
      'dark empty centre and upper frame, clock detail kept to one lower corner',
    lyricKeywords: [
      'time', 'clock', 'wait', 'late', 'stop', 'frozen', 'hour', 'minute',
      'forever', 'never', 'again',
    ],
    emotions: ['nostalgia', 'regret', 'loneliness'],
    genres: ['indie', 'folk', 'pop', 'rock'],
  },
];

/** Deterministic rotation used when nothing matches. */
export function getFallbackConcept(existingCount: number): VisualConcept {
  return VISUAL_CONCEPTS[existingCount % VISUAL_CONCEPTS.length];
}

export function getConceptById(id: string): VisualConcept | undefined {
  return VISUAL_CONCEPTS.find((c) => c.id === id);
}
