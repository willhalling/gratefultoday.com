import type { CaptionData, CaptionSegment } from './caption-types';

// Parse SRT format into CaptionData
export function parseSRT(srtText: string): CaptionData {
  const lines = srtText.replace(/\r/g, '').split('\n');
  const segments: CaptionSegment[] = [];
  let i = 0;
  let idCounter = 0;

  const timeToSeconds = (time: string) => {
    const trimmed = time.trim();
    
    // Check for simple decimal seconds format: "4.080" or "13.120"
    if (/^\d+\.\d+$/.test(trimmed)) {
      return parseFloat(trimmed);
    }
    
    // Standard SRT format: 00:00:12,345 or 00:00:12.345 -> seconds
    const m = trimmed.match(/(\d+):(\d+):(\d+)[,.](\d+)/);
    if (!m) return 0;
    const h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const s = parseInt(m[3], 10);
    const ms = parseInt(m[4], 10);
    return h * 3600 + min * 60 + s + ms / 1000;
  };

  while (i < lines.length) {
    const indexLine = lines[i].trim();
    if (!indexLine) { i++; continue; }

    // Skip numeric index
    if (/^\d+$/.test(indexLine)) {
      i++;
    }

    // Timing line - support both standard SRT (00:00:12,345) and simple seconds (12.345)
    const timingLine = lines[i]?.trim();
    // Match standard format OR simple decimal seconds format
    const match = timingLine?.match(/(\d+:\d+:\d+[,.]\d+|\d+\.\d+)\s+-->\s+(\d+:\d+:\d+[,.]\d+|\d+\.\d+)/);
    if (!match) { i++; continue; }
    const start = timeToSeconds(match[1]);
    const end = timeToSeconds(match[2]);
    i++;

    // Collect text lines until blank
    const textLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== '') {
      textLines.push(lines[i]);
      i++;
    }
    // Skip blank line
    i++;

    const text = textLines.join('\n').trim();
    if (text) {
      segments.push({ id: `segment-${idCounter++}`, text, startTime: start, endTime: end });
    }
  }

  const totalDuration = segments.length > 0 ? segments[segments.length - 1].endTime : 0;
  return { segments, totalDuration };
}

// Basic WebVTT parser (subset)
export function parseVTT(vttText: string): CaptionData {
  const cleaned = vttText.replace(/^WEBVTT.*\n/, '');
  return parseSRT(cleaned.replace(/\./g, ',')); // reuse SRT parser by normalizing decimals
}
