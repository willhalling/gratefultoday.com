/**
 * cards/images — one photoreal 9:16 image per prompt from fal (Flux Pro 1.1
 * Ultra, ~$0.06 each), cached by prompt so re-rendering a card costs nothing.
 * Change the prompt or bump `take` to get a new image.
 *
 * FAL_KEY comes from the environment or the WaveCanvas worktree's .env.local
 * (never printed).
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const ENV = '/Users/will/Documents/wavecanvas-christmas/.env.local';
const MODEL = 'fal-ai/flux-pro/v1.1-ultra';
export const COST_PER_IMAGE = 0.06;

let key;
function falKey() {
  key ??=
    process.env.FAL_KEY ??
    readFileSync(ENV, 'utf8')
      .split('\n')
      .find((l) => l.startsWith('FAL_KEY='))
      ?.slice('FAL_KEY='.length)
      .replace(/^["']|["']$/g, '')
      .trim();
  if (!key) throw new Error(`No FAL_KEY in the environment or ${ENV}`);
  return key;
}

/** Call any fal model and return its JSON. */
export async function fal(endpoint, body) {
  const res = await fetch(`https://fal.run/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Key ${falKey()}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${endpoint} ${res.status}: ${(await res.text()).slice(0, 400)}`);
  return res.json();
}

export const hash = (value) => createHash('sha1').update(JSON.stringify(value)).digest('hex').slice(0, 14);

/** Count of images actually generated (not served from cache) this run. */
export const stats = { generated: 0 };

/**
 * @param {{ prompt: string, take?: number, ref?: string, strength?: number }} spec
 *   `ref` is a local image used as a light style reference.
 * @returns {Promise<string>} path to a 1080×1920 JPEG in `dir`
 */
export async function generateImage({ prompt, take = 1, ref, strength = 0.18 }, dir) {
  const file = join(dir, `gen-${hash({ MODEL, prompt, take, ref, strength })}.jpg`);
  if (existsSync(file)) return file;
  const body = {
    prompt,
    aspect_ratio: '9:16',
    raw: true,
    seed: 1000 + take * 37,
    num_images: 1,
    output_format: 'jpeg',
    safety_tolerance: '2',
  };
  if (ref) {
    const buf = await sharp(ref).resize(576, 1024, { fit: 'cover' }).jpeg({ quality: 85 }).toBuffer();
    body.image_url = `data:image/jpeg;base64,${buf.toString('base64')}`;
    body.image_prompt_strength = strength;
  }
  const res = await fetch(`https://fal.run/${MODEL}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Key ${falKey()}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`fal ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const url = (await res.json()).images?.[0]?.url;
  if (!url) throw new Error('fal returned no image');
  const img = Buffer.from(await (await fetch(url)).arrayBuffer());
  await sharp(img).resize(1080, 1920, { fit: 'cover' }).jpeg({ quality: 93 }).toFile(file);
  stats.generated++;
  return file;
}
