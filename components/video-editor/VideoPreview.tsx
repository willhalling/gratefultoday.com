'use client';

import { Card, CardBody, CardHeader } from '@heroui/react';
import { Player } from '@remotion/player';
import { VideoDescription } from './VideoDescription';
import { VideoTitle } from './VideoTitle';
import { SlowedReverbComposition } from '@/remotion/SlowedReverbComposition';
import type { CaptionData, CaptionStyle } from '@/lib/remotion/caption-types';
import type { SlideshowSettings } from '@/types/slideshow';

interface VideoPreviewProps {
  imageUrl: string | null;
  audioUrl: string | null;
  audioDuration: number;
  hasChanges?: boolean;
  showPreview?: boolean;
  isProcessing?: boolean;
  debugMarkers?: {
    fadeDownStartSec: number;
    fadeDownEndSec: number;
    fadeUpStartSec: number;
    fadeUpEndSec: number;
  } | null;
  // Slideshow settings
  slideshowSettings?: SlideshowSettings;
  // Shared text settings
  textFont?: 'Playfair Display' | 'Inter';
  textFontSize?: number;
  textOpacity?: number;
  textOverlayDarkness?: number;
  // Intro
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
  // Outro
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
  transitionColor?: string;
  showCircularTransition?: boolean;
  showCircleTransitionStart?: boolean;
  showCircleTransitionEnd?: boolean;
  visualizerType?: string;
  videoTitle?: string;
  videoDescription?: string;
  onVideoTitleChange?: (title: string) => void;
  onVideoDescriptionChange?: (description: string) => void;
  // Captions
  showCaptions?: boolean;
  captions?: CaptionData;
  captionStyle?: CaptionStyle;
  useCaptionAnimation?: boolean;
  captionAnimationSpeed?: 'slow' | 'normal' | 'fast';
  captionOverlayDarkness?: number;
  captionOpacity?: number;
  aspectRatio?: 'landscape' | 'portrait';
  captionDelaySeconds?: number;
}

export function VideoPreview({
  imageUrl,
  audioUrl,
  audioDuration,
  hasChanges,
  showPreview,
  isProcessing,
  debugMarkers,
  slideshowSettings,
  // Shared text
  textFont,
  textFontSize,
  textOpacity,
  textOverlayDarkness,
  // Intro
  introText,
  introDelaySeconds,
  introPosition,
  // Outro
  outroText,
  outroPosition,
  outroStartBeforeEnd,
  videoTitle,
  videoDescription,
  onVideoTitleChange,
  onVideoDescriptionChange,
  transitionColor,
  showCircularTransition,
  showCircleTransitionStart,
  showCircleTransitionEnd,
  visualizerType,
  showCaptions,
  captions,
  captionStyle,
  useCaptionAnimation,
  captionAnimationSpeed,
  captionOverlayDarkness,
  captionOpacity,
  aspectRatio = 'landscape',
  captionDelaySeconds,
}: VideoPreviewProps) {
  const fps = 24;
  const durationInFrames = Math.ceil(audioDuration * fps);

  // Set dimensions based on aspect ratio
  const compositionWidth = aspectRatio === 'portrait' ? 1080 : 1920;
  const compositionHeight = aspectRatio === 'portrait' ? 1920 : 1080;
  const inputProps = {
    imageUrl,
    audioUrl: audioUrl || '',
    showOverlay: false,
    debugMarkers,
    slideshowSettings,
    // Shared text settings
    textFont: textFont ?? 'Playfair Display',
    textFontSize: textFontSize ?? 96,
    textOpacity: textOpacity ?? 100,
    textOverlayDarkness: textOverlayDarkness ?? 60,
    // Intro
    introText: introText ?? '',
    introDelaySeconds: introDelaySeconds ?? 5,
    introPosition: introPosition ?? 'center',
    // Outro
    outroText: outroText ?? '',
    outroPosition: outroPosition ?? 'center',
    outroStartBeforeEnd: outroStartBeforeEnd ?? 6,
    transitionColor: transitionColor ?? '#525252',
    visualizerType: visualizerType ?? 'default',
    showCircularTransition: showCircularTransition ?? true,
    showCircleTransitionStart: showCircleTransitionStart ?? true,
    showCircleTransitionEnd: showCircleTransitionEnd ?? true,
    outroText: outroText ?? '',
    // Captions
    showCaptions: !!showCaptions,
    captions,
    captionStyle,
    useCaptionAnimation: !!useCaptionAnimation,
    captionAnimationSpeed: captionAnimationSpeed ?? 'slow',
    captionOverlayDarkness: captionOverlayDarkness ?? 60,
    captionOpacity: captionOpacity ?? 100,
    captionDelaySeconds: captionDelaySeconds ?? 0,
  };

  if (isProcessing) {
    return (
      <Card className="border-gray-800 bg-gray-950">
        <CardBody className="bg-gray-950">
          <VideoTitle
            value={videoTitle || ''}
            onChange={onVideoTitleChange || (() => {})}
            placeholder="Enter video title..."
          />
          <div className="flex aspect-video items-center justify-center rounded-lg bg-gray-900">
            <p className="text-sm text-gray-400">Processing audio...</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  if (!audioUrl) {
    return (
      <Card className="border-gray-800 bg-gray-950">
        <CardBody className="bg-gray-950">
          <VideoTitle
            value={videoTitle || ''}
            onChange={onVideoTitleChange || (() => {})}
            placeholder="Enter video title..."
          />
          <div className="flex aspect-video items-center justify-center rounded-lg bg-gray-900">
            <p className="text-sm text-gray-500">Upload audio to preview</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  if (!showPreview || hasChanges) {
    return (
      <Card className="border-gray-800 bg-gray-950">
        <CardBody className="bg-gray-950">
          <VideoTitle
            value={videoTitle || ''}
            onChange={onVideoTitleChange || (() => {})}
            placeholder="Enter video title..."
          />
          <div className="flex aspect-video items-center justify-center rounded-lg bg-gray-900">
            <p className="text-sm text-gray-500">
              {hasChanges
                ? 'Settings changed - click "Update Preview"'
                : 'Click "Generate Preview" to see your video'}
            </p>
          </div>
        </CardBody>
      </Card>
    );
  }

  if (!audioUrl) {
    return (
      <Card className="w-full bg-gray-900">
        <CardBody className="text-center">
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500">Generate preview to see your video</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="border-gray-800 bg-gray-950 h-full flex flex-col">
      <CardBody className="bg-gray-950 flex flex-col h-full">
        <VideoTitle
          value={videoTitle || ''}
          onChange={onVideoTitleChange || (() => {})}
          placeholder="Enter video title..."
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="overflow-hidden rounded-lg w-full max-w-4xl">
            <Player
              component={SlowedReverbComposition}
              inputProps={inputProps}
              durationInFrames={durationInFrames}
              compositionWidth={compositionWidth}
              compositionHeight={compositionHeight}
              fps={fps}
              style={{
                width: '100%',
                aspectRatio: aspectRatio === 'portrait' ? '9/16' : '16/9',
                maxHeight: aspectRatio === 'portrait' ? '80vh' : 'none',
                margin: '0 auto',
              }}
              controls
              autoPlay={false}
              initiallyMuted={false}
              loop={false}
              spaceKeyToPlayOrPause
              clickToPlay
              doubleClickToFullscreen
              showVolumeControls
              acknowledgeRemotionLicense
              // Reduce preview quality to prevent crackling
              renderLoading={() => (
                <div className="flex items-center justify-center h-full bg-gray-900">
                  <p className="text-sm text-gray-400">Loading preview...</p>
                </div>
              )}
            />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
