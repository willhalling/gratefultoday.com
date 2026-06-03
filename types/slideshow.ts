/**
 * Slideshow Types
 * 
 * Types for multi-image slideshows with Ken Burns zoom effects and transitions.
 */

export interface SlideImage {
  /** Unique identifier for the slide */
  id: string;
  /** Image URL (can be from media library or direct upload) */
  url: string;
  /** Display order (0-indexed) */
  order: number;
  /** Image width (for aspect ratio calculation) */
  width?: number;
  /** Image height (for aspect ratio calculation) */
  height?: number;
  /** Zoom focal point X coordinate (0-1, default 0.5 for center) */
  zoomX?: number;
  /** Zoom focal point Y coordinate (0-1, default 0.5 for center) */
  zoomY?: number;
}

export interface SlideshowSettings {
  /** Array of images to display in slideshow */
  images: SlideImage[];
  /** Enable/disable Ken Burns zoom effect (default: true) */
  zoomEnabled: boolean;
  /** Zoom scale factor (1.0 - 2.0, default: 1.2) */
  zoomScale: number;
  /** Duration per slide in seconds (will be auto-calculated to sync with video duration) */
  durationPerSlide: number;
  /** Transition type between slides (default: 'fade') */
  transitionType: 'fade' | 'slide' | 'wipe';
  /** Transition duration in frames (default: 30 frames = 1 second at 30fps) */
  transitionDuration: number;
}

/** Default slideshow settings */
export const DEFAULT_SLIDESHOW_SETTINGS: SlideshowSettings = {
  images: [],
  zoomEnabled: true,
  zoomScale: 1.2,
  durationPerSlide: 5,
  transitionType: 'fade',
  transitionDuration: 30,
};
