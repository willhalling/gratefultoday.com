/**
 * ZoomImage Component
 * 
 * Implements Ken Burns zoom effect for slideshow images.
 * Adapted from OneTribute's zoom-image.tsx component.
 * 
 * Features:
 * - Adjustable zoom focal points (x, y coordinates)
 * - Smooth scale animations
 * - Aspect ratio preservation
 * - Support for both image-based (0-imageWidth) and video-based (0-1) coordinates
 */

import { Img, AbsoluteFill, useVideoConfig } from 'remotion';

export interface ZoomImageProps {
  /** Current scale value (animated from 1.0 to zoomScale) */
  scale: number;
  /** Zoom focal point (x, y coordinates) */
  zoom: {
    x: number;
    y: number;
  };
  /** Image URL */
  imageUrl: string;
  /** Original image width (for aspect ratio calculation) */
  slideImageWidth?: number;
  /** Original image height (for aspect ratio calculation) */
  slideImageHeight?: number;
  /** Whether this is being rendered (vs preview) */
  isRender?: boolean;
  /** Whether this is a thumbnail (disables animations) */
  isThumbnail?: boolean;
}

export const ZoomImage: React.FC<ZoomImageProps> = ({
  scale,
  zoom,
  imageUrl,
  slideImageWidth,
  slideImageHeight,
  isRender = false,
  isThumbnail = false,
}) => {
  const videoConfig = useVideoConfig();
  const { width: videoWidth, height: videoHeight } = videoConfig;

  // Calculate aspect ratios
  const videoAspect = videoWidth / videoHeight;
  const imageAspect = slideImageWidth && slideImageHeight ? slideImageWidth / slideImageHeight : videoAspect;

  // Determine if zoom coordinates are image-based (0-imageWidth) or video-based (0-1)
  const isImageBasedZoom = zoom.x > 1 || zoom.y > 1;

  // Convert zoom coordinates to normalized 0-1 range if needed
  const normalizedZoomX = isImageBasedZoom && slideImageWidth ? zoom.x / slideImageWidth : zoom.x;
  const normalizedZoomY = isImageBasedZoom && slideImageHeight ? zoom.y / slideImageHeight : zoom.y;

  // Calculate transform origin as percentages (0-100)
  // This is where the zoom will focus on
  const transformOriginX = normalizedZoomX * 100;
  const transformOriginY = normalizedZoomY * 100;

  // Calculate image dimensions to fill the video frame while preserving aspect ratio
  let imageWidth: number;
  let imageHeight: number;

  if (imageAspect > videoAspect) {
    // Image is wider than video - fit to height
    imageHeight = videoHeight;
    imageWidth = imageHeight * imageAspect;
  } else {
    // Image is taller than video - fit to width
    imageWidth = videoWidth;
    imageHeight = imageWidth / imageAspect;
  }

  return (
    <AbsoluteFill>
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${imageWidth}px`,
            height: `${imageHeight}px`,
            transformOrigin: `${transformOriginX}% ${transformOriginY}%`,
            transform: `scale(${scale})`,
            transition: isThumbnail ? 'none' : undefined,
          }}
        >
          <Img
            src={imageUrl}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
            onError={(event) => {
              console.warn('Image failed to load:', imageUrl, event);
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
