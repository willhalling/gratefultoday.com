import path from 'path';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import type { GratitudePostProps } from '@/remotion/gratitude/constants';

const REMOTION_ENTRY = path.resolve(process.cwd(), 'remotion/index.tsx');
const COMPOSITION_ID = 'GratitudePost';

let bundleUrlPromise: Promise<string> | null = null;

/**
 * Bundle the Remotion entry once per server process. Subsequent renders reuse
 * the same in-memory bundle so the cost is paid only on the first request.
 */
function getBundleUrl(): Promise<string> {
  if (!bundleUrlPromise) {
    bundleUrlPromise = bundle({
      entryPoint: REMOTION_ENTRY,
      // Keep webpack output in memory for dev. Remotion writes to a temp dir
      // by default; that's fine here.
    });
  }
  return bundleUrlPromise;
}

export interface RenderGratitudePostOptions {
  inputProps: GratitudePostProps;
  outputPath: string;
}

export interface RenderGratitudePostResult {
  outputPath: string;
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
}

/**
 * Server-side render of the GratitudePost composition to an mp4 file. Caller
 * is responsible for choosing a writable outputPath (e.g. inside public/).
 */
export async function renderGratitudePost(
  options: RenderGratitudePostOptions
): Promise<RenderGratitudePostResult> {
  const serveUrl = await getBundleUrl();

  const composition = await selectComposition({
    serveUrl,
    id: COMPOSITION_ID,
    inputProps: options.inputProps as unknown as Record<string, unknown>,
  });

  await renderMedia({
    serveUrl,
    composition,
    codec: 'h264',
    outputLocation: options.outputPath,
    inputProps: options.inputProps as unknown as Record<string, unknown>,
  });

  return {
    outputPath: options.outputPath,
    durationInFrames: composition.durationInFrames,
    fps: composition.fps,
    width: composition.width,
    height: composition.height,
  };
}
