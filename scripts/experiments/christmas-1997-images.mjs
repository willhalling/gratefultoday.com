#!/usr/bin/env node
/**
 * christmas-1997-images — generates the "gate" and "looking back" shots for
 * the Christmas 1997 video in the fog set's style (fal Flux Pro 1.1 Ultra,
 * 9:16, with the house shot as a light style reference). ~$0.06 per image.
 *
 *   node scripts/experiments/christmas-1997-images.mjs [shot ...]
 *
 * FAL_KEY is read from the WaveCanvas worktree's .env.local (never printed).
 * Output: public/dev-media/christmas-1997/gen/<shot>-<n>.jpg (gitignored).
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'public', 'dev-media', 'christmas-1997', 'gen');
const LIVE = '/Users/will/Documents/wavecanvas-christmas/public/dev-media/christmas/live';
const ENV = '/Users/will/Documents/wavecanvas-christmas/.env.local';

const FAL_KEY =
  process.env.FAL_KEY ??
  readFileSync(ENV, 'utf8')
    .split('\n')
    .find((l) => l.startsWith('FAL_KEY='))
    ?.slice('FAL_KEY='.length)
    .replace(/^["']|["']$/g, '')
    .trim();
if (!FAL_KEY) throw new Error(`No FAL_KEY in env or ${ENV}`);

const STYLE =
  'Cinematic 35mm film photograph, 1990s England, night, thick fog, deep teal and blue-grey fog with one warm amber light, soft halation, fine film grain, muted colours, quiet, empty, tender, nostalgic. No people, no text, no signs.';

const SHOTS = {
  gate: `Eye-level view walking up to the small wooden garden gate of a modest British terraced house on a foggy Christmas night. A low brick front wall with frost on top, a short path to the front door, the frosted glass panel in the door glowing warm. In the bay window a small real Christmas tree with soft multicoloured lights, blurred by fog. A frosted hedge beside the gate. The gate is the focus, close and familiar, like coming home. ${STYLE}`,
  'birds-eye': `High aerial view looking almost straight down on a British terraced street of slate roofs at night, thick fog drifting between the rooftops. One house in the middle has warm amber light glowing from its windows and a small garden and gate in front, the only warm light; every other house is dark and fading into the fog. Chimneys, frost on the roofs, quiet and far away, like rising up and leaving. ${STYLE}`,
  'looking-back': `Looking back from far down a quiet British residential street at night in thick fog, a row of terraced houses fading into the fog. Far away, one window still glows warm with a small Christmas tree, the only warm light in the scene. A street lamp halo, frost on the pavement, a few flakes of snow falling. The feeling of walking away from a home you loved. ${STYLE}`,
};
const PER_SHOT = 3;

async function styleRef() {
  const buf = await sharp(join(LIVE, 'memory_08.jpg')).resize(576, 1024).jpeg({ quality: 85 }).toBuffer();
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

async function generate(prompt, seed, ref) {
  const res = await fetch('https://fal.run/fal-ai/flux-pro/v1.1-ultra', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Key ${FAL_KEY}` },
    body: JSON.stringify({
      prompt,
      aspect_ratio: '9:16',
      raw: true,
      seed,
      num_images: 1,
      output_format: 'jpeg',
      safety_tolerance: '2',
      image_url: ref,
      image_prompt_strength: 0.18,
    }),
  });
  if (!res.ok) throw new Error(`fal ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const url = (await res.json()).images?.[0]?.url;
  if (!url) throw new Error('fal returned no image');
  return Buffer.from(await (await fetch(url)).arrayBuffer());
}

/**
 * The model comes back clearer than the fog set, so thicken the fog: screen a
 * heavy blur over the picture (in RGB), lower the contrast and push it towards
 * teal. Writes <name>-fog.jpg beside the original.
 */
function fogGrade(file) {
  execFileSync('ffmpeg', [
    '-loglevel', 'error', '-y', '-i', file,
    '-filter_complex',
    '[0]format=gbrp,split[a][b];[b]gblur=sigma=45[h];[a][h]blend=all_mode=screen:all_opacity=0.5,eq=contrast=0.85:saturation=0.75:gamma=1.03,colorbalance=rs=-0.06:gs=0.03:bs=0.05:rm=-0.06:gm=0.02:bm=0.03,format=yuvj444p',
    file.replace(/\.jpg$/, '-fog.jpg'),
  ]);
}

mkdirSync(OUT, { recursive: true });
const ref = await styleRef();
const wanted = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SHOTS);
await Promise.all(
  wanted.flatMap((shot) =>
    Array.from({ length: PER_SHOT }, async (_, i) => {
      const img = await generate(SHOTS[shot], 1997 + i * 31, ref);
      const file = join(OUT, `${shot}-${i + 1}.jpg`);
      // Same frame as the rest: 1080×1920.
      await sharp(img).resize(1080, 1920, { fit: 'cover' }).jpeg({ quality: 93 }).toFile(file);
      fogGrade(file);
      console.log(file);
    }),
  ),
);
