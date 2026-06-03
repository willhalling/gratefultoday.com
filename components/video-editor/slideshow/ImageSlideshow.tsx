/**
 * ImageSlideshow Component
 * 
 * Displays multiple images as a slideshow with Ken Burns zoom effect and transitions.
 * Handles both single images (static with optional zoom) and multiple images (slideshow).
 * 
 * Features:
 * - Automatic slide duration calculation to sync with video length
 * - Fade transitions between slides
 * - Optional Ken Burns zoom effect
 * - Single image support with optional zoom
 */

import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Sequence } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { ZoomImage } from './ZoomImage';
import type { SlideImage, SlideshowSettings } from '@/types/slideshow';

export interface ImageSlideshowProps {
  /** Slideshow settings with images array */
  settings: SlideshowSettings;
  /** Total video duration in frames */
  totalDuration: number;
  /** Whether this is being rendered (vs preview) */
  isRender?: boolean;
  /** Whether this is a thumbnail (disables animations) */
  isThumbnail?: boolean;
}

export const ImageSlideshow: React.FC<ImageSlideshowProps> = ({
  settings,
  totalDuration,
  isRender = false,
  isThumbnail = false,
}) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  // If no images, show nothing
  if (!settings.images || settings.images.length === 0) {
    return (
      <AbsoluteFill style={{ backgroundColor: '#000' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '24px',
          }}
        >
          No images selected
        </div>
      </AbsoluteFill>
    );
  }

  // Sort images by order
  const sortedImages = [...settings.images].sort((a, b) => a.order - b.order);

  // Single image: show static with optional zoom
  if (sortedImages.length === 1) {
    const image = sortedImages[0];
    
    // Calculate zoom scale if enabled
    const scale = isThumbnail 
      ? 1 
      : settings.zoomEnabled 
        ? interpolate(frame, [0, totalDuration], [1, settings.zoomScale], { extrapolateRight: 'clamp' })
        : 1;

    return (
      <ZoomImage
        scale={scale}
        zoom={{
          x: image.zoomX ?? 0.5,
          y: image.zoomY ?? 0.5,
        }}
        imageUrl={image.url}
        slideImageWidth={image.width}
        slideImageHeight={image.height}
        isRender={isRender}
        isThumbnail={isThumbnail}
      />
    );
  }

  // Multiple images: slideshow with transitions
  // TransitionSeries overlaps transitions: total timeline length is
  //   sum(slideDurations) - (numSlides - 1) * transitionDuration
  // We choose a uniform slide duration so that the TransitionSeries timeline
  // is guaranteed to be at least `totalDuration` (so no black tail).
  const transitionDuration = settings.transitionDuration;
  const numSlides = sortedImages.length;
  const baseSlideFrames = Math.ceil((totalDuration + (numSlides - 1) * transitionDuration) / numSlides);

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <TransitionSeries>
        {sortedImages.map((image, index) => {
          const slideDuration = baseSlideFrames;

          // Calculate zoom scale for this slide if enabled
          const scale = isThumbnail
            ? 1
            : settings.zoomEnabled
              ? interpolate(
                  frame - index * baseSlideFrames,
                  [0, slideDuration],
                  [1, settings.zoomScale],
                  { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' }
                )
              : 1;

          return (
            <React.Fragment key={image.id}>
              <TransitionSeries.Sequence durationInFrames={slideDuration}>
                <ZoomImage
                  scale={scale}
                  zoom={{
                    x: image.zoomX ?? 0.5,
                    y: image.zoomY ?? 0.5,
                  }}
                  imageUrl={image.url}
                  slideImageWidth={image.width}
                  slideImageHeight={image.height}
                  isRender={isRender}
                  isThumbnail={isThumbnail}
                />
              </TransitionSeries.Sequence>

              {/* Add transition between slides (except after last slide) */}
              {index < sortedImages.length - 1 && (
                <TransitionSeries.Transition
                  presentation={fade()}
                  timing={linearTiming({ durationInFrames: transitionDuration })}
                />
              )}
            </React.Fragment>
          );
        })}
      </TransitionSeries>
    </AbsoluteFill>
  );
};
