/**
 * Detect whether a background URL points to a video or an image.
 *
 * Background URLs from Firebase Storage (and other CDNs) include query
 * strings like `?alt=media&token=…`, so we must strip the search/hash
 * before checking the file extension — otherwise `.mp4?alt=media…` is
 * treated as an image and the video URL ends up in <Img>, breaking the
 * canvas draw with "image is in a broken state".
 */
const VIDEO_EXT_RE = /\.(mp4|mov|m4v|webm|mkv)$/i;

export function isVideoUrl(rawUrl: string): boolean {
  const url = rawUrl.trim();
  if (!url) return false;
  // Strip query string / fragment so the extension test isn't defeated by
  // signed-URL parameters.
  const noQuery = url.split('?')[0].split('#')[0];
  // Firebase download URLs often encode folder separators as %2F.
  // Use decoded path checks as a strong signal when extensions are absent.
  const decoded = (() => {
    try {
      return decodeURIComponent(noQuery);
    } catch {
      return noQuery;
    }
  })();
  if (/\/media-library\/videos\//i.test(decoded) || /%2Fvideos%2F/i.test(noQuery)) {
    return true;
  }
  if (/\/media-library\/images\//i.test(decoded) || /%2Fimages%2F/i.test(noQuery)) {
    return false;
  }
  // Also strip any trailing path segment after the extension (defensive).
  return VIDEO_EXT_RE.test(noQuery) || VIDEO_EXT_RE.test(decoded);
}

export function backgroundKind(rawUrl: string): 'video' | 'image' {
  return isVideoUrl(rawUrl) ? 'video' : 'image';
}
