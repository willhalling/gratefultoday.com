'use client';

// This file now only exports types - the modal UI has been moved to Preview Settings Drawer in SlowedReverbGenerator.tsx

export interface AdvancedAudioSettings {
  speed: number;
  reverb: number;
  pitch: number;
  bassBoost: number;
  volume: number;
  cropStart: number;
  cropEnd: number;
  selectedPreset?: string;
  location?: string; // IR location key
  voiceoverDelay?: number; // Delay before voiceover starts in seconds
  backgroundDuringVO?: number; // Background volume percentage while voiceover is active
  voiceoverVolume?: number; // Voiceover volume percentage
  // Shared text settings (used by both intro and outro)
  textFont?: 'Playfair Display' | 'Inter'; // Font for text overlays (default: Playfair Display)
  textFontSize?: number; // Font size for text overlays (20-150, default 96)
  textOpacity?: number; // Text opacity (0-100, default 100)
  textOverlayDarkness?: number; // Dark overlay opacity for text readability (0-100)
  // Intro text settings
  introText?: string; // Intro text content
  introDelaySeconds?: number; // Delay before intro appears in seconds (0-10)
  introPosition?:
    | 'top-left'
    | 'top-center'
    | 'top-right'
    | 'center-left'
    | 'center'
    | 'center-right'
    | 'bottom-left'
    | 'bottom-center'
    | 'bottom-right'; // Intro position (default: center)
  // Outro text settings
  outroPosition?:
    | 'top-left'
    | 'top-center'
    | 'top-right'
    | 'center-left'
    | 'center'
    | 'center-right'
    | 'bottom-left'
    | 'bottom-center'
    | 'bottom-right'; // Outro position (default: center)
  outroText?: string; // Outro text content
  outroStartBeforeEnd?: number; // Start outro X seconds before end (default: 6)
  captionDelaySeconds?: number; // Delay before captions start in seconds (0-10)
  captionAnimationSpeed?: 'slow' | 'normal' | 'fast'; // Caption animation speed (default: slow)
  loopCount?: number; // Number of times to loop the audio (1-50, default 1)
  loopCrossfade?: number; // Crossfade duration in seconds between loops (0.5-5, default 2)
  visualizerType?: string; // Audio visualizer type (default, bars, wave, hills, radial)
}

export interface VideoSettings {
  filename: string;
  overlayEffect: string;
  transitionColor?: string; // Hex color for circular transitions (default: #525252)
  showCircularTransition?: boolean; // Whether to show circular transitions (default: true)
  videoTitle?: string; // Title for the video
  videoDescription?: string; // YouTube/video description
}
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Slider,
  Select,
  SelectItem,
  Tabs,
  Tab,
  Input,
  Textarea,
} from '@heroui/react';
import { Settings } from 'lucide-react';
import { IMPULSE_RESPONSES } from '@/constants/impulse-responses';
import { OVERLAY_OPTIONS } from '@/constants/overlays';
export type { OverlayConfig } from '@/constants/overlays';

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

export interface AdvancedAudioSettings {
  speed: number;
  reverb: number;
  pitch: number;
  bassBoost: number;
  volume: number;
  cropStart: number;
  cropEnd: number;
  selectedPreset?: string;
  location?: string; // IR location key
  voiceoverDelay?: number; // Delay before voiceover starts in seconds
  backgroundDuringVO?: number; // Background volume percentage while voiceover is active
  voiceoverVolume?: number; // Voiceover volume percentage
  overlayText?: string; // Animated overlay text (optional)
  textOverlayDarkness?: number; // Dark overlay opacity for text readability (0-100)
  textDelaySeconds?: number; // Delay before text appears in seconds (0-10)
  textFontSize?: number; // Font size for overlay text (20-150, default 96)
  textOpacity?: number; // Text opacity (0-100, default 100)
  textFont?: 'Playfair Display' | 'Inter'; // Font for overlay text (default: Playfair Display)
  loopCount?: number; // Number of times to loop the audio (1-50, default 1)
  loopCrossfade?: number; // Crossfade duration in seconds between loops (0.5-5, default 2)
  visualizerType?: string; // Audio visualizer type (default, bars, wave, hills, radial)
}

export interface VideoSettings {
  filename: string;
  overlayEffect: string;
  transitionColor?: string; // Hex color for circular transitions (default: #525252)
  showCircularTransition?: boolean; // Whether to show circular transitions (default: true)
  videoTitle?: string; // Title for the video
  videoDescription?: string; // YouTube/video description
}

interface AdvancedSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AdvancedAudioSettings;
  onSettingsChange: (settings: AdvancedAudioSettings) => void;
  videoSettings: VideoSettings;
  onVideoSettingsChange: (settings: VideoSettings) => void;
  audioDuration: number;
}

export function AdvancedSettingsModal({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
  videoSettings,
  onVideoSettingsChange,
  audioDuration,
}: AdvancedSettingsModalProps) {
  const updateSetting = <K extends keyof AdvancedAudioSettings>(
    key: K,
    value: AdvancedAudioSettings[K]
  ) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const updateVideoSetting = <K extends keyof VideoSettings>(key: K, value: VideoSettings[K]) => {
    onVideoSettingsChange({ ...videoSettings, [key]: value });
  };

  const resetSettings = () => {
    onSettingsChange({
      speed: 0.8,
      reverb: 50,
      pitch: 0,
      bassBoost: 0,
      volume: 100,
      cropStart: 0,
      cropEnd: audioDuration,
      selectedPreset: '',
      backgroundDuringVO: settings.backgroundDuringVO ?? 30,
      voiceoverDelay: settings.voiceoverDelay ?? 0,
      voiceoverVolume: settings.voiceoverVolume ?? 100,
      overlayText: '',
      textOverlayDarkness: 60,
      textDelaySeconds: settings.textDelaySeconds ?? 5,
      loopCount: 1,
      loopCrossfade: 2,
    });
  };

  const resetVideoSettings = () => {
    onVideoSettingsChange({
      filename: `slowed-reverb-${Date.now()}`,
      overlayEffect: 'none',
      transitionColor: '#525252',
      showCircularTransition: true,
    });
  };

  const applyPreset = (presetKey: string) => {
    const preset = PRESETS.find((p) => p.key === presetKey);
    if (preset) {
      onSettingsChange({
        ...preset.settings,
        cropStart: settings.cropStart,
        cropEnd: settings.cropEnd,
        selectedPreset: presetKey,
        backgroundDuringVO: settings.backgroundDuringVO ?? 30,
        voiceoverDelay: settings.voiceoverDelay ?? 0,
        voiceoverVolume: settings.voiceoverVolume ?? 100,
        overlayText: settings.overlayText ?? '',
        textOverlayDarkness: settings.textOverlayDarkness ?? 60,
        textDelaySeconds: settings.textDelaySeconds ?? 5,
        loopCount: settings.loopCount ?? 1,
        loopCrossfade: settings.loopCrossfade ?? 2,
      });
    }
  };

  const selectedPreset = PRESETS.find((p) => p.key === settings.selectedPreset);
  const selectedOverlay = OVERLAY_OPTIONS.find((o) => o.key === videoSettings.overlayEffect);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" placement="center" scrollBehavior="inside">
      <ModalContent className="border border-purple-500/20 bg-black/90">
        <ModalHeader className="flex items-center gap-3">
          <Settings className="h-5 w-5 text-purple-400" />
          <span className="text-xl font-semibold text-white">Advanced Settings</span>
        </ModalHeader>
        <ModalBody className="max-h-[70vh] overflow-y-auto pb-6">
          <Tabs
            aria-label="Settings tabs"
            classNames={{
              tabList: 'bg-gray-900 border border-gray-800',
              cursor: 'bg-purple-600',
              tab: 'text-gray-400 data-[hover=true]:text-white data-[selected=true]:!text-white',
              tabContent: 'group-data-[selected=true]:!text-white',
              panel: 'pt-4',
            }}
          >
            <Tab key="audio" title="Audio">
              <div className="space-y-6">
                {/* Presets */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Effect Presets</label>
                  <Select
                    placeholder="Choose a preset..."
                    selectedKeys={
                      settings.selectedPreset ? new Set([settings.selectedPreset]) : new Set()
                    }
                    selectionMode="single"
                    disallowEmptySelection
                    classNames={{
                      trigger:
                        'bg-gray-900 border-gray-700 hover:bg-gray-800 data-[hover=true]:bg-gray-800',
                      value: '!text-gray-300',
                      selectorIcon: 'text-gray-400',
                      listboxWrapper: 'bg-gray-900',
                      popoverContent: 'bg-gray-900 border border-gray-700',
                    }}
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys)[0] as string;
                      if (selected) applyPreset(selected);
                    }}
                    data-hj-allow
                    data-testid="effect-preset-select"
                    aria-label="Effect presets"
                  >
                    {PRESETS.map((preset) => (
                      <SelectItem
                        key={preset.key}
                        classNames={{
                          base: '!text-gray-300 data-[hover=true]:!bg-gray-800 data-[hover=true]:!text-white data-[selectable=true]:focus:!bg-purple-600 data-[selectable=true]:focus:!text-white data-[focus=true]:!bg-purple-600 data-[focus=true]:!text-white',
                          title:
                            '!text-gray-300 data-[hover=true]:!text-white data-[focus=true]:!text-white',
                        }}
                      >
                        {preset.label}
                      </SelectItem>
                    ))}
                  </Select>
                  {selectedPreset && (
                    <p className="text-xs text-gray-400 italic">{selectedPreset.description}</p>
                  )}
                </div>

                {/* Location/Space Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Location / Space</label>
                  <Select
                    selectedKeys={
                      settings.location ? new Set([settings.location]) : new Set(['none'])
                    }
                    selectionMode="single"
                    disallowEmptySelection
                    classNames={{
                      trigger:
                        'bg-gray-900 border-gray-700 hover:bg-gray-800 data-[hover=true]:bg-gray-800',
                      value: '!text-gray-300',
                      selectorIcon: 'text-gray-400',
                      listboxWrapper: 'bg-gray-900',
                      popoverContent: 'bg-gray-900 border border-gray-700',
                    }}
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys)[0] as string;
                      if (selected) updateSetting('location', selected);
                    }}
                    data-hj-allow
                    data-testid="location-select"
                    aria-label="Acoustic location"
                  >
                    {IMPULSE_RESPONSES.map((ir) => (
                      <SelectItem
                        key={ir.key}
                        classNames={{
                          base: '!text-gray-300 data-[hover=true]:!bg-gray-800 data-[hover=true]:!text-white data-[selectable=true]:focus:!bg-purple-600 data-[selectable=true]:focus:!text-white data-[focus=true]:!bg-purple-600 data-[focus=true]:!text-white',
                          title:
                            '!text-gray-300 data-[hover=true]:!text-white data-[focus=true]:!text-white',
                        }}
                      >
                        {ir.label}
                      </SelectItem>
                    ))}
                  </Select>
                  {settings.location && settings.location !== 'none' && (
                    <>
                      <p className="text-xs italic text-gray-400">
                        {IMPULSE_RESPONSES.find((ir) => ir.key === settings.location)?.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        Source:{' '}
                        {IMPULSE_RESPONSES.find((ir) => ir.key === settings.location)?.source}
                      </p>
                    </>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Apply real acoustic spaces using impulse responses
                  </p>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-700 pt-6" />

                {/* Speed */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-300">Speed</label>
                    <span className="text-sm text-purple-400">{settings.speed.toFixed(2)}x</span>
                  </div>
                  <Slider
                    size="sm"
                    step={0.05}
                    minValue={0.25}
                    maxValue={2.0}
                    value={settings.speed}
                    onChange={(value) => updateSetting('speed', value as number)}
                    className="w-full"
                    classNames={{
                      track: 'bg-gray-800',
                      filler: 'bg-purple-600',
                      thumb: 'bg-purple-500',
                    }}
                  />
                </div>

                {/* Reverb */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-300">Reverb</label>
                    <span className="text-sm text-purple-400">{settings.reverb}%</span>
                  </div>
                  <Slider
                    size="sm"
                    step={1}
                    minValue={0}
                    maxValue={100}
                    value={settings.reverb}
                    onChange={(value) => updateSetting('reverb', value as number)}
                    className="w-full"
                    classNames={{
                      track: 'bg-gray-800',
                      filler: 'bg-purple-600',
                      thumb: 'bg-purple-500',
                    }}
                  />
                </div>

                {/* Pitch */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-300">Pitch</label>
                    <span className="text-sm text-purple-400">
                      {settings.pitch > 0 ? '+' : ''}
                      {settings.pitch} semitones
                    </span>
                  </div>
                  <Slider
                    size="sm"
                    step={1}
                    minValue={-12}
                    maxValue={12}
                    value={settings.pitch}
                    onChange={(value) => updateSetting('pitch', value as number)}
                    className="w-full"
                    classNames={{
                      track: 'bg-gray-800',
                      filler: 'bg-purple-600',
                      thumb: 'bg-purple-500',
                    }}
                  />
                </div>

                {/* Bass Boost */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-300">Bass Boost</label>
                    <span className="text-sm text-purple-400">{settings.bassBoost}%</span>
                  </div>
                  <Slider
                    size="sm"
                    step={1}
                    minValue={0}
                    maxValue={100}
                    value={settings.bassBoost}
                    onChange={(value) => updateSetting('bassBoost', value as number)}
                    className="w-full"
                    classNames={{
                      track: 'bg-gray-800',
                      filler: 'bg-purple-600',
                      thumb: 'bg-purple-500',
                    }}
                  />
                </div>

                {/* Volume */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-300">Volume</label>
                    <span className="text-sm text-purple-400">{settings.volume}%</span>
                  </div>
                  <Slider
                    size="sm"
                    step={1}
                    minValue={0}
                    maxValue={200}
                    value={settings.volume}
                    onChange={(value) => updateSetting('volume', value as number)}
                    className="w-full"
                    classNames={{
                      track: 'bg-gray-800',
                      filler: 'bg-purple-600',
                      thumb: 'bg-purple-500',
                    }}
                  />
                </div>

                {/* Loop Count */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-300">Loop Audio</label>
                    <span className="text-sm text-purple-400">{settings.loopCount ?? 1}x</span>
                  </div>
                  <Slider
                    size="sm"
                    step={1}
                    minValue={1}
                    maxValue={50}
                    value={settings.loopCount ?? 1}
                    onChange={(value) => updateSetting('loopCount', value as number)}
                    className="w-full"
                    classNames={{
                      track: 'bg-gray-800',
                      filler: 'bg-purple-600',
                      thumb: 'bg-purple-500',
                    }}
                  />
                  <p className="text-xs text-gray-500">
                    Repeat the audio up to 50 times with seamless crossfade
                  </p>
                </div>

                {/* Loop Crossfade Duration */}
                {(settings.loopCount ?? 1) > 1 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-300">Loop Crossfade</label>
                      <span className="text-sm text-purple-400">
                        {settings.loopCrossfade ?? 2}s
                      </span>
                    </div>
                    <Slider
                      size="sm"
                      step={0.1}
                      minValue={0.5}
                      maxValue={5}
                      value={settings.loopCrossfade ?? 2}
                      onChange={(value) => updateSetting('loopCrossfade', value as number)}
                      className="w-full"
                      classNames={{
                        track: 'bg-gray-800',
                        filler: 'bg-purple-600',
                        thumb: 'bg-purple-500',
                      }}
                    />
                    <p className="text-xs text-gray-500">
                      Fade duration between loops (shorter = quicker transitions)
                    </p>
                  </div>
                )}

                {/* Audio Crop */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Crop Audio</label>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{formatTime(settings.cropStart)}</span>
                    <span>-</span>
                    <span>{formatTime(settings.cropEnd)}</span>
                  </div>
                  <Slider
                    size="sm"
                    step={0.1}
                    minValue={0}
                    maxValue={audioDuration}
                    value={[settings.cropStart, settings.cropEnd]}
                    onChange={(value) => {
                      const [start, end] = value as number[];
                      updateSetting('cropStart', start);
                      updateSetting('cropEnd', end);
                    }}
                    className="w-full"
                    classNames={{
                      track: 'bg-gray-800',
                      filler: 'bg-purple-600',
                      thumb: 'bg-purple-500',
                    }}
                  />
                </div>
              </div>
            </Tab>

            <Tab key="text" title="Text">
              <div className="space-y-6">
                {/* Overlay Text Input */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    Overlay Text
                  </label>
                  <Textarea
                    value={settings.overlayText ?? ''}
                    onChange={(e) => updateSetting('overlayText', e.target.value)}
                    placeholder="Enter text to display (optional)&#10;Use line breaks for multi-line text"
                    minRows={3}
                    classNames={{
                      input: '!bg-gray-900 !text-white placeholder:text-gray-500',
                      inputWrapper:
                        '!bg-gray-900 !border !border-gray-700 hover:!border-purple-600/50 data-[hover=true]:!border-purple-600/50',
                      innerWrapper: '!bg-gray-900',
                      base: 'bg-gray-900',
                    }}
                    data-hj-allow
                    data-testid="overlay-text-input"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Displayed top-center above the visualizer with animated letters. Use line breaks
                    for multi-line text.
                  </p>
                </div>
                {/* Text Delay */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-300">Text Delay</label>
                    <span className="text-xs text-purple-400">
                      {settings.textDelaySeconds?.toFixed(1) ?? '5.0'}s
                    </span>
                  </div>
                  <Slider
                    size="sm"
                    step={0.1}
                    minValue={0}
                    maxValue={10}
                    value={settings.textDelaySeconds ?? 5}
                    onChange={(value) =>
                      updateSetting('textDelaySeconds', typeof value === 'number' ? value : 5)
                    }
                    classNames={{
                      base: 'max-w-full',
                      track: 'bg-gray-700',
                      filler: 'bg-purple-600',
                      thumb: 'bg-purple-500',
                    }}
                  />
                  <p className="text-xs text-gray-400">
                    How many seconds to wait before text appears (0-10s)
                  </p>
                </div>

                {/* Text Background Darkness */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-300">Background Darkness</label>
                    <span className="text-sm text-purple-400">
                      {settings.textOverlayDarkness ?? 60}%
                    </span>
                  </div>
                  <Slider
                    size="sm"
                    step={5}
                    minValue={0}
                    maxValue={100}
                    value={settings.textOverlayDarkness ?? 60}
                    onChange={(value) => updateSetting('textOverlayDarkness', value as number)}
                    className="w-full"
                    classNames={{
                      track: 'bg-gray-800',
                      filler: 'bg-purple-600',
                      thumb: 'bg-purple-500',
                    }}
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Dark overlay at top of video to improve text readability. Only applies when text
                    is added.
                  </p>
                </div>
              </div>
            </Tab>

            <Tab key="voiceover" title="Voiceover">
              <div className="space-y-6">
                {/* Voiceover Delay */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-300">
                      Voiceover Start Delay
                    </label>
                    <span className="text-xs text-gray-500">
                      {settings.voiceoverDelay?.toFixed(1) ?? '0.0'}s
                    </span>
                  </div>
                  <Slider
                    size="sm"
                    step={0.5}
                    minValue={0}
                    maxValue={10}
                    value={settings.voiceoverDelay ?? 0}
                    onChange={(value) => {
                      updateSetting('voiceoverDelay', typeof value === 'number' ? value : 0);
                    }}
                    className="w-full"
                    classNames={{
                      track: 'bg-gray-800',
                      filler: 'bg-purple-600',
                      thumb: 'bg-purple-500',
                    }}
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Delay before voiceover starts playing
                  </p>
                </div>

                {/* Background volume during voiceover */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-300">
                      Background Volume During Voiceover
                    </label>
                    <span className="text-sm text-purple-400">
                      {settings.backgroundDuringVO ?? 30}%
                    </span>
                  </div>
                  <Slider
                    size="sm"
                    step={1}
                    minValue={0}
                    maxValue={100}
                    value={settings.backgroundDuringVO ?? 30}
                    onChange={(value) => updateSetting('backgroundDuringVO', value as number)}
                    className="w-full"
                    classNames={{
                      track: 'bg-gray-800',
                      filler: 'bg-purple-600',
                      thumb: 'bg-purple-500',
                    }}
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Applies only while voiceover is speaking.
                  </p>
                </div>

                {/* Voiceover volume */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-300">Voiceover Volume</label>
                    <span className="text-sm text-purple-400">
                      {settings.voiceoverVolume ?? 100}%
                    </span>
                  </div>
                  <Slider
                    size="sm"
                    step={1}
                    minValue={0}
                    maxValue={200}
                    value={settings.voiceoverVolume ?? 100}
                    onChange={(value) => updateSetting('voiceoverVolume', value as number)}
                    className="w-full"
                    classNames={{
                      track: 'bg-gray-800',
                      filler: 'bg-purple-600',
                      thumb: 'bg-purple-500',
                    }}
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Adjusts the voiceover loudness relative to background.
                  </p>
                </div>

                {/* Ducking Info */}
                <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
                  <h4 className="mb-2 text-sm font-semibold text-gray-200">Auto-Ducking</h4>
                  <p className="text-xs text-gray-400">
                    Background audio reduces to the level you set above while the voiceover is
                    active, then fades back to 100% after sustained silence and when the voiceover
                    ends.
                  </p>
                </div>
              </div>
            </Tab>

            <Tab key="video" title="Video">
              <div className="space-y-6">
                {/* Filename Input */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    Download Filename
                  </label>
                  <Input
                    value={videoSettings.filename}
                    onChange={(e) => updateVideoSetting('filename', e.target.value)}
                    placeholder="Enter filename (without extension)"
                    classNames={{
                      input: '!bg-gray-900 !text-white placeholder:text-gray-500',
                      inputWrapper:
                        '!bg-gray-900 !border !border-gray-700 hover:!border-purple-600/50 data-[hover=true]:!border-purple-600/50',
                      innerWrapper: '!bg-gray-900',
                      base: 'bg-gray-900',
                    }}
                    data-hj-allow
                    data-testid="filename-input"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    File will be saved as {videoSettings.filename}.mp4
                  </p>
                </div>

                {/* Overlay Effect Dropdown */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    Video Overlay Effect
                  </label>
                  <Select
                    selectedKeys={new Set([videoSettings.overlayEffect])}
                    selectionMode="single"
                    disallowEmptySelection
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys)[0] as string;
                      if (selected) updateVideoSetting('overlayEffect', selected);
                    }}
                    placeholder="Select overlay effect"
                    classNames={{
                      trigger:
                        'bg-gray-900 border-gray-700 hover:bg-gray-800 data-[hover=true]:bg-gray-800',
                      value: '!text-gray-300',
                      selectorIcon: 'text-gray-400',
                      listboxWrapper: 'bg-gray-900',
                      popoverContent: 'bg-gray-900 border border-gray-700',
                    }}
                    data-hj-allow
                    data-testid="overlay-effect-select"
                  >
                    {OVERLAY_OPTIONS.map((option) => (
                      <SelectItem
                        key={option.key}
                        classNames={{
                          base: '!text-gray-300 data-[hover=true]:!bg-gray-800 data-[hover=true]:!text-white data-[selectable=true]:focus:!bg-purple-600 data-[selectable=true]:focus:!text-white data-[focus=true]:!bg-purple-600 data-[focus=true]:!text-white',
                          title:
                            '!text-gray-300 data-[hover=true]:!text-white data-[focus=true]:!text-white',
                        }}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </Select>
                  {selectedOverlay && (
                    <p className="mt-2 text-sm text-gray-400">{selectedOverlay.description}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Note: Overlays are only applied to the final rendered video, not preview
                  </p>
                </div>

                {/* Circular Transition */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-300">
                        Circular Transition
                      </label>
                      <p className="text-xs text-gray-500">
                        Show circular fade effect at the start and end of the video
                      </p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={videoSettings.showCircularTransition ?? true}
                        onChange={(e) =>
                          updateVideoSetting('showCircularTransition', e.target.checked)
                        }
                        className="peer sr-only"
                      />
                      <div className="peer h-6 w-11 rounded-full bg-gray-700 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800" />
                    </label>
                  </div>
                </div>

                {/* Transition Color (hex code) */}
                {videoSettings.showCircularTransition !== false && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">
                      Circular Transition Color
                    </label>
                    <p className="text-xs text-gray-500">
                      Enter a hex color code (for example, #525252)
                    </p>
                    <Input
                      type="text"
                      placeholder="#525252"
                      value={videoSettings.transitionColor ?? '#525252'}
                      onChange={(e) => updateVideoSetting('transitionColor', e.target.value)}
                      classNames={{
                        input: '!bg-gray-900 !text-white placeholder:text-gray-500',
                        inputWrapper:
                          '!bg-gray-900 !border !border-gray-700 hover:!border-purple-600/50 data-[hover=true]:!border-purple-600/50',
                        innerWrapper: '!bg-gray-900',
                        base: 'bg-gray-900',
                      }}
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Preview:</span>
                      <div
                        className="h-6 w-16 rounded border border-gray-600"
                        style={{
                          backgroundColor: videoSettings.transitionColor ?? '#525252',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </Tab>
          </Tabs>
        </ModalBody>
        <ModalFooter className="gap-2">
          <Button
            variant="flat"
            onPress={() => {
              resetSettings();
              resetVideoSettings();
            }}
            className="border border-gray-700 bg-transparent text-gray-300 hover:bg-gray-800"
          >
            Reset All
          </Button>
          <Button
            onPress={() => {
              // Explicitly persist latest settings and video settings
              onSettingsChange({ ...settings });
              onVideoSettingsChange({ ...videoSettings });
              onClose();
            }}
            className="bg-purple-600 font-semibold text-white hover:bg-purple-700"
          >
            Apply
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
