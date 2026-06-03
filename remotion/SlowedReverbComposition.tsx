'use client';
import React from 'react';
import { Video, Audio } from '@remotion/media';
import {
  useAudioData,
  visualizeAudioWaveform,
  createSmoothSvgPath,
  visualizeAudio,
} from '@remotion/media-utils';
import {
  AbsoluteFill,
  Img,
  useCurrentFrame,
  useVideoConfig,
  Loop,
  staticFile,
  prefetch,
} from 'remotion';
import { OVERLAY_OPTIONS, type OverlayConfig } from '../constants/overlays';
import { AnimatedTextEffect3 } from './AnimatedTextEffect3';
import { CircularTransition } from './CircularTransition';
import { BarsVisualization } from './visualizations/BarsVisualization';
import { HillsVisualization } from './visualizations/HillsVisualization';
import { RadialBarsVisualization } from './visualizations/RadialBarsVisualization';
import { WaveVisualization } from './visualizations/WaveVisualization';
import { CaptionAnimatedRenderer } from './components/CaptionAnimatedRenderer';
import { CaptionRenderer } from './components/CaptionRenderer';
import { ImageSlideshow } from '../components/video-editor/slideshow/ImageSlideshow';
import type { SlideshowSettings } from '../types/slideshow';

// Prefetch overlay videos for better performance
const overlayFiles = OVERLAY_OPTIONS.filter((o) => o.file !== null).map((o) => staticFile(o.file!));
if (typeof window !== 'undefined') {
  overlayFiles.forEach((file) => prefetch(file));
}

interface SlowedReverbCompositionProps {
  imageUrl: string | null;
  audioUrl: string;
  showOverlay?: boolean;
  overlayConfig?: OverlayConfig;
  debugMarkers?: {
    fadeDownStartSec: number;
    fadeDownEndSec: number;
    fadeUpStartSec: number;
    fadeUpEndSec: number;
  } | null;
  // Slideshow settings (replaces single background image)
  slideshowSettings?: SlideshowSettings;
  // Shared text settings
  textFont?: 'Playfair Display' | 'Inter';
  textFontSize?: number;
  textOpacity?: number;
  textOverlayDarkness?: number;
  // Intro text
  introText?: string;
  introDelaySeconds?: number;
  introPosition?:
    | 'top-left'
    | 'top-center'
    | 'top-right'
    | 'center-left'
    | 'center'
    | 'center-right'
    | 'bottom-left'
    | 'bottom-center'
    | 'bottom-right';
  // Outro text
  outroText?: string;
  outroPosition?:
    | 'top-left'
    | 'top-center'
    | 'top-right'
    | 'center-left'
    | 'center'
    | 'center-right'
    | 'bottom-left'
    | 'bottom-center'
    | 'bottom-right';
  outroStartBeforeEnd?: number;
  transitionColor?: string; // Hex color for circular transitions
  showCircularTransition?: boolean; // Whether to show circular transitions
  showCircleTransitionStart?: boolean; // Whether to show circular transition at start
  showCircleTransitionEnd?: boolean; // Whether to show circular transition at end
  visualizerType?: string; // Type of audio visualizer (default, bars, wave, hills, radial)
  // Captions
  showCaptions?: boolean;
  captions?: import('../lib/remotion/caption-types').CaptionData;
  captionStyle?: import('../lib/remotion/caption-types').CaptionStyle;
  useCaptionAnimation?: boolean;
  captionAnimationSpeed?: 'slow' | 'normal' | 'fast';
  captionOverlayDarkness?: number; // 0-100
  captionOpacity?: number; // 0-100
  captionDelaySeconds?: number; // Delay before captions start in seconds
}

export const SlowedReverbComposition: React.FC<SlowedReverbCompositionProps> = ({
  imageUrl,
  audioUrl,
  showOverlay = false,
  overlayConfig,
  slideshowSettings,
  // Shared text settings
  textFont = 'Playfair Display',
  textFontSize = 96,
  textOpacity = 100,
  textOverlayDarkness = 60,
  // Intro
  introText,
  introDelaySeconds = 5,
  introPosition = 'center',
  // Outro
  outroText,
  outroPosition = 'center',
  outroStartBeforeEnd = 6,
  transitionColor = '#525252',
  visualizerType = 'default',
  showCircularTransition = true,
  showCircleTransitionStart = true,
  showCircleTransitionEnd = true,
  showCaptions = false,
  captions,
  captionStyle,
  useCaptionAnimation = true,
  captionAnimationSpeed = 'slow',
  captionOverlayDarkness = 60,
  captionOpacity = 100,
  captionDelaySeconds = 0,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames } = useVideoConfig();
  const audioData = useAudioData(audioUrl);

  // Pre-calculate timing values to avoid recalculating on every frame
  const outroStartFrame = durationInFrames - fps * outroStartBeforeEnd;
  const outroDelaySeconds = Math.max(0, outroStartFrame / fps);
  const introFadeOutStartFrame = outroStartFrame - fps;

  // Debug captions
  if (frame === 0 && showCaptions) {
    console.log('Captions enabled:', showCaptions);
    console.log('Captions data:', captions);
    console.log('Caption style:', captionStyle);
    console.log('Use animation:', useCaptionAnimation);
  }

  // Get audio waveform data (better for voice/music visualization)
  const waveform = audioData
    ? visualizeAudioWaveform({
        fps,
        frame,
        audioData,
        numberOfSamples: 256,
        windowInSeconds: 2, // Show 2 seconds of audio for more unique pattern
      })
    : [];

  // Apply a global delay to all caption timings so users can
  // start captions later without modifying the original file.
  const effectiveCaptions =
    captions && captionDelaySeconds !== 0
      ? {
          ...captions,
          segments: captions.segments.map((segment) => ({
            ...segment,
            startTime: segment.startTime + captionDelaySeconds,
            endTime: segment.endTime + captionDelaySeconds,
          })),
        }
      : captions;

  // Get frequency data for advanced visualizers
  const frequencyData = audioData
    ? visualizeAudio({
        fps,
        frame,
        audioData,
        numberOfSamples: 512,
      })
    : [];

  // Create smooth SVG path from waveform data - positioned near the bottom
  // so it doesn't get cut off or run too high into the frame.
  const waveformHeight = 250; // Match the visualizer container height
  const amplitude = waveformHeight * 0.15; // 15% of height up/down (reduced)
  const centerY = waveformHeight * 0.7; // Center line position
  const path =
    waveform.length > 0
      ? createSmoothSvgPath({
          points: waveform.map((x, i) => {
            // Calculate y position and clamp to stay within boundaries
            const rawY = centerY + x * amplitude;
            const clampedY = Math.max(10, Math.min(waveformHeight - 10, rawY));
            return {
              x: (i / (waveform.length - 1)) * width,
              y: clampedY,
            };
          }),
        })
      : '';

  // Debug overlay disabled per request; textual readout is shown below player

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* Single Audio track - already mixed with voiceover and ducking applied */}
      {audioUrl && (
        <Audio
          src={audioUrl}
          volume={1}
          // Add playback quality settings to reduce crackling
          pauseWhenBuffering
        />
      )}

      {/* Background Image or Slideshow */}
      {slideshowSettings && slideshowSettings.images.length > 0 ? (
        // Show slideshow if images are configured
        <ImageSlideshow
          settings={slideshowSettings}
          totalDuration={durationInFrames}
          isRender={true}
          isThumbnail={false}
        />
      ) : imageUrl ? (
        // Fallback to single image if no slideshow configured but imageUrl exists
        <AbsoluteFill>
          <Img
            src={imageUrl}
            crossOrigin="anonymous"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </AbsoluteFill>
      ) : (
        // Default gradient background if no images at all
        <AbsoluteFill
          style={{
            background: 'linear-gradient(135deg, #1a0033 0%, #000000 100%)',
          }}
        />
      )}

      {/* Overlay Video - Only shown when showOverlay is true (for final render) */}
      {showOverlay && overlayConfig && overlayConfig.file && (
        <AbsoluteFill>
          <Loop durationInFrames={150}>
            <Video
              src={staticFile(overlayConfig.file)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: overlayConfig.opacity,
                mixBlendMode: overlayConfig.mixBlendMode as React.CSSProperties['mixBlendMode'],
                filter: overlayConfig.filter,
              }}
              muted
            />
          </Loop>
        </AbsoluteFill>
      )}

      {/* Overlay gradient */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(circle, transparent 30%, rgba(0,0,0,0.6) 100%)',
        }}
      />

      {/* Dark overlay for text readability - covers middle section */}
      {((introText && introText.trim().length > 0) || (outroText && outroText.trim().length > 0)) &&
        textOverlayDarkness > 0 && (
          <AbsoluteFill
            style={{
              background: `linear-gradient(180deg, transparent 0%, rgba(0,0,0,${textOverlayDarkness / 100}) 30%, rgba(0,0,0,${textOverlayDarkness / 100}) 70%, transparent 90%)`,
              pointerEvents: 'none',
            }}
          />
        )}

      {/* Dark overlay for captions readability */}
      {showCaptions && captions && captionOverlayDarkness > 0 && (
        <AbsoluteFill
          style={{
            background: `linear-gradient(180deg, transparent 0%, rgba(0,0,0,${captionOverlayDarkness / 100}) 30%, rgba(0,0,0,${captionOverlayDarkness / 100}) 70%, transparent 90%)`,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* G Logo */}
      <AbsoluteFill
        style={{
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'flex-start',
          padding: '40px',
          pointerEvents: 'none',
        }}
      >
        <svg
          width={Math.min(width * 0.08, 80)}
          height={Math.min(width * 0.08 * 1.104, 88)}
          viewBox="0 0 499 551"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            opacity: 0.5,
          }}
        >
          <path
            d="M498.651 296.22C494.19 409.093 439.939 488.523 337.423 532.308C308.173 544.798 276.961 551 245.481 551C205.897 551 165.904 541.195 128.834 521.768C61.9909 486.743 15.3491 426.118 0.85118 355.432C-3.53913 334.028 10.1824 327.571 16.2808 325.777C34.435 320.478 41.8039 336.203 44.5708 342.123C46.2648 345.754 47.9306 349.399 49.5964 353.059C56.0054 367.088 62.6402 381.599 70.7433 394.47C100.939 442.436 143.656 473.462 197.709 486.687C276.043 505.859 356.834 474.889 408.571 405.857C436.085 369.151 449.976 324.703 453.59 261.831C452.277 253.565 451.133 245.244 450.004 236.936C447.491 218.512 444.88 199.467 440.334 181.524C426.966 128.669 397.56 88.8546 352.966 63.2253C287.831 25.7846 193.39 32.4674 133.295 78.7668C99.852 104.537 84.1401 134.815 85.2553 171.323C87.5422 245.696 121.747 302.563 186.938 340.343C228.258 364.291 278.048 357.043 316.911 321.467C352.034 289.297 362.508 242.404 344.255 199.1C328.741 162.309 304.178 140.127 271.229 133.162C248.134 128.273 225.336 134.645 208.678 150.625C190.919 167.664 182.873 193.208 187.178 218.936C192.331 249.751 215.468 269.856 243.222 267.75C256.379 266.776 267.658 259.471 273.403 248.225C278.796 237.671 278.302 225.789 272.062 215.616C268.321 209.513 263.409 206.023 258.581 206.023C253.936 206.037 249.25 209.385 245.721 215.192C243.462 218.922 239.467 221.154 235.641 222.977C230.376 225.492 225.534 227.71 220.24 223.669C215.101 219.742 213.04 209.315 214.254 203.282C216.852 190.312 225.816 180.719 239.495 176.296C262.378 168.879 285.713 177.554 298.941 198.365C313.806 221.734 313.001 253.339 297.007 275.225C281.267 296.756 247.132 307.72 219.308 300.176C175.786 288.378 149.289 250.81 150.164 202.166C150.785 168.045 165.721 136.666 191.145 116.066C215.129 96.6394 246.342 88.8969 276.792 94.8168C315.387 102.333 349.846 128.217 371.346 165.827C392.972 203.663 397.786 246.84 384.587 284.281C369.934 325.833 337.818 359.332 296.484 376.187C255.009 393.099 208.368 391.517 168.488 371.878C101.32 338.775 60.5086 282.218 47.2106 203.762C35.6208 135.436 60.311 80.4763 120.604 40.4218C160.851 13.7047 206.942 0.0847714 257.579 0H258.115C340.783 0 405.042 34.1064 449.129 101.401C485.437 156.827 501.643 220.561 498.651 296.22Z"
            fill="white"
          />
        </svg>
      </AbsoluteFill>

      {/* Audio Visualizer - Hidden when captions are shown */}
      {visualizerType !== 'none' && !showCaptions && (
        <AbsoluteFill
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-end',
            // When a background image is present, sit closer to the bottom edge
            // to avoid overlapping too much of the image content.
            paddingBottom: imageUrl ? 10 : 40,
            paddingLeft: width * 0.1,
            paddingRight: width * 0.1,
            pointerEvents: 'none',
          }}
        >
          {visualizerType === 'bars' && frequencyData.length > 0 && (
            <BarsVisualization
              frequencyData={frequencyData}
              width={width * 0.8}
              height={250}
              lineThickness={8}
              gapSize={10}
              roundness={4}
              color="white"
              placement="middle"
              maxDb={-30}
              minDb={-80}
            />
          )}
          {visualizerType === 'wave' && frequencyData.length > 0 && (
            <WaveVisualization
              frequencyData={frequencyData}
              width={width * 0.8}
              height={250}
              lineColor={['white', 'rgba(255,255,255,0.7)']}
              lines={3}
              lineGap={40}
              sections={12}
              lineThickness={3}
              offsetPixelSpeed={-150}
              maxDb={-30}
              minDb={-80}
            />
          )}
          {visualizerType === 'hills' && frequencyData.length > 0 && (
            <HillsVisualization
              frequencyData={frequencyData}
              width={width * 0.8}
              height={250}
              fillColor="rgba(255,255,255,0.4)"
              strokeColor="white"
              strokeWidth={3}
              copies={4}
              placement="under"
            />
          )}
          {visualizerType === 'radial' && frequencyData.length > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%',
                height: '100%',
              }}
            >
              <RadialBarsVisualization
                frequencyData={frequencyData}
                diameter={Math.min(width, height) * 0.5}
                innerRadius={Math.min(width, height) * 0.15}
                lineThickness={6}
                roundness={3}
                color="white"
                maxDb={-30}
                minDb={-80}
              />
            </div>
          )}
          {visualizerType === 'default' && (
            <svg
              style={{ backgroundColor: 'transparent' }}
              viewBox={`0 0 ${width * 0.8} ${waveformHeight}`}
              width={width * 0.8}
              height={waveformHeight}
            >
              <path
                stroke="white"
                fill="none"
                strokeWidth={5}
                d={path as string}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.9}
              />
            </svg>
          )}
        </AbsoluteFill>
      )}

      {/* Intro Text */}
      {introText &&
        introText.trim().length > 0 &&
        (() => {
          // Only show intro if outro isn't showing
          const isOutroShowing =
            outroText && outroText.trim().length > 0 && frame >= outroStartFrame;

          if (isOutroShowing || frame >= outroStartFrame) {
            return null;
          }

          // Calculate fade out opacity
          let introOpacity = textOpacity / 100;
          if (outroText && outroText.trim().length > 0 && frame >= introFadeOutStartFrame) {
            const fadeProgress = (frame - introFadeOutStartFrame) / fps;
            introOpacity = (textOpacity / 100) * Math.max(0, 1 - fadeProgress);
          }

          return (
            <AnimatedTextEffect3
              text={introText}
              position={introPosition}
              fontSize={textFontSize}
              opacity={introOpacity}
              color="#ffffff"
              delaySeconds={introDelaySeconds}
              font={textFont}
            />
          );
        })()}

      {/* Outro Text - render from start to allow animation */}
      {outroText && outroText.trim().length > 0 && (
        <AnimatedTextEffect3
          text={outroText}
          position={outroPosition}
          fontSize={textFontSize}
          opacity={textOpacity / 100}
          color="#ffffff"
          delaySeconds={outroDelaySeconds}
          font={textFont}
        />
      )}

      {/* Captions Overlay */}
      {showCaptions &&
        effectiveCaptions &&
        (useCaptionAnimation ? (
          <CaptionAnimatedRenderer
            captionData={effectiveCaptions}
            style={captionStyle}
            captionOpacity={captionOpacity}
            animationSpeed={captionAnimationSpeed}
          />
        ) : (
          <CaptionRenderer
            captionData={effectiveCaptions}
            style={captionStyle}
            fadeInDuration={0.3}
            fadeOutDuration={0.3}
            captionOpacity={captionOpacity}
          />
        ))}

      {/* Circular reveal at start */}
      {showCircularTransition && showCircleTransitionStart && (
        <CircularTransition
          startFrame={0}
          duration={fps * 6}
          mode="reveal"
          color={transitionColor}
        />
      )}

      {/* Circular fade to black at end */}
      {showCircularTransition && showCircleTransitionEnd && (
        <CircularTransition
          startFrame={durationInFrames - fps * 3}
          duration={fps * 3}
          mode="fadeToBlack"
          color={transitionColor}
        />
      )}

      {/* Simple fade to black at end - last 1 second to ensure complete black */}
      {showCircularTransition && showCircleTransitionEnd && frame >= durationInFrames - fps && (
        <AbsoluteFill
          style={{
            pointerEvents: 'none',
            background: transitionColor,
            opacity: (frame - (durationInFrames - fps)) / fps,
          }}
        />
      )}
    </AbsoluteFill>
  );
};
