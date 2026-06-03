'use client';

import {
  Button,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  Popover,
  PopoverTrigger,
  PopoverContent,
  ButtonGroup,
} from '@heroui/react';
import { Play, Settings as SettingsIcon, Upload, Video as VideoIcon, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, lazy, Suspense } from 'react';
import { IoArrowBack } from 'react-icons/io5';
import { type AdvancedAudioSettings, type VideoSettings } from './AdvancedSettingsModal';
import { FileUpload } from './FileUpload';
import { RenderButton } from './RenderButton';
import { VideoPreview } from './VideoPreview';
import { CaptionsPanel } from './CaptionsPanel';
import { getImpulseResponse } from '@/constants/impulse-responses';
import { useFirestoreSettings } from '@/hooks/useFirestoreSettings';
import { DEFAULT_SLIDESHOW_SETTINGS, type SlideshowSettings } from '@/types/slideshow';

const PreviewSettingsDrawer = lazy(() =>
  import('./PreviewSettingsDrawer').then((mod) => ({ default: mod.PreviewSettingsDrawer }))
);

// Lazy load slideshow manager modal
const SlideshowManagerModal = lazy(() =>
  import('./slideshow/SlideshowManagerModal').then((mod) => ({ default: mod.SlideshowManagerModal }))
);

// Local fallback toast to avoid build-time dependency issues
const toast = {
  warning: (msg: string) => console.warn(msg),
  error: (msg: string) => console.error(msg),
  success: (msg: string) => console.log(msg),
};

// Audio effect presets
const PRESETS = [
  {
    key: 'original',
    label: 'Original Audio',
    description: 'No effects - use the original audio as-is',
    settings: {
      speed: 1.0,
      reverb: 0,
      pitch: 0,
      bassBoost: 0,
      volume: 100,
      location: 'small-room',
    },
  },
  {
    key: 'classic',
    label: 'Classic Slowed + Reverb',
    description: 'The iconic slowed and reverb sound - perfect for chill vibes',
    settings: { speed: 0.8, reverb: 50, pitch: 0, bassBoost: 20, volume: 100, location: 'church' },
  },
  {
    key: 'deep',
    label: 'Deep Slowed',
    description: 'Extra slow with heavy reverb and bass for maximum depth',
    settings: {
      speed: 0.65,
      reverb: 70,
      pitch: -2,
      bassBoost: 40,
      volume: 100,
      location: 'cathedral',
    },
  },
  {
    key: 'dreamy',
    label: 'Dreamy Reverb',
    description: 'High reverb creates an ethereal, atmospheric sound',
    settings: {
      speed: 0.75,
      reverb: 85,
      pitch: 0,
      bassBoost: 10,
      volume: 90,
      location: 'ancient-chamber',
    },
  },
  {
    key: 'nightcore',
    label: 'Nightcore',
    description: 'Faster tempo with higher pitch for energetic tracks',
    settings: {
      speed: 1.25,
      reverb: 20,
      pitch: 4,
      bassBoost: 0,
      volume: 100,
      location: 'small-room',
    },
  },
  {
    key: 'daycore',
    label: 'Daycore',
    description: 'Slower with lower pitch for a relaxed, mellow feel',
    settings: {
      speed: 0.7,
      reverb: 30,
      pitch: -3,
      bassBoost: 30,
      volume: 100,
      location: 'concert-hall',
    },
  },
  {
    key: 'ultra-slowed',
    label: 'Ultra Slowed',
    description: 'Extremely slow with deep bass - dramatic effect',
    settings: {
      speed: 0.5,
      reverb: 60,
      pitch: -4,
      bassBoost: 50,
      volume: 95,
      location: 'cathedral',
    },
  },
];

// Audio visualizer options
const VISUALIZER_OPTIONS = [
  {
    key: 'none',
    label: 'No Visualizer',
    description: 'No audio visualization',
  },
  {
    key: 'default',
    label: 'Default Waveform',
    description: 'Simple audio waveform at the bottom',
  },
  {
    key: 'bars',
    label: 'Vertical Bars',
    description: 'Animated vertical bars that react to the music',
  },
  // Temporarily disabled - needs fixes
  // {
  //   key: 'wave',
  //   label: 'Animated Wave',
  //   description: 'Smooth flowing wave animation',
  // },
  // {
  //   key: 'hills',
  //   label: 'Hills',
  //   description: 'Rolling hills that respond to audio frequencies',
  // },
  {
    key: 'radial',
    label: 'Radial Bars',
    description: 'Circular bars radiating from the center',
  },
];

// Helper function to format time
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

interface SlowedReverbGeneratorProps {
  videoId?: string; // Optional videoId for video-specific settings
  fullWidthPreview?: boolean; // When true, make preview span full width
}

export function SlowedReverbGenerator({
  videoId,
  fullWidthPreview,
}: SlowedReverbGeneratorProps = {}) {
  const router = useRouter();
  const [speed, setSpeed] = useFirestoreSettings('speed', 0.8, videoId);
  const [reverb, setReverb] = useFirestoreSettings('reverb', 50, videoId);

  // Base audio duration in seconds (without speed applied)
  const [audioDuration, setAudioDuration] = useState<number>(10);

  // Persist file URLs at root level - these are the source of truth from Firebase
  const [audioUrl, setAudioUrl] = useFirestoreSettings<string>('audioUrl', '', videoId);
  const [backgroundUrl, setBackgroundUrl] = useFirestoreSettings<string>(
    'backgroundUrl',
    '',
    videoId
  );
  const [voiceoverUrl, setVoiceoverUrl] = useFirestoreSettings<string>('voiceoverUrl', '', videoId);
  const [captionFileUrl, setCaptionFileUrl] = useFirestoreSettings<string>(
    'captionFileUrl',
    '',
    videoId
  );

  // Temporary local file states (only used during upload, cleared after Firebase URL is set)
  const [uploadingAudio, setUploadingAudio] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState<File | null>(null);
  const [uploadingVoiceover, setUploadingVoiceover] = useState<File | null>(null);
  const [uploadingCaption, setUploadingCaption] = useState<File | null>(null);

  // Advanced settings with Firestore
  const [advancedSettings, setAdvancedSettings] = useFirestoreSettings<AdvancedAudioSettings>(
    'advancedSettings',
    {
      speed: 0.8,
      reverb: 50,
      pitch: 0,
      bassBoost: 0,
      volume: 100,
      cropStart: 0,
      cropEnd: 10,
      selectedPreset: '',
      location: 'none',
      voiceoverDelay: 0,
      backgroundDuringVO: 30,
      voiceoverVolume: 100,
      overlayText: '',
      textOverlayDarkness: 60,
      textDelaySeconds: 5,
      textFont: 'Playfair Display',
      loopCount: 1,
      loopCrossfade: 2,
    },
    videoId
  );
  const [showUploadDrawer, setShowUploadDrawer] = useState(false);
  const [showPreviewSettings, setShowPreviewSettings] = useState(false);
  const [openRenderTrigger, setOpenRenderTrigger] = useState(0);
  // Captions state
  const [captionsEnabled, setCaptionsEnabled] = useFirestoreSettings<boolean>(
    'captionsEnabled',
    false,
    videoId
  );
  const [captionData, setCaptionData] = useFirestoreSettings<any | null>(
    'captionData',
    null,
    videoId
  );
  const [useCaptionAnimation, setUseCaptionAnimation] = useFirestoreSettings<boolean>(
    'useCaptionAnimation',
    true,
    videoId
  );
  const [captionOverlayDarkness, setCaptionOverlayDarkness] = useFirestoreSettings<number>(
    'captionOverlayDarkness',
    60,
    videoId
  );
  const [captionOpacity, setCaptionOpacity] = useFirestoreSettings<number>(
    'captionOpacity',
    100,
    videoId
  );
  const [aspectRatio, setAspectRatio] = useFirestoreSettings<'landscape' | 'portrait'>(
    'aspectRatio',
    'landscape',
    videoId
  );
  const [captionStyle, setCaptionStyle] = useState({
    fontSize: 72,
    fontFamily: 'Playfair Display',
    position: 'center' as const,
    color: '#F2F2EF',
  });
  const [useTtsAudioForPreview, setUseTtsAudioForPreview] = useState(false);

  const handleAudioDownload = async () => {
    if (!processedPreviewAudioUrl) return;

    try {
      const response = await fetch(processedPreviewAudioUrl);
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
    }
  };

  // Video settings with Firestore
  const [videoSettings, setVideoSettings] = useFirestoreSettings<VideoSettings>(
    'videoSettings',
    {
      filename: `slowed-reverb-${Date.now()}`,
      overlayEffect: 'none',
      transitionColor: '#525252',
      showCircularTransition: true,
    },
    videoId
  );

  // Slideshow settings with Firestore
  const [slideshowSettings, setSlideshowSettings] = useFirestoreSettings<SlideshowSettings>(
    'slideshowSettings',
    DEFAULT_SLIDESHOW_SETTINGS,
    videoId
  );

  // Slideshow manager modal state
  const [showSlideshowManager, setShowSlideshowManager] = useState(false);

  // Preview state
  const [previewSpeed, setPreviewSpeed] = useState(0.8);
  const [previewReverb, setPreviewReverb] = useState(50);
  const [previewAdvancedSettings, setPreviewAdvancedSettings] = useState<AdvancedAudioSettings>({
    speed: 0.8,
    reverb: 50,
    pitch: 0,
    bassBoost: 0,
    volume: 100,
    cropStart: 0,
    cropEnd: 10,
    selectedPreset: '',
    location: 'none',
    voiceoverDelay: 0,
    backgroundDuringVO: 30,
    voiceoverVolume: 100,
    overlayText: '',
    textOverlayDarkness: 60,
    textDelaySeconds: 5,
    textFont: 'Playfair Display',
    loopCount: 1,
    loopCrossfade: 2,
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [previewGenerated, setPreviewGenerated] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [processedPreviewAudioUrl, setProcessedPreviewAudioUrl] = useState<string | null>(null);
  const [croppedDuration, setCroppedDuration] = useState<number>(10);
  const [voiceoverDuration, setVoiceoverDuration] = useState<number>(0);
  const [playerKey, setPlayerKey] = useState(0);
  const [isRendering, setIsRendering] = useState(false);
  const [debugMarkers, setDebugMarkers] = useState<{
    fadeDownStartSec: number;
    fadeDownEndSec: number;
    fadeUpStartSec: number;
    fadeUpEndSec: number;
  } | null>(null);

  const handleRenderStart = () => {
    setIsRendering(true);
    setPlayerKey((prev) => prev + 1);
  };

  const handleRenderEnd = () => {
    setTimeout(() => {
      setIsRendering(false);
    }, 500);
  };

  // Track if settings have changed
  useEffect(() => {
    const settingsChanged =
      speed !== previewSpeed ||
      reverb !== previewReverb ||
      advancedSettings.pitch !== previewAdvancedSettings.pitch ||
      advancedSettings.bassBoost !== previewAdvancedSettings.bassBoost ||
      advancedSettings.volume !== previewAdvancedSettings.volume ||
      advancedSettings.cropStart !== previewAdvancedSettings.cropStart ||
      advancedSettings.cropEnd !== previewAdvancedSettings.cropEnd ||
      advancedSettings.location !== previewAdvancedSettings.location ||
      advancedSettings.voiceoverDelay !== previewAdvancedSettings.voiceoverDelay ||
      advancedSettings.backgroundDuringVO !== previewAdvancedSettings.backgroundDuringVO ||
      advancedSettings.voiceoverVolume !== previewAdvancedSettings.voiceoverVolume ||
      advancedSettings.loopCount !== previewAdvancedSettings.loopCount ||
      advancedSettings.loopCrossfade !== previewAdvancedSettings.loopCrossfade;

    setHasChanges(settingsChanged);
  }, [
    speed,
    reverb,
    advancedSettings.pitch,
    advancedSettings.bassBoost,
    advancedSettings.volume,
    advancedSettings.cropStart,
    advancedSettings.cropEnd,
    advancedSettings.location,
    advancedSettings.voiceoverDelay,
    advancedSettings.backgroundDuringVO,
    advancedSettings.voiceoverVolume,
    advancedSettings.loopCount,
    advancedSettings.loopCrossfade,
    previewSpeed,
    previewReverb,
    previewAdvancedSettings.pitch,
    previewAdvancedSettings.bassBoost,
    previewAdvancedSettings.volume,
    previewAdvancedSettings.cropStart,
    previewAdvancedSettings.cropEnd,
    previewAdvancedSettings.location,
    previewAdvancedSettings.voiceoverDelay,
    previewAdvancedSettings.backgroundDuringVO,
    previewAdvancedSettings.voiceoverVolume,
    previewAdvancedSettings.loopCount,
    previewAdvancedSettings.loopCrossfade,
  ]);

  const generatePreview = async () => {
    const audioSource = audioUrl || (uploadingAudio ? URL.createObjectURL(uploadingAudio) : null);
    if (!audioSource) return;

    setIsProcessingAudio(true);
    setPreviewSpeed(speed);
    setPreviewReverb(reverb);
    setPreviewAdvancedSettings(advancedSettings);
    setHasChanges(false);

    try {
      const audioContext = new AudioContext();
      const audioResponse = await fetch(audioSource);
      const audioArrayBuffer = await audioResponse.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(audioArrayBuffer);

      // Update audio duration from the actual file
      const actualDuration = audioBuffer.duration;
      setAudioDuration(actualDuration);

      // Update cropEnd if it's still at the default value (10 seconds)
      const effectiveCropEnd = advancedSettings.cropEnd === 10 || advancedSettings.cropEnd > actualDuration 
        ? actualDuration 
        : advancedSettings.cropEnd;
      
      if (advancedSettings.cropEnd === 10 || advancedSettings.cropEnd > actualDuration) {
        setAdvancedSettings((prev) => ({ ...prev, cropEnd: actualDuration }));
      }

      let voiceoverBuffer: AudioBuffer | null = null;
      const voiceoverSource =
        voiceoverUrl || (uploadingVoiceover ? URL.createObjectURL(uploadingVoiceover) : null);
      if (voiceoverSource) {
        try {
          const voiceoverResponse = await fetch(voiceoverSource);
          const voiceoverArrayBuffer = await voiceoverResponse.arrayBuffer();
          voiceoverBuffer = await audioContext.decodeAudioData(voiceoverArrayBuffer);
          const voiceoverDurationSec = voiceoverBuffer.length / voiceoverBuffer.sampleRate;
          setVoiceoverDuration(voiceoverDurationSec);
        } catch (error) {
          console.error('Error loading voiceover:', error);
        }
      }

      // Calculate estimated duration early for preview - use effectiveCropEnd instead of state
      const cropStartSec = advancedSettings.cropStart;
      const cropEndSec = effectiveCropEnd;
      const croppedDurationEstimate = (cropEndSec - cropStartSec) / speed;
      const estimatedVoiceoverDelay = advancedSettings.voiceoverDelay || 0;
      let estimatedTotalDuration = croppedDurationEstimate;
      
      if (voiceoverBuffer) {
        const voiceoverDurationSec = voiceoverBuffer.length / voiceoverBuffer.sampleRate;
        const voiceoverEndSec = estimatedVoiceoverDelay + voiceoverDurationSec;
        estimatedTotalDuration = Math.max(estimatedTotalDuration, voiceoverEndSec);
      }
      
      // Set the estimated duration immediately so preview player uses correct length
      setCroppedDuration(estimatedTotalDuration);

      const cropStartSample = Math.floor(advancedSettings.cropStart * audioBuffer.sampleRate);
      const cropEndSample = Math.floor(advancedSettings.cropEnd * audioBuffer.sampleRate);
      const croppedLength = Math.max(0, cropEndSample - cropStartSample);

      const croppedBuffer = audioContext.createBuffer(
        audioBuffer.numberOfChannels,
        croppedLength,
        audioBuffer.sampleRate
      );

      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const sourceData = audioBuffer.getChannelData(channel);
        const targetData = croppedBuffer.getChannelData(channel);
        for (let i = 0; i < croppedLength; i++) {
          targetData[i] = sourceData[cropStartSample + i] ?? 0;
        }
      }

      const bgDurationSec = croppedBuffer.length / croppedBuffer.sampleRate / speed;
      let totalDurationSec = bgDurationSec;
      if (voiceoverBuffer) {
        const voiceoverDurationSec = voiceoverBuffer.length / voiceoverBuffer.sampleRate;
        const voiceoverEndSec = estimatedVoiceoverDelay + voiceoverDurationSec;
        totalDurationSec = Math.max(totalDurationSec, voiceoverEndSec);
      }

      const totalLengthSamples = Math.ceil(totalDurationSec * croppedBuffer.sampleRate);
      const offlineContext = new OfflineAudioContext(
        croppedBuffer.numberOfChannels,
        totalLengthSamples,
        croppedBuffer.sampleRate
      );

      const source = offlineContext.createBufferSource();
      source.buffer = croppedBuffer;
      source.playbackRate.value = speed;

      const useImpulseResponse = advancedSettings.location && advancedSettings.location !== 'none';
      let dryGain: GainNode | null = null;
      let wetGain: GainNode | null = null;

      if (reverb > 0 || useImpulseResponse) {
        const convolver = offlineContext.createConvolver();

        if (useImpulseResponse) {
          try {
            const irConfig = getImpulseResponse(advancedSettings.location || 'none');
            if (!irConfig || !irConfig.file) throw new Error('No impulse response file');
            const irResponse = await fetch(irConfig.file);
            const irArrayBuffer = await irResponse.arrayBuffer();
            const irAudioBuffer = await offlineContext.decodeAudioData(irArrayBuffer);
            convolver.buffer = irAudioBuffer;
          } catch (error) {
            const impulseLength = offlineContext.sampleRate * 2;
            const impulse = offlineContext.createBuffer(
              2,
              impulseLength,
              offlineContext.sampleRate
            );
            for (let channel = 0; channel < 2; channel++) {
              const channelData = impulse.getChannelData(channel);
              for (let i = 0; i < impulseLength; i++) {
                channelData[i] =
                  (Math.random() * 2 - 1) * Math.exp(-i / (impulseLength * (reverb / 100)));
              }
            }
            convolver.buffer = impulse;
          }
        } else {
          const impulseLength = offlineContext.sampleRate * 2;
          const impulse = offlineContext.createBuffer(2, impulseLength, offlineContext.sampleRate);
          for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < impulseLength; i++) {
              channelData[i] =
                (Math.random() * 2 - 1) * Math.exp(-i / (impulseLength * (reverb / 100)));
            }
          }
          convolver.buffer = impulse;
        }

        dryGain = offlineContext.createGain();
        wetGain = offlineContext.createGain();
        const mixAmount = useImpulseResponse ? reverb / 100 : reverb / 200;
        dryGain.gain.value = 1 - mixAmount;
        wetGain.gain.value = mixAmount;
        source.connect(dryGain);
        source.connect(convolver);
        convolver.connect(wetGain);
        dryGain.connect(offlineContext.destination);
        wetGain.connect(offlineContext.destination);
      } else {
        source.connect(offlineContext.destination);
      }

      source.start();

      if (voiceoverBuffer) {
        const voiceoverSourceNode = offlineContext.createBufferSource();
        voiceoverSourceNode.buffer = voiceoverBuffer;
        const backgroundGain = offlineContext.createGain();
        const finalBackgroundGain = offlineContext.createGain();
        const voiceoverGain = offlineContext.createGain();

        if (reverb > 0 || useImpulseResponse) {
          if (dryGain && wetGain) {
            dryGain.disconnect();
            wetGain.disconnect();
            dryGain.connect(backgroundGain);
            wetGain.connect(backgroundGain);
          }
          backgroundGain.connect(finalBackgroundGain);
          finalBackgroundGain.connect(offlineContext.destination);
        } else {
          source.disconnect();
          source.connect(backgroundGain);
          backgroundGain.connect(finalBackgroundGain);
          finalBackgroundGain.connect(offlineContext.destination);
        }

        voiceoverSourceNode.connect(voiceoverGain);
        voiceoverGain.connect(offlineContext.destination);

        const sampleRate = voiceoverBuffer.sampleRate;
        const voiceoverData = voiceoverBuffer.getChannelData(0);
        const analysisWindowSec = 0.05;
        const stepSec = 0.05;
        const lowThreshold = 0.015;
        const windowSize = Math.max(1, Math.floor(sampleRate * analysisWindowSec));
        const stepSize = Math.max(1, Math.floor(sampleRate * stepSec));
        const envelope: number[] = [];
        for (let i = 0; i < voiceoverData.length; i += stepSize) {
          const end = Math.min(i + windowSize, voiceoverData.length);
          let sumSq = 0;
          for (let j = i; j < end; j++) sumSq += voiceoverData[j] * voiceoverData[j];
          const rms = Math.sqrt(sumSq / (end - i || 1));
          envelope.push(rms);
        }

        let lastNonSilentIndex = 0;
        for (let k = 0; k < envelope.length; k++)
          if (envelope[k] > lowThreshold) lastNonSilentIndex = k;

        const startTime = estimatedVoiceoverDelay;
        const duckVol = (advancedSettings.backgroundDuringVO ?? 30) / 100;
        const fadeDownSec = 0.8;
        const fadeUpSec = 1.2;

        backgroundGain.gain.cancelScheduledValues(0);
        backgroundGain.gain.setValueAtTime(1.0, 0);
        backgroundGain.gain.setValueAtTime(1.0, startTime);
        if (duckVol === 0) {
          backgroundGain.gain.linearRampToValueAtTime(0, startTime + fadeDownSec);
        } else {
          backgroundGain.gain.exponentialRampToValueAtTime(
            Math.max(0.001, duckVol),
            startTime + fadeDownSec
          );
        }
        backgroundGain.gain.setValueAtTime(
          duckVol === 0 ? 0 : Math.max(0.001, duckVol),
          startTime + fadeDownSec + 0.0001
        );

        const silenceWindowSec = 6.0;
        const requiredSteps = Math.max(1, Math.ceil(silenceWindowSec / stepSec));
        const afterSpeechStart = Math.min(lastNonSilentIndex + 1, envelope.length - 1);

        let silenceStartIndex = -1;
        for (let k = afterSpeechStart; k <= envelope.length - requiredSteps; k++) {
          let allSilent = true;
          for (let j = 0; j < requiredSteps; j++) {
            if (envelope[k + j] > lowThreshold) {
              allSilent = false;
              break;
            }
          }
          if (allSilent) {
            silenceStartIndex = k;
            break;
          }
        }
        const silenceEndTime =
          silenceStartIndex >= 0
            ? startTime + silenceStartIndex * stepSec + silenceWindowSec
            : startTime + envelope.length * stepSec;

        backgroundGain.gain.setValueAtTime(
          duckVol === 0 ? 0 : Math.max(0.001, duckVol),
          silenceEndTime
        );
        if (duckVol === 0) {
          backgroundGain.gain.linearRampToValueAtTime(1.0, silenceEndTime + fadeUpSec);
        } else {
          backgroundGain.gain.exponentialRampToValueAtTime(1.0, silenceEndTime + fadeUpSec);
        }

        // Fade out background music in the final seconds of the total duration.
        // Use a separate finalBackgroundGain so we don't break the ducking envelope.
        const fadeOutDuration = Math.min(5, totalDurationSec);
        const fadeOutStart = Math.max(0, totalDurationSec - fadeOutDuration);
        finalBackgroundGain.gain.cancelScheduledValues(0);
        finalBackgroundGain.gain.setValueAtTime(1.0, 0);
        finalBackgroundGain.gain.setValueAtTime(1.0, fadeOutStart);
        finalBackgroundGain.gain.linearRampToValueAtTime(0.0001, totalDurationSec);

        setDebugMarkers({
          fadeDownStartSec: startTime,
          fadeDownEndSec: startTime + fadeDownSec,
          fadeUpStartSec: silenceEndTime,
          fadeUpEndSec: silenceEndTime + fadeUpSec,
        });

        voiceoverSourceNode.start(startTime);
        voiceoverGain.gain.value = Math.max(0, (advancedSettings.voiceoverVolume ?? 100) / 100);
      } else {
        setDebugMarkers(null);
      }

      const renderedBuffer = await offlineContext.startRendering();

      const loopCount = advancedSettings.loopCount ?? 1;
      const loopCrossfade = advancedSettings.loopCrossfade ?? 2;
      const finalBuffer =
        loopCount > 1
          ? await createLoopedAudio(renderedBuffer, loopCount, loopCrossfade)
          : renderedBuffer;

      const wav = audioBufferToWav(finalBuffer);
      const blob = new Blob([wav], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);

      if (processedPreviewAudioUrl) URL.revokeObjectURL(processedPreviewAudioUrl);

      setProcessedPreviewAudioUrl(url);
      setPreviewGenerated(true);
      const finalDurationInSeconds = finalBuffer.length / finalBuffer.sampleRate;
      setCroppedDuration(finalDurationInSeconds);
    } catch (error) {
      console.error('Error processing audio:', error);
    } finally {
      setIsProcessingAudio(false);
    }
  };

  async function createLoopedAudio(
    buffer: AudioBuffer,
    loopCount: number,
    crossfadeSec: number = 2
  ): Promise<AudioBuffer> {
    if (loopCount <= 1) return buffer;

    const sampleRate = buffer.sampleRate;
    const numChannels = buffer.numberOfChannels;
    const crossfadeSamples = Math.floor(crossfadeSec * sampleRate);
    const loopLengthSamples = buffer.length;
    const totalSamples = loopLengthSamples * loopCount - crossfadeSamples * (loopCount - 1);
    const offlineCtx = new OfflineAudioContext(numChannels, totalSamples, sampleRate);

    for (let i = 0; i < loopCount; i++) {
      const source = offlineCtx.createBufferSource();
      source.buffer = buffer;
      const gainNode = offlineCtx.createGain();
      source.connect(gainNode);
      gainNode.connect(offlineCtx.destination);
      const startTime = (i * (loopLengthSamples - crossfadeSamples)) / sampleRate;
      if (i > 0) {
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(1, startTime + crossfadeSec);
      } else {
        gainNode.gain.setValueAtTime(1, 0);
      }
      if (i < loopCount - 1) {
        const fadeOutStart = startTime + loopLengthSamples / sampleRate - crossfadeSec;
        gainNode.gain.setValueAtTime(1, fadeOutStart);
        gainNode.gain.linearRampToValueAtTime(0, fadeOutStart + crossfadeSec);
      }
      source.start(startTime);
    }

    return await offlineCtx.startRendering();
  }

  function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
    const length = buffer.length * buffer.numberOfChannels * 2 + 44;
    const arrayBuffer = new ArrayBuffer(length);
    const view = new DataView(arrayBuffer);
    let offset = 0;
    let pos = 0;
    const setUint16 = (data: number) => {
      view.setUint16(pos, data, true);
      pos += 2;
    };
    const setUint32 = (data: number) => {
      view.setUint32(pos, data, true);
      pos += 4;
    };
    setUint32(0x46464952);
    setUint32(length - 8);
    setUint32(0x45564157);
    setUint32(0x20746d66);
    setUint32(16);
    setUint16(1);
    setUint16(buffer.numberOfChannels);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * buffer.numberOfChannels);
    setUint16(buffer.numberOfChannels * 2);
    setUint16(16);
    setUint32(0x61746164);
    setUint32(length - pos - 4);
    const channels: Float32Array[] = [];
    for (let i = 0; i < buffer.numberOfChannels; i++) channels.push(buffer.getChannelData(i));
    while (pos < length) {
      for (let i = 0; i < buffer.numberOfChannels; i++) {
        const sample = Math.max(-1, Math.min(1, channels[i][offset]));
        view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
        pos += 2;
      }
      offset++;
    }
    return arrayBuffer;
  }

  const handleAdvancedSettingsChange = (settings: AdvancedAudioSettings) => {
    setAdvancedSettings(settings);
    setSpeed(settings.speed);
    setReverb(settings.reverb);
  };

  const resetSettings = () => {
    setAdvancedSettings({
      speed: 0.8,
      reverb: 50,
      pitch: 0,
      bassBoost: 0,
      volume: 100,
      cropStart: 0,
      cropEnd: audioDuration,
      selectedPreset: '',
      location: 'none',
      backgroundDuringVO: 30,
      voiceoverDelay: 0,
      voiceoverVolume: 100,
      overlayText: '',
      textOverlayDarkness: 60,
      textDelaySeconds: 5,
      loopCount: 1,
      loopCrossfade: 2,
    });
  };

  return (
    <div className="relative h-screen">
      {/* Preview-Focused Layout */}
      <div className="flex h-full flex-col">
        {/* Top Control Bar - Fixed */}
        <div className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between gap-3 border-b border-gray-800 bg-gray-950 px-4 py-3 shadow-lg">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/admin/video-editor')}
              className="flex items-center justify-center rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
              aria-label="Back to all videos"
            >
              <IoArrowBack className="h-5 w-5" />
            </button>
            <div className="h-6 w-px bg-gray-800" />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="flat"
                className="border-gray-800 bg-gray-900 text-white hover:bg-gray-800"
                onClick={() => setShowUploadDrawer(true)}
                startContent={<Upload className="h-4 w-4" />}
              >
                Media
              </Button>
              <Button
                size="sm"
                variant="flat"
                className="border-gray-800 bg-gray-900 text-white hover:bg-gray-800"
                onClick={() => setShowPreviewSettings(true)}
                startContent={<SettingsIcon className="h-4 w-4" />}
              >
                Preview Settings
              </Button>
            </div>
            <div className="h-6 w-px bg-gray-800" />
            {/* Aspect Ratio Toggle */}
            <ButtonGroup size="sm">
              <Button
                className={
                  aspectRatio === 'landscape'
                    ? 'bg-purple-600 text-white'
                    : 'border-gray-800 bg-gray-900 text-gray-400 hover:bg-gray-800'
                }
                onClick={() => setAspectRatio('landscape')}
              >
                16:9
              </Button>
              <Button
                className={
                  aspectRatio === 'portrait'
                    ? 'bg-purple-600 text-white'
                    : 'border-gray-800 bg-gray-900 text-gray-400 hover:bg-gray-800'
                }
                onClick={() => setAspectRatio('portrait')}
              >
                9:16
              </Button>
            </ButtonGroup>
          </div>

          <div className="flex gap-2">
            {(audioUrl || uploadingAudio) && (
              <Button
                size="sm"
                className="bg-purple-600 font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
                onClick={generatePreview}
                disabled={isProcessingAudio}
                startContent={<Play className="h-4 w-4" />}
                isLoading={isProcessingAudio}
              >
                {isProcessingAudio
                  ? 'Processing...'
                  : hasChanges
                    ? 'Update Preview'
                    : 'Generate Preview'}
              </Button>
            )}
            <Popover placement="bottom-end">
              <PopoverTrigger>
                <Button
                  size="sm"
                  variant="flat"
                  className="border-green-600/30 bg-green-600/10 text-green-400 hover:bg-green-600/20"
                  startContent={<Download className="h-4 w-4" />}
                  isDisabled={!processedPreviewAudioUrl}
                >
                  Download
                </Button>
              </PopoverTrigger>
              <PopoverContent className="bg-gray-900 border border-gray-800">
                <div className="px-1 py-2">
                  <div className="space-y-2">
                    <Button
                      size="sm"
                      className="w-full justify-start bg-purple-600 text-white hover:bg-purple-700"
                      startContent={<VideoIcon className="h-4 w-4" />}
                      onClick={() => setOpenRenderTrigger((prev) => prev + 1)}
                    >
                      Render Video
                    </Button>
                    <Button
                      size="sm"
                      variant="flat"
                      className="w-full justify-start border-gray-700 bg-gray-800 text-white hover:bg-gray-700"
                      startContent={<Download className="h-4 w-4" />}
                      onClick={handleAudioDownload}
                    >
                      Download Audio Only
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Full-Size Preview with proper aspect ratio */}
        <div className="bg-black px-4 pb-12 pt-20">
          <div className="mx-auto w-full max-w-4xl">
            <VideoPreview
              key={playerKey}
              imageUrl={backgroundUrl && backgroundUrl.startsWith('http') ? backgroundUrl : null}
              audioUrl={
                useTtsAudioForPreview && voiceoverUrl
                  ? voiceoverUrl
                  : processedPreviewAudioUrl ||
                    (audioUrl && audioUrl.startsWith('http') ? audioUrl : null)
              }
              audioDuration={
                useTtsAudioForPreview && voiceoverUrl
                  ? voiceoverDuration || croppedDuration / previewSpeed
                  : croppedDuration / previewSpeed
              }
              hasChanges={hasChanges}
              showPreview={!isRendering}
              isProcessing={isProcessingAudio}
              debugMarkers={debugMarkers}
              slideshowSettings={slideshowSettings}
              // Shared text settings
              textFont={advancedSettings.textFont ?? 'Playfair Display'}
              textFontSize={advancedSettings.textFontSize ?? 96}
              textOpacity={advancedSettings.textOpacity ?? 100}
              textOverlayDarkness={advancedSettings.textOverlayDarkness ?? 60}
              // Intro
              introText={advancedSettings.introText ?? ''}
              introDelaySeconds={advancedSettings.introDelaySeconds ?? 5}
              introPosition={advancedSettings.introPosition ?? 'center'}
              // Outro
              outroText={advancedSettings.outroText ?? ''}
              outroPosition={advancedSettings.outroPosition ?? 'center'}
              outroStartBeforeEnd={advancedSettings.outroStartBeforeEnd ?? 6}
              transitionColor={videoSettings.transitionColor ?? '#525252'}
              showCircularTransition={videoSettings.showCircularTransition ?? true}
              showCircleTransitionStart={videoSettings.showCircleTransitionStart ?? true}
              showCircleTransitionEnd={videoSettings.showCircleTransitionEnd ?? true}
              visualizerType={advancedSettings.visualizerType ?? 'default'}
              videoTitle={videoSettings.videoTitle ?? ''}
              videoDescription={videoSettings.videoDescription ?? ''}
              onVideoTitleChange={(title) =>
                setVideoSettings({ ...videoSettings, videoTitle: title })
              }
              onVideoDescriptionChange={(description) =>
                setVideoSettings({ ...videoSettings, videoDescription: description })
              }
              // Captions props
              showCaptions={captionsEnabled}
              captions={captionData || undefined}
              captionStyle={captionStyle as any}
              useCaptionAnimation={useCaptionAnimation}
              captionAnimationSpeed={advancedSettings.captionAnimationSpeed ?? 'slow'}
              captionOverlayDarkness={captionOverlayDarkness}
              captionOpacity={captionOpacity}
              aspectRatio={aspectRatio}
              captionDelaySeconds={advancedSettings.captionDelaySeconds ?? 0}
            />
          </div>
        </div>

        {/* Media Upload Drawer */}
        <Drawer isOpen={showUploadDrawer} onClose={() => setShowUploadDrawer(false)} size="lg">
          <DrawerContent>
            <DrawerHeader className="border-b border-gray-800 bg-gray-950 text-white">
              <h3 className="text-lg font-semibold">Media Upload</h3>
            </DrawerHeader>
            <DrawerBody className="bg-gray-900 p-6">
              <FileUpload
                onAudioUpload={(file) => setUploadingAudio(file)}
                onVoiceoverUpload={(file) => setUploadingVoiceover(file)}
                onImageUpload={(file) => setUploadingImage(file)}
                onAudioUrlReady={(url) => {
                  setAudioUrl(url);
                  setUploadingAudio(null);
                }}
                onVoiceoverUrlReady={(url) => {
                  setVoiceoverUrl(url);
                  setUploadingVoiceover(null);
                }}
                onImageUrlReady={(url) => {
                  setBackgroundUrl(url);
                  setUploadingImage(null);
                }}
                audioFile={uploadingAudio}
                voiceoverFile={uploadingVoiceover}
                imageFile={uploadingImage}
                existingAudioUrl={audioUrl || undefined}
                existingVoiceoverUrl={voiceoverUrl || undefined}
                existingImageUrl={backgroundUrl || undefined}
              />
            </DrawerBody>
          </DrawerContent>
        </Drawer>

        {/* Preview Settings Drawer - Lazy loaded for performance */}
        <Suspense fallback={null}>
          <PreviewSettingsDrawer
            isOpen={showPreviewSettings}
            onClose={() => setShowPreviewSettings(false)}
            advancedSettings={advancedSettings}
            onAdvancedSettingsChange={handleAdvancedSettingsChange}
            videoSettings={videoSettings}
            onVideoSettingsChange={setVideoSettings}
            onReset={resetSettings}
            slideshowSettings={slideshowSettings}
            onSlideshowSettingsChange={setSlideshowSettings}
            onOpenSlideshowManager={() => setShowSlideshowManager(true)}
            captionsEnabled={captionsEnabled}
            onCaptionsEnabledChange={setCaptionsEnabled}
            captionData={captionData}
            onCaptionDataChange={setCaptionData}
            captionStyle={captionStyle as any}
            onCaptionStyleChange={setCaptionStyle as any}
            useCaptionAnimation={useCaptionAnimation}
            onUseCaptionAnimationChange={setUseCaptionAnimation}
            onUseTtsAsAudio={(use) => setUseTtsAudioForPreview(use)}
            captionOverlayDarkness={captionOverlayDarkness}
            onCaptionOverlayDarknessChange={setCaptionOverlayDarkness}
            captionOpacity={captionOpacity}
            onCaptionOpacityChange={setCaptionOpacity}
            onCaptionFileUpload={(file) => setUploadingCaption(file)}
            onCaptionFileUrlReady={(url) => {
              setCaptionFileUrl(url);
              setUploadingCaption(null);
            }}
            uploadingCaptionFile={uploadingCaption}
            existingCaptionFileUrl={captionFileUrl || undefined}
          />
        </Suspense>

        {/* Slideshow Manager Modal - Lazy loaded */}
        {showSlideshowManager && (
          <Suspense fallback={null}>
            <SlideshowManagerModal
              isOpen={showSlideshowManager}
              onClose={() => setShowSlideshowManager(false)}
              images={slideshowSettings.images}
              onChange={(images) => setSlideshowSettings({ ...slideshowSettings, images })}
            />
          </Suspense>
        )}

        {/* Hidden RenderButton - triggers modal when openRenderTrigger changes */}
        <div className="hidden">
          <RenderButton
            imageUrl={backgroundUrl}
            processedAudioUrl={processedPreviewAudioUrl}
            cloudImageUrl={backgroundUrl}
            cloudAudioUrl={audioUrl}
            duration={croppedDuration / previewSpeed}
            disabled={!processedPreviewAudioUrl}
            videoSettings={videoSettings}
            slideshowSettings={slideshowSettings}
            onRenderStart={handleRenderStart}
            onRenderEnd={handleRenderEnd}
            // Shared text settings
            textFont={advancedSettings.textFont ?? 'Playfair Display'}
            textFontSize={advancedSettings.textFontSize ?? 96}
            textOpacity={advancedSettings.textOpacity ?? 100}
            textOverlayDarkness={advancedSettings.textOverlayDarkness ?? 60}
            // Intro
            introText={advancedSettings.introText ?? ''}
            introDelaySeconds={advancedSettings.introDelaySeconds ?? 5}
            introPosition={advancedSettings.introPosition ?? 'center'}
            // Outro
            outroText={advancedSettings.outroText ?? ''}
            outroPosition={advancedSettings.outroPosition ?? 'center'}
            outroStartBeforeEnd={advancedSettings.outroStartBeforeEnd ?? 6}
            autoOpenModal={openRenderTrigger > 0}
            visualizerType={advancedSettings.visualizerType ?? 'default'}
            showCaptions={captionsEnabled}
            captions={captionData || undefined}
            captionStyle={captionStyle}
            useCaptionAnimation={useCaptionAnimation}
            captionAnimationSpeed={advancedSettings.captionAnimationSpeed ?? 'slow'}
            captionOverlayDarkness={captionOverlayDarkness}
            captionOpacity={captionOpacity}
            aspectRatio={aspectRatio}
            captionDelaySeconds={advancedSettings.captionDelaySeconds ?? 0}
          />
        </div>
      </div>
    </div>
  );
}
