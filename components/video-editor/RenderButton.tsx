'use client';

import { Button } from '@heroui/react';
import { Download, Music } from 'lucide-react';
import { useState, useEffect } from 'react';
import React from 'react';
import type { VideoSettings } from './AdvancedSettingsModal';
import type { SlideshowSettings } from '@/types/slideshow';
import { AlertModal } from './ui/AlertModal';
import { RenderOptionsModal } from './ui/RenderOptionsModal';
import { getOverlayConfig, type OverlayConfig } from '@/constants/overlays';

interface RenderButtonProps {
  imageUrl: string | null;
  processedAudioUrl: string | null;
  cloudImageUrl?: string | null;
  cloudAudioUrl?: string | null;
  duration: number;
  disabled: boolean;
  videoSettings: VideoSettings;
  slideshowSettings?: SlideshowSettings;
  onRenderStart?: () => void;
  onRenderEnd?: () => void;
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
  autoOpenModal?: boolean; // Auto-open render modal on mount/change
  visualizerType?: string;
  // Captions
  showCaptions?: boolean;
  captions?: any;
  captionStyle?: any;
  useCaptionAnimation?: boolean;
  captionAnimationSpeed?: 'slow' | 'normal' | 'fast';
  captionOverlayDarkness?: number;
  captionOpacity?: number;
  aspectRatio?: 'landscape' | 'portrait';
  captionDelaySeconds?: number;
}

export function RenderButton({
  imageUrl,
  processedAudioUrl,
  cloudImageUrl = null,
  cloudAudioUrl = null,
  duration,
  disabled,
  videoSettings,
  slideshowSettings,
  onRenderStart,
  onRenderEnd,
  // Shared text
  textFont = 'Playfair Display',
  textFontSize = 96,
  textOpacity = 100,
  textOverlayDarkness = 60,
  // Intro
  introText = '',
  introDelaySeconds = 5,
  introPosition = 'center',
  // Outro
  outroText = '',
  outroPosition = 'center',
  outroStartBeforeEnd = 6,
  autoOpenModal = false,
  visualizerType = 'default',
  showCaptions = false,
  captions,
  captionStyle,
  useCaptionAnimation = true,
  captionAnimationSpeed = 'slow',
  captionOverlayDarkness = 60,
  captionOpacity = 100,
  aspectRatio = 'landscape',
  captionDelaySeconds = 0,
}: RenderButtonProps) {
  const [showRenderModal, setShowRenderModal] = useState(false);
  const [isRenderingVideo, setIsRenderingVideo] = useState(false);
  const [isDownloadingAudio, setIsDownloadingAudio] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderFormat, setRenderFormat] = useState<'mp4' | 'webm'>('mp4');
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'error' | 'success' | 'info' | 'warning';
  }>({ isOpen: false, title: '', message: '', type: 'info' });

  const showAlert = (
    title: string,
    message: string,
    type: 'error' | 'success' | 'info' | 'warning' = 'info'
  ) => setAlertModal({ isOpen: true, title, message, type });
  const closeAlert = () => setAlertModal({ ...alertModal, isOpen: false });

  // Auto-open render modal when requested
  useEffect(() => {
    if (autoOpenModal && !disabled) {
      setShowRenderModal(true);
    }
  }, [autoOpenModal, disabled]);

  const handleVideoRender = async (options: {
    renderSample: boolean;
    sampleDuration: number;
    useLambda: boolean;
  }) => {
    if (!processedAudioUrl) return;
    onRenderStart?.();
    setIsRenderingVideo(true);
    setRenderProgress(0);
    const originalTitle = document.title;
    document.title = 'Rendering... - GratefulToday';
    try {
      const fps = 30;
      const actualDuration = options.renderSample
        ? Math.min(duration, options.sampleDuration)
        : duration;
      const durationInFrames = Math.ceil(actualDuration * fps);
      const overlayConfig = getOverlayConfig(videoSettings.overlayEffect);

      const compositionWidth = aspectRatio === 'portrait' ? 1080 : 1920;
      const compositionHeight = aspectRatio === 'portrait' ? 1920 : 1080;

      const isFirefox =
        typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('firefox');
      const audioCodec = isFirefox ? 'opus' : 'aac';
      const container = isFirefox ? 'webm' : 'mp4';
      const videoCodec = isFirefox ? 'vp8' : 'h264';
      const fileExtension = isFirefox ? 'webm' : 'mp4';
      setRenderFormat(container);

      if (options.useLambda) {
        let publicImageUrl = cloudImageUrl ?? imageUrl ?? null;
        let publicAudioUrl = cloudAudioUrl ?? processedAudioUrl ?? null;

        // Upload blob URLs to Firebase Storage (simplified inline)
        if (publicImageUrl && publicImageUrl.startsWith('blob:')) {
          const res = await fetch(publicImageUrl);
          const blob = await res.blob();
          const { getStorage, ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
          const storage = getStorage();
          const path = `renders/${Date.now()}-image.${blob.type?.split('/')[1] || 'bin'}`;
          const r = ref(storage, path);
          await uploadBytes(r, blob, {
            contentType: blob.type || 'application/octet-stream',
            cacheControl: 'public, max-age=31536000',
          });
          publicImageUrl = await getDownloadURL(r);
        }
        if (publicAudioUrl && publicAudioUrl.startsWith('blob:')) {
          const res = await fetch(publicAudioUrl);
          const blob = await res.blob();
          const { getStorage, ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
          const storage = getStorage();
          const path = `renders/${Date.now()}-audio.${blob.type?.split('/')[1] || 'bin'}`;
          const r = ref(storage, path);
          await uploadBytes(r, blob, {
            contentType: blob.type || 'application/octet-stream',
            cacheControl: 'public, max-age=31536000',
          });
          publicAudioUrl = await getDownloadURL(r);
        }

        const inputProps = {
          imageUrl: publicImageUrl,
          audioUrl: publicAudioUrl,
          showOverlay: true,
          overlayConfig,
          slideshowSettings,
          // Shared text settings
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
          transitionColor: videoSettings.transitionColor ?? '#525252',
          showCircularTransition: videoSettings.showCircularTransition ?? true,
          showCircleTransitionStart: videoSettings.showCircleTransitionStart ?? true,
          showCircleTransitionEnd: videoSettings.showCircleTransitionEnd ?? true,
          visualizerType: visualizerType ?? 'default',
          showCaptions,
          captions,
          captionStyle,
          useCaptionAnimation,
          captionAnimationSpeed,
          captionOverlayDarkness,
          captionOpacity,
          captionDelaySeconds,
          durationInFrames,
        };

        const response = await fetch('/api/render-lambda', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputProps, codec: videoCodec, filename: videoSettings.filename }),
        });
        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(error.error || `Failed to start Lambda render (${response.status})`);
        }
        const { renderId, bucketName } = await response.json();

        let complete = false;
        let videoUrl = '';
        while (!complete) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
          const progressResponse = await fetch(
            `/api/render-lambda?renderId=${renderId}&bucketName=${bucketName}`
          );
          if (!progressResponse.ok) throw new Error(await progressResponse.text());
          const progressData = await progressResponse.json();
          if (progressData.overallProgress !== undefined)
            setRenderProgress(Math.round(progressData.overallProgress * 100));
          if (progressData.done) {
            complete = true;
            videoUrl = progressData.outputFile;
          }
          if (progressData.fatalErrorEncountered) throw new Error('Lambda render failed');
        }
        if (videoUrl) {
          const a = document.createElement('a');
          a.href = videoUrl;
          a.download = `${videoSettings.filename}.${fileExtension}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
        setIsRenderingVideo(false);
        setRenderProgress(0);
        document.title = originalTitle;
        onRenderEnd?.();
        showAlert('Success!', 'Video rendered successfully on Lambda!', 'success');
        return;
      }

      const { renderMediaOnWeb } = await import('@remotion/web-renderer');
      const { SlowedReverbComposition } = await import('@/remotion/SlowedReverbComposition');
      const CompositionComponent = (props: SlowedReverbWebProps) =>
        React.createElement(SlowedReverbComposition, props);

      const originalError = console.error;
      console.error = (...args: unknown[]) => {
        const message = String(args[0] ?? '');
        if (message.includes('Failed to fetch')) return;
        originalError(...args);
      };

      const { getBlob } = await renderMediaOnWeb({
        composition: {
          id: 'SlowedReverb',
          component: CompositionComponent,
          durationInFrames,
          fps,
          width: compositionWidth,
          height: compositionHeight,
          defaultProps: {
            imageUrl,
            audioUrl: processedAudioUrl!,
            showOverlay: true,
            overlayConfig,
            slideshowSettings,
            // Shared text settings
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
            transitionColor: videoSettings.transitionColor ?? '#525252',
            showCircularTransition: videoSettings.showCircularTransition ?? true,
            showCircleTransitionStart: videoSettings.showCircleTransitionStart ?? true,
            showCircleTransitionEnd: videoSettings.showCircleTransitionEnd ?? true,
            visualizerType,
            showCaptions,
            captions,
            captionStyle,
            useCaptionAnimation,
            captionAnimationSpeed,
            captionOverlayDarkness,
            captionOpacity,
            captionDelaySeconds,
          },
        },
        inputProps: {
          imageUrl,
          audioUrl: processedAudioUrl!,
          showOverlay: true,
          overlayConfig,
          slideshowSettings,
          // Shared text settings
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
          transitionColor: videoSettings.transitionColor ?? '#525252',
          showCircularTransition: videoSettings.showCircularTransition ?? true,
          showCircleTransitionStart: videoSettings.showCircleTransitionStart ?? true,
          showCircleTransitionEnd: videoSettings.showCircleTransitionEnd ?? true,
          visualizerType: visualizerType ?? 'default',
          showCaptions,
          captions,
          captionStyle,
          useCaptionAnimation,
          captionAnimationSpeed,
          captionOverlayDarkness,
          captionOpacity,
          captionDelaySeconds,
        },
        container,
        videoCodec,
        audioCodec,
        audioBitrate: isFirefox ? 'high' : undefined,
        videoBitrate: 'high',
        hardwareAcceleration: 'prefer-hardware',
        keyframeIntervalInSeconds: 5,
        transparent: false,
        muted: false,
        delayRenderTimeoutInMilliseconds: 120000,
        logLevel: 'error',
        onProgress: ({ renderedFrames, encodedFrames }) => {
          const progress = Math.round((encodedFrames / durationInFrames) * 100);
          setRenderProgress(progress);
        },
        outputTarget: 'web-fs',
        licenseKey: 'free-license',
      });
      console.error = originalError;

      const blob = await getBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${videoSettings.filename}.${fileExtension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setRenderProgress(0);
      showAlert(
        'Success',
        `Video rendered and downloaded successfully as ${fileExtension.toUpperCase()}!`,
        'success'
      );
    } catch (error) {
      console.error('Error rendering video:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to render video. Please try again.';
      showAlert('Render Failed', errorMessage, 'error');
    } finally {
      setIsRenderingVideo(false);
      document.title = originalTitle;
      onRenderEnd?.();
    }
  };

  const handleAudioDownload = async () => {
    if (!processedAudioUrl) return;

    setIsDownloadingAudio(true);

    try {
      const response = await fetch(processedAudioUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${videoSettings.filename}-audio.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading audio:', error);
      alert('Failed to download audio');
    } finally {
      setIsDownloadingAudio(false);
    }
  };

  return (
    <>
      <div className="flex gap-3">
        <Button
          size="lg"
          className="flex-1 bg-purple-600 font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-purple-600"
          onClick={() => setShowRenderModal(true)}
          disabled={disabled || isRenderingVideo}
          startContent={<Download className="h-5 w-5" />}
          isLoading={isRenderingVideo}
        >
          {isRenderingVideo ? `Rendering ${renderProgress}%` : 'Download Video'}
        </Button>

        <Button
          size="lg"
          className="flex-1 border-2 border-purple-600 bg-transparent font-semibold text-purple-400 hover:bg-purple-600/10 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
          onClick={handleAudioDownload}
          disabled={disabled || isDownloadingAudio}
          startContent={<Music className="h-5 w-5" />}
          isLoading={isDownloadingAudio}
        >
          {isDownloadingAudio ? 'Downloading...' : 'Download Audio Only'}
        </Button>
      </div>

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={closeAlert}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
      <RenderOptionsModal
        isOpen={showRenderModal}
        onClose={() => {
          if (!isRenderingVideo) setShowRenderModal(false);
        }}
        onConfirm={handleVideoRender}
        isRendering={isRenderingVideo}
        renderProgress={renderProgress}
        format={renderFormat}
        fullDuration={duration}
      />
    </>
  );
}
interface SlowedReverbWebProps {
  imageUrl: string | null;
  audioUrl: string;
  showOverlay?: boolean;
  overlayConfig?: OverlayConfig;
  overlayText?: string;
  textOverlayDarkness?: number;
  textDelaySeconds?: number;
  textFontSize?: number;
  textOpacity?: number;
  textFont?: 'Playfair Display' | 'Inter';
  textPosition?:
    | 'top-left'
    | 'top-center'
    | 'top-right'
    | 'center-left'
    | 'center'
    | 'center-right'
    | 'bottom-left'
    | 'bottom-center'
    | 'bottom-right';
  transitionColor?: string;
  showCircularTransition?: boolean;
  visualizerType?: string;
  showCaptions?: boolean;
  captions?: any;
  captionStyle?: any;
  useCaptionAnimation?: boolean;
  captionOverlayDarkness?: number;
  captionOpacity?: number;
  captionDelaySeconds?: number;
}
