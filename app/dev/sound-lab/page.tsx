import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import SoundLab, { type Variation } from './SoundLab';

export const metadata: Metadata = { title: 'Sound lab (dev)', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/**
 * dev/sound-lab — listen to every sound idea for the song cards, side by side.
 * The files and index.json are made by `node scripts/cards/sound-lab.mjs`
 * (public/dev-media/sound-lab, gitignored).
 */
export default async function SoundLabPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  let variations: Variation[] = [];
  try {
    variations = JSON.parse(await readFile(join(process.cwd(), 'public', 'dev-media', 'sound-lab', 'index.json'), 'utf8'));
  } catch {
    // Not rendered yet: the page says how.
  }
  return <SoundLab variations={variations} />;
}
