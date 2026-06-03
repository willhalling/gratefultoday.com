'use client';

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  Button,
  Tabs,
  Tab,
  Slider,
  Select,
  SelectItem,
  Textarea,
  Input,
} from '@heroui/react';
import { Settings as SettingsIcon } from 'lucide-react';
import type { AdvancedAudioSettings, VideoSettings } from './AdvancedSettingsModal';
import { TextSettingsPanel } from './TextSettingsPanel';
import { darkSelectClasses, darkSelectItemClasses } from './DarkSelect';
import { IMPULSE_RESPONSES } from '@/constants/impulse-responses';
import { CaptionsPanel } from './CaptionsPanel';
import type { CaptionData, CaptionStyle } from '@/lib/remotion/caption-types';
import type { SlideshowSettings } from '@/types/slideshow';

interface PreviewSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  advancedSettings: AdvancedAudioSettings;
  onAdvancedSettingsChange: (settings: AdvancedAudioSettings) => void;
  videoSettings: VideoSettings;
  onVideoSettingsChange: (settings: VideoSettings) => void;
  onReset: () => void;
  // Slideshow props
  slideshowSettings: SlideshowSettings;
  onSlideshowSettingsChange: (settings: SlideshowSettings) => void;
  onOpenSlideshowManager: () => void;
  // Captions props
  captionsEnabled: boolean;
  onCaptionsEnabledChange: (enabled: boolean) => void;
  captionData: CaptionData | null;
  onCaptionDataChange: (data: CaptionData | null) => void;
  captionStyle: CaptionStyle;
  onCaptionStyleChange: (style: CaptionStyle) => void;
  useCaptionAnimation: boolean;
  onUseCaptionAnimationChange: (use: boolean) => void;
  onUseTtsAsAudio?: (use: boolean) => void;
  captionOverlayDarkness: number;
  onCaptionOverlayDarknessChange: (value: number) => void;
  captionOpacity: number;
  onCaptionOpacityChange: (value: number) => void;
  onCaptionFileUpload: (file: File) => void;
  onCaptionFileUrlReady: (url: string) => void;
  uploadingCaptionFile: File | null;
  existingCaptionFileUrl?: string;
}

export function PreviewSettingsDrawer({
  isOpen,
  onClose,
  advancedSettings,
  onAdvancedSettingsChange,
  videoSettings,
  onVideoSettingsChange,
  onReset,
  slideshowSettings,
  onSlideshowSettingsChange,
  onOpenSlideshowManager,
  captionsEnabled,
  onCaptionsEnabledChange,
  captionData,
  onCaptionDataChange,
  captionStyle,
  onCaptionStyleChange,
  useCaptionAnimation,
  onUseCaptionAnimationChange,
  onUseTtsAsAudio,
  captionOverlayDarkness,
  onCaptionOverlayDarknessChange,
  captionOpacity,
  onCaptionOpacityChange,
  onCaptionFileUpload,
  onCaptionFileUrlReady,
  uploadingCaptionFile,
  existingCaptionFileUrl,
}: PreviewSettingsDrawerProps) {
  return (
    <Drawer isOpen={isOpen} onClose={onClose} placement="left" size="lg">
      <DrawerContent className="border-l border-purple-500/20 bg-black/95">
        <DrawerHeader className="flex items-center gap-3 border-b border-gray-800 pb-4">
          <SettingsIcon className="h-5 w-5 text-purple-400" />
          <span className="text-xl font-semibold text-white">Preview Settings</span>
        </DrawerHeader>
        <DrawerBody className="overflow-y-auto pb-6">
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
                {/* Effect Presets */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Effect Presets</label>
                  <Select
                    size="sm"
                    placeholder="Choose a preset..."
                    selectedKeys={
                      advancedSettings.selectedPreset
                        ? new Set([advancedSettings.selectedPreset])
                        : new Set()
                    }
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys)[0] as string;
                      if (selected) {
                        const presets = [
                          {
                            key: 'original',
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
                            settings: {
                              speed: 0.8,
                              reverb: 50,
                              pitch: 0,
                              bassBoost: 20,
                              volume: 100,
                              location: 'church',
                            },
                          },
                          {
                            key: 'deep',
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
                        const preset = presets.find((p) => p.key === selected);
                        if (preset) {
                          onAdvancedSettingsChange({
                            ...advancedSettings,
                            ...preset.settings,
                            selectedPreset: selected,
                          });
                        }
                      }
                    }}
                    classNames={darkSelectClasses}
                  >
                    <SelectItem key="original" classNames={darkSelectItemClasses}>
                      Original Audio
                    </SelectItem>
                    <SelectItem key="classic" classNames={darkSelectItemClasses}>
                      Classic Slowed + Reverb
                    </SelectItem>
                    <SelectItem key="deep" classNames={darkSelectItemClasses}>
                      Deep Slowed
                    </SelectItem>
                    <SelectItem key="dreamy" classNames={darkSelectItemClasses}>
                      Dreamy Reverb
                    </SelectItem>
                    <SelectItem key="nightcore" classNames={darkSelectItemClasses}>
                      Nightcore
                    </SelectItem>
                    <SelectItem key="daycore" classNames={darkSelectItemClasses}>
                      Daycore
                    </SelectItem>
                    <SelectItem key="ultra-slowed" classNames={darkSelectItemClasses}>
                      Ultra Slowed
                    </SelectItem>
                  </Select>
                  <p className="text-xs text-gray-400">Quick effect presets for instant results</p>
                </div>

                {/* Speed */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-300">Speed</label>
                    <span className="text-sm text-purple-400">
                      {advancedSettings.speed.toFixed(2)}x
                    </span>
                  </div>
                  <Slider
                    size="sm"
                    step={0.05}
                    minValue={0.25}
                    maxValue={2.0}
                    value={advancedSettings.speed}
                    onChange={(value) =>
                      onAdvancedSettingsChange({ ...advancedSettings, speed: value as number })
                    }
                    classNames={{
                      track: 'bg-gray-800',
                      filler: 'bg-purple-600',
                      thumb: 'bg-purple-500',
                    }}
                  />
                  <p className="text-xs text-gray-400">Playback speed (0.25x-2.0x)</p>
                </div>

                {/* Reverb */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-300">Reverb</label>
                    <span className="text-sm text-purple-400">{advancedSettings.reverb}%</span>
                  </div>
                  <Slider
                    size="sm"
                    step={1}
                    minValue={0}
                    maxValue={100}
                    value={advancedSettings.reverb}
                    onChange={(value) =>
                      onAdvancedSettingsChange({ ...advancedSettings, reverb: value as number })
                    }
                    classNames={{
                      track: 'bg-gray-800',
                      filler: 'bg-purple-600',
                      thumb: 'bg-purple-500',
                    }}
                  />
                  <p className="text-xs text-gray-400">Echo/reverb amount</p>
                </div>

                {/* Pitch */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-300">Pitch</label>
                    <span className="text-sm text-purple-400">
                      {advancedSettings.pitch > 0 ? '+' : ''}
                      {advancedSettings.pitch} semitones
                    </span>
                  </div>
                  <Slider
                    size="sm"
                    step={1}
                    minValue={-12}
                    maxValue={12}
                    value={advancedSettings.pitch}
                    onChange={(value) =>
                      onAdvancedSettingsChange({ ...advancedSettings, pitch: value as number })
                    }
                    classNames={{
                      track: 'bg-gray-800',
                      filler: 'bg-purple-600',
                      thumb: 'bg-purple-500',
                    }}
                  />
                  <p className="text-xs text-gray-400">Pitch shift in semitones</p>
                </div>

                {/* Bass Boost */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-300">Bass Boost</label>
                    <span className="text-sm text-purple-400">{advancedSettings.bassBoost}%</span>
                  </div>
                  <Slider
                    size="sm"
                    step={1}
                    minValue={0}
                    maxValue={100}
                    value={advancedSettings.bassBoost}
                    onChange={(value) =>
                      onAdvancedSettingsChange({ ...advancedSettings, bassBoost: value as number })
                    }
                    classNames={{
                      track: 'bg-gray-800',
                      filler: 'bg-purple-600',
                      thumb: 'bg-purple-500',
                    }}
                  />
                  <p className="text-xs text-gray-400">Low frequency boost</p>
                </div>

                {/* Volume */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-300">Volume</label>
                    <span className="text-sm text-purple-400">{advancedSettings.volume}%</span>
                  </div>
                  <Slider
                    size="sm"
                    step={1}
                    minValue={0}
                    maxValue={200}
                    value={advancedSettings.volume}
                    onChange={(value) =>
                      onAdvancedSettingsChange({ ...advancedSettings, volume: value as number })
                    }
                    classNames={{
                      track: 'bg-gray-800',
                      filler: 'bg-purple-600',
                      thumb: 'bg-purple-500',
                    }}
                  />
                  <p className="text-xs text-gray-400">Master volume level</p>
                </div>

                {/* Crop Start */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-300">Crop Start</label>
                    <span className="text-sm text-purple-400">
                      {advancedSettings.cropStart.toFixed(1)}s
                    </span>
                  </div>
                  <Slider
                    size="sm"
                    step={0.1}
                    minValue={0}
                    maxValue={advancedSettings.cropEnd - 0.1}
                    value={advancedSettings.cropStart}
                    onChange={(value) =>
                      onAdvancedSettingsChange({ ...advancedSettings, cropStart: value as number })
                    }
                    classNames={{
                      track: 'bg-gray-800',
                      filler: 'bg-purple-600',
                      thumb: 'bg-purple-500',
                    }}
                  />
                  <p className="text-xs text-gray-400">Trim from the beginning</p>
                </div>

                {/* Crop End */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-300">Crop End</label>
                    <span className="text-sm text-purple-400">
                      {advancedSettings.cropEnd.toFixed(1)}s
                    </span>
                  </div>
                  <Slider
                    size="sm"
                    step={0.1}
                    minValue={advancedSettings.cropStart + 0.1}
                    maxValue={300}
                    value={advancedSettings.cropEnd}
                    onChange={(value) =>
                      onAdvancedSettingsChange({ ...advancedSettings, cropEnd: value as number })
                    }
                    classNames={{
                      track: 'bg-gray-800',
                      filler: 'bg-purple-600',
                      thumb: 'bg-purple-500',
                    }}
                  />
                  <p className="text-xs text-gray-400">Trim from the end</p>
                </div>

                {/* Loop Count */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-300">Loop Count</label>
                    <span className="text-sm text-purple-400">
                      {advancedSettings.loopCount ?? 1}x
                    </span>
                  </div>
                  <Slider
                    size="sm"
                    step={1}
                    minValue={1}
                    maxValue={10}
                    value={advancedSettings.loopCount ?? 1}
                    onChange={(value) =>
                      onAdvancedSettingsChange({ ...advancedSettings, loopCount: value as number })
                    }
                    classNames={{
                      track: 'bg-gray-800',
                      filler: 'bg-purple-600',
                      thumb: 'bg-purple-500',
                    }}
                  />
                  <p className="text-xs text-gray-400">Number of times to loop the audio</p>
                </div>

                {/* Loop Crossfade */}
                {(advancedSettings.loopCount ?? 1) > 1 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-300">Loop Crossfade</label>
                      <span className="text-sm text-purple-400">
                        {advancedSettings.loopCrossfade ?? 2}s
                      </span>
                    </div>
                    <Slider
                      size="sm"
                      step={0.1}
                      minValue={0}
                      maxValue={5}
                      value={advancedSettings.loopCrossfade ?? 2}
                      onChange={(value) =>
                        onAdvancedSettingsChange({
                          ...advancedSettings,
                          loopCrossfade: value as number,
                        })
                      }
                      classNames={{
                        track: 'bg-gray-800',
                        filler: 'bg-purple-600',
                        thumb: 'bg-purple-500',
                      }}
                    />
                    <p className="text-xs text-gray-400">
                      Smooth transition duration between loops
                    </p>
                  </div>
                )}

                {/* Audio Visualizer */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Audio Visualizer</label>
                  <Select
                    size="sm"
                    selectedKeys={[advancedSettings.visualizerType ?? 'default']}
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys)[0] as string;
                      onAdvancedSettingsChange({
                        ...advancedSettings,
                        visualizerType: selected,
                      });
                    }}
                    classNames={darkSelectClasses}
                  >
                    <SelectItem key="default" classNames={darkSelectItemClasses}>
                      Default (Simple Wave)
                    </SelectItem>
                    <SelectItem key="bars" classNames={darkSelectItemClasses}>
                      Frequency Bars
                    </SelectItem>
                    <SelectItem key="wave" classNames={darkSelectItemClasses}>
                      Waveform
                    </SelectItem>
                    <SelectItem key="hills" classNames={darkSelectItemClasses}>
                      Hills
                    </SelectItem>
                    <SelectItem key="radial" classNames={darkSelectItemClasses}>
                      Radial
                    </SelectItem>
                  </Select>
                  <p className="text-xs text-gray-400">
                    Visual representation of audio in the video
                  </p>
                </div>

                {/* Reverb Location */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Reverb Space</label>
                  <Select
                    size="sm"
                    selectedKeys={[advancedSettings.location ?? 'none']}
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys)[0] as string;
                      onAdvancedSettingsChange({
                        ...advancedSettings,
                        location: selected,
                      });
                    }}
                    classNames={darkSelectClasses}
                  >
                    <SelectItem key="none" classNames={darkSelectItemClasses}>
                      None (Dry)
                    </SelectItem>
                    {IMPULSE_RESPONSES.filter((ir) => ir.key !== 'none').map((ir) => (
                      <SelectItem key={ir.key} classNames={darkSelectItemClasses}>
                        {ir.label}
                      </SelectItem>
                    ))}
                  </Select>
                  <p className="text-xs text-gray-400">Type of space/room reverb to simulate</p>
                </div>
              </div>
            </Tab>

            <Tab key="intro" title="Intro">
              <div className="space-y-6">
                {/* Intro Text */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Intro Text</label>
                  <Textarea
                    placeholder="Add intro text to your video..."
                    value={advancedSettings.introText ?? ''}
                    onChange={(e) =>
                      onAdvancedSettingsChange({
                        ...advancedSettings,
                        introText: e.target.value,
                      })
                    }
                    minRows={3}
                    classNames={{
                      input: '!bg-gray-900 !text-gray-300 placeholder:text-gray-600',
                      inputWrapper: '!bg-gray-900 !border !border-gray-700',
                    }}
                  />
                  <p className="text-xs text-gray-400">
                    Text will appear at the beginning of your video
                  </p>
                </div>

                {/* Intro Position */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Position</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'top-left', label: 'Top Left' },
                      { value: 'top-center', label: 'Top Center' },
                      { value: 'top-right', label: 'Top Right' },
                      { value: 'center-left', label: 'Center Left' },
                      { value: 'center', label: 'Center' },
                      { value: 'center-right', label: 'Center Right' },
                      { value: 'bottom-left', label: 'Bottom Left' },
                      { value: 'bottom-center', label: 'Bottom Center' },
                      { value: 'bottom-right', label: 'Bottom Right' },
                    ].map((position) => (
                      <button
                        key={position.value}
                        onClick={() =>
                          onAdvancedSettingsChange({
                            ...advancedSettings,
                            introPosition: position.value as any,
                          })
                        }
                        className={`rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                          (advancedSettings.introPosition ?? 'center') === position.value
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        {position.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400">Position of the intro text on screen</p>
                </div>

                {/* Intro Delay */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-300">Start Delay</label>
                    <span className="text-xs text-purple-400">
                      {advancedSettings.introDelaySeconds ?? 5}s
                    </span>
                  </div>
                  <Slider
                    size="sm"
                    step={0.5}
                    minValue={0}
                    maxValue={10}
                    value={advancedSettings.introDelaySeconds ?? 5}
                    onChange={(value) =>
                      onAdvancedSettingsChange({
                        ...advancedSettings,
                        introDelaySeconds: typeof value === 'number' ? value : 5,
                      })
                    }
                    classNames={{
                      base: 'max-w-full',
                      track: 'bg-gray-700',
                      filler: 'bg-purple-600',
                      thumb: 'bg-purple-500',
                    }}
                  />
                  <p className="text-xs text-gray-400">Delay before intro appears (0-10 seconds)</p>
                </div>

                {/* Shared Text Settings */}
                <div className="border-t border-gray-800 pt-6">
                  <h3 className="mb-4 text-sm font-semibold text-gray-200">Shared Text Settings</h3>
                  <TextSettingsPanel
                    advancedSettings={advancedSettings}
                    onAdvancedSettingsChange={onAdvancedSettingsChange}
                  />
                </div>
              </div>
            </Tab>

            <Tab key="outro" title="Outro">
              <div className="space-y-6">
                {/* Outro Text - moved from Video tab */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Outro Text</label>
                  <Textarea
                    placeholder="Add outro text to your video..."
                    value={advancedSettings.outroText ?? ''}
                    onChange={(e) =>
                      onAdvancedSettingsChange({
                        ...advancedSettings,
                        outroText: e.target.value,
                      })
                    }
                    minRows={3}
                    classNames={{
                      input: '!bg-gray-900 !text-gray-300 placeholder:text-gray-600',
                      inputWrapper: '!bg-gray-900 !border !border-gray-700',
                    }}
                  />
                  <p className="text-xs text-gray-400">Text will appear at the end of your video</p>
                </div>

                {/* Outro Position */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Position</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'top-left', label: 'Top Left' },
                      { value: 'top-center', label: 'Top Center' },
                      { value: 'top-right', label: 'Top Right' },
                      { value: 'center-left', label: 'Center Left' },
                      { value: 'center', label: 'Center' },
                      { value: 'center-right', label: 'Center Right' },
                      { value: 'bottom-left', label: 'Bottom Left' },
                      { value: 'bottom-center', label: 'Bottom Center' },
                      { value: 'bottom-right', label: 'Bottom Right' },
                    ].map((position) => (
                      <button
                        key={position.value}
                        onClick={() =>
                          onAdvancedSettingsChange({
                            ...advancedSettings,
                            outroPosition: position.value as any,
                          })
                        }
                        className={`rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                          (advancedSettings.outroPosition ?? 'center') === position.value
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        {position.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400">Position of the outro text on screen</p>
                </div>

                {/* Outro Timing */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-300">Start Before End</label>
                    <span className="text-xs text-purple-400">
                      {advancedSettings.outroStartBeforeEnd ?? 6}s
                    </span>
                  </div>
                  <Slider
                    size="sm"
                    step={0.5}
                    minValue={1}
                    maxValue={15}
                    value={advancedSettings.outroStartBeforeEnd ?? 6}
                    onChange={(value) =>
                      onAdvancedSettingsChange({
                        ...advancedSettings,
                        outroStartBeforeEnd: typeof value === 'number' ? value : 6,
                      })
                    }
                    classNames={{
                      base: 'max-w-full',
                      track: 'bg-gray-700',
                      filler: 'bg-purple-600',
                      thumb: 'bg-purple-500',
                    }}
                  />
                  <p className="text-xs text-gray-400">
                    Start outro X seconds before video ends (1-15 seconds)
                  </p>
                </div>

                {/* Shared Text Settings */}
                <div className="border-t border-gray-800 pt-6">
                  <h3 className="mb-4 text-sm font-semibold text-gray-200">Shared Text Settings</h3>
                  <p className="mb-4 text-xs text-gray-400">
                    These settings apply to both intro and outro text
                  </p>
                  <TextSettingsPanel
                    advancedSettings={advancedSettings}
                    onAdvancedSettingsChange={onAdvancedSettingsChange}
                  />
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
                    <span className="text-sm text-purple-400">
                      {advancedSettings.voiceoverDelay ?? 0}s
                    </span>
                  </div>
                  <Slider
                    size="sm"
                    step={0.5}
                    minValue={0}
                    maxValue={10}
                    value={advancedSettings.voiceoverDelay ?? 0}
                    onChange={(value) =>
                      onAdvancedSettingsChange({
                        ...advancedSettings,
                        voiceoverDelay: value as number,
                      })
                    }
                    className="w-full"
                    classNames={{
                      track: 'bg-gray-800',
                      filler: 'bg-purple-600',
                      thumb: 'bg-purple-500',
                    }}
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Delay before voiceover starts (0-10 seconds)
                  </p>
                </div>

                {/* Background Volume During Voiceover */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-300">
                      Background Volume (During VO)
                    </label>
                    <span className="text-sm text-purple-400">
                      {advancedSettings.backgroundDuringVO ?? 30}%
                    </span>
                  </div>
                  <Slider
                    size="sm"
                    step={5}
                    minValue={0}
                    maxValue={100}
                    value={advancedSettings.backgroundDuringVO ?? 30}
                    onChange={(value) =>
                      onAdvancedSettingsChange({
                        ...advancedSettings,
                        backgroundDuringVO: value as number,
                      })
                    }
                    className="w-full"
                    classNames={{
                      track: 'bg-gray-800',
                      filler: 'bg-purple-600',
                      thumb: 'bg-purple-500',
                    }}
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Background music volume while voiceover is playing (0-100%)
                  </p>
                </div>

                {/* Voiceover Volume */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-300">Voiceover Volume</label>
                    <span className="text-sm text-purple-400">
                      {advancedSettings.voiceoverVolume ?? 100}%
                    </span>
                  </div>
                  <Slider
                    size="sm"
                    step={5}
                    minValue={0}
                    maxValue={100}
                    value={advancedSettings.voiceoverVolume ?? 100}
                    onChange={(value) =>
                      onAdvancedSettingsChange({
                        ...advancedSettings,
                        voiceoverVolume: value as number,
                      })
                    }
                    className="w-full"
                    classNames={{
                      track: 'bg-gray-800',
                      filler: 'bg-purple-600',
                      thumb: 'bg-purple-500',
                    }}
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Volume of the voiceover audio (0-100%)
                  </p>
                </div>
              </div>
            </Tab>

            <Tab key="captions" title="Captions">
              <div className="space-y-6">
                <CaptionsPanel
                  captionsEnabled={captionsEnabled}
                  onCaptionsEnabledChange={onCaptionsEnabledChange}
                  captionData={captionData}
                  onCaptionDataChange={onCaptionDataChange}
                  captionStyle={captionStyle}
                  onCaptionStyleChange={onCaptionStyleChange}
                  useCaptionAnimation={useCaptionAnimation}
                  onUseCaptionAnimationChange={onUseCaptionAnimationChange}
                  captionAnimationSpeed={advancedSettings.captionAnimationSpeed ?? 'slow'}
                  onCaptionAnimationSpeedChange={(speed) =>
                    onAdvancedSettingsChange({
                      ...advancedSettings,
                      captionAnimationSpeed: speed,
                    })
                  }
                  onUseTtsAsAudio={onUseTtsAsAudio}
                  captionOverlayDarkness={captionOverlayDarkness}
                  onCaptionOverlayDarknessChange={onCaptionOverlayDarknessChange}
                  captionOpacity={captionOpacity}
                  onCaptionOpacityChange={onCaptionOpacityChange}
                  captionDelaySeconds={advancedSettings.captionDelaySeconds ?? 0}
                  onCaptionDelaySecondsChange={(value) =>
                    onAdvancedSettingsChange({
                      ...advancedSettings,
                      captionDelaySeconds: value,
                    })
                  }
                  onCaptionFileUpload={onCaptionFileUpload}
                  onCaptionFileUrlReady={onCaptionFileUrlReady}
                  uploadingCaptionFile={uploadingCaptionFile}
                  existingCaptionFileUrl={existingCaptionFileUrl}
                />
              </div>
            </Tab>

            <Tab key="slideshow" title="Slideshow">
              <div className="space-y-6">
                {/* Slideshow Images Manager */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-300">Images</label>
                    <Button size="sm" color="primary" onPress={onOpenSlideshowManager}>
                      Manage Images
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    {slideshowSettings.images.length === 0
                      ? 'No images added yet'
                      : `${slideshowSettings.images.length} image${slideshowSettings.images.length > 1 ? 's' : ''} in slideshow`}
                  </p>
                  {slideshowSettings.images.length === 1 && (
                    <p className="rounded-md bg-gray-900 p-2 text-xs text-gray-400">
                      Single image will be static{' '}
                      {slideshowSettings.zoomEnabled ? 'with zoom effect' : '(zoom disabled)'}
                    </p>
                  )}
                  {slideshowSettings.images.length > 1 && (
                    <p className="rounded-md bg-gray-900 p-2 text-xs text-gray-400">
                      Multiple images will create a slideshow with transitions
                    </p>
                  )}
                </div>

                {/* Zoom Enable/Disable */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-300">
                        Ken Burns Zoom Effect
                      </label>
                      <p className="text-xs text-gray-500">Slow zoom animation on images</p>
                    </div>
                    <Button
                      size="sm"
                      variant={slideshowSettings.zoomEnabled ? 'solid' : 'flat'}
                      className={
                        slideshowSettings.zoomEnabled
                          ? 'bg-purple-600 text-white'
                          : 'border border-gray-700 bg-transparent text-gray-400'
                      }
                      onPress={() =>
                        onSlideshowSettingsChange({
                          ...slideshowSettings,
                          zoomEnabled: !slideshowSettings.zoomEnabled,
                        })
                      }
                    >
                      {slideshowSettings.zoomEnabled ? 'On' : 'Off'}
                    </Button>
                  </div>
                </div>

                {/* Zoom Scale */}
                {slideshowSettings.zoomEnabled && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Zoom Intensity</label>
                    <Slider
                      size="sm"
                      step={0.05}
                      minValue={1.0}
                      maxValue={2.0}
                      value={slideshowSettings.zoomScale}
                      onChange={(value) =>
                        onSlideshowSettingsChange({
                          ...slideshowSettings,
                          zoomScale: value as number,
                        })
                      }
                      className="max-w-full"
                      classNames={{
                        track: 'bg-gray-800',
                        filler: 'bg-purple-600',
                        thumb: 'bg-purple-600',
                        label: '!text-gray-300',
                        value: '!text-gray-300',
                      }}
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>1.0x (Subtle)</span>
                      <span>{slideshowSettings.zoomScale.toFixed(2)}x</span>
                      <span>2.0x (Intense)</span>
                    </div>
                  </div>
                )}

                {/* Transition Duration (only for multiple images) */}
                {slideshowSettings.images.length > 1 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Transition Speed</label>
                    <Slider
                      size="sm"
                      step={10}
                      minValue={10}
                      maxValue={90}
                      value={slideshowSettings.transitionDuration}
                      onChange={(value) =>
                        onSlideshowSettingsChange({
                          ...slideshowSettings,
                          transitionDuration: value as number,
                        })
                      }
                      className="max-w-full"
                      classNames={{
                        track: 'bg-gray-800',
                        filler: 'bg-purple-600',
                        thumb: 'bg-purple-600',
                        label: '!text-gray-300',
                        value: '!text-gray-300',
                      }}
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>10 frames (Fast)</span>
                      <span>
                        {slideshowSettings.transitionDuration} frames (
                        {(slideshowSettings.transitionDuration / 30).toFixed(1)}s)
                      </span>
                      <span>90 frames (Slow)</span>
                    </div>
                  </div>
                )}

                {/* Transition Type (disabled for now, only fade supported) */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Transition Effect</label>
                  <Select
                    size="sm"
                    selectedKeys={new Set([slideshowSettings.transitionType])}
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys)[0] as 'fade' | 'slide' | 'wipe';
                      onSlideshowSettingsChange({
                        ...slideshowSettings,
                        transitionType: selected,
                      });
                    }}
                    classNames={darkSelectClasses}
                    isDisabled
                  >
                    <SelectItem key="fade" classNames={darkSelectItemClasses}>
                      Fade
                    </SelectItem>
                    <SelectItem key="slide" classNames={darkSelectItemClasses}>
                      Slide (Coming Soon)
                    </SelectItem>
                    <SelectItem key="wipe" classNames={darkSelectItemClasses}>
                      Wipe (Coming Soon)
                    </SelectItem>
                  </Select>
                  <p className="text-xs text-gray-500">Only fade transitions supported currently</p>
                </div>

                {/* Info about duration */}
                {slideshowSettings.images.length > 1 && (
                  <div className="rounded-md bg-purple-900/20 border border-purple-500/30 p-3">
                    <p className="text-xs text-gray-300">
                      <strong>Auto-Duration:</strong> Slide duration is automatically calculated to
                      sync with your video's total length.
                    </p>
                  </div>
                )}
              </div>
            </Tab>

            <Tab key="video" title="Video">
              <div className="space-y-6">
                <p className="rounded-md bg-gray-900 p-3 text-sm text-gray-400">
                  Note: Overlays are only applied to the final rendered video, not preview
                </p>

                {/* Circular Transition Toggle */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-300">
                        Circular Transition
                      </label>
                      <p className="text-xs text-gray-500">
                        Show circular reveal/fade effect at start and end of video
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={videoSettings.showCircularTransition === false ? 'flat' : 'solid'}
                      className={
                        videoSettings.showCircularTransition === false
                          ? 'border border-gray-700 bg-transparent text-gray-400'
                          : 'bg-purple-600 text-white'
                      }
                      onPress={() =>
                        onVideoSettingsChange({
                          ...videoSettings,
                          showCircularTransition: !videoSettings.showCircularTransition,
                        })
                      }
                    >
                      {videoSettings.showCircularTransition === false ? 'Off' : 'On'}
                    </Button>
                  </div>
                </div>

                {/* Circle Transition Position */}
                {videoSettings.showCircularTransition !== false && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Show Transition At</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={videoSettings.showCircleTransitionStart !== false}
                          onChange={(e) =>
                            onVideoSettingsChange({
                              ...videoSettings,
                              showCircleTransitionStart: e.target.checked,
                            })
                          }
                          className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-purple-600 focus:ring-2 focus:ring-purple-600 focus:ring-offset-0"
                        />
                        <span className="text-sm text-gray-300">Start</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={videoSettings.showCircleTransitionEnd !== false}
                          onChange={(e) =>
                            onVideoSettingsChange({
                              ...videoSettings,
                              showCircleTransitionEnd: e.target.checked,
                            })
                          }
                          className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-purple-600 focus:ring-2 focus:ring-purple-600 focus:ring-offset-0"
                        />
                        <span className="text-sm text-gray-300">End</span>
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">
                      Choose where to display the circular transition effect
                    </p>
                  </div>
                )}

                {/* Transition Color (hex code) */}
                {videoSettings.showCircularTransition !== false && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Transition Color</label>
                    <p className="text-xs text-gray-500">
                      Enter a hex color code for the circular transition (for example, #525252)
                    </p>
                    <div className="flex items-center gap-3">
                      <Input
                        type="text"
                        placeholder="#525252"
                        value={videoSettings.transitionColor ?? '#525252'}
                        onChange={(e) =>
                          onVideoSettingsChange({
                            ...videoSettings,
                            transitionColor: e.target.value,
                          })
                        }
                        classNames={{
                          input: '!bg-gray-900 !text-white placeholder:text-gray-500',
                          inputWrapper:
                            '!bg-gray-900 !border !border-gray-700 hover:!border-purple-600/50 data-[hover=true]:!border-purple-600/50',
                          innerWrapper: '!bg-gray-900',
                          base: 'bg-gray-900',
                        }}
                      />
                      <div
                        className="h-6 w-10 rounded border border-gray-700"
                        style={{
                          backgroundColor: videoSettings.transitionColor ?? '#525252',
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      Used for fade-to-color transitions at the start and end.
                    </p>
                  </div>
                )}
              </div>
            </Tab>
          </Tabs>
        </DrawerBody>
        <DrawerFooter className="flex justify-between border-t border-gray-800 pt-4">
          <Button
            variant="flat"
            onPress={onReset}
            className="border border-gray-700 bg-transparent text-gray-300 hover:bg-gray-800"
          >
            Reset All
          </Button>
          <Button
            onPress={onClose}
            className="bg-purple-600 font-semibold text-white hover:bg-purple-700"
          >
            Done
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
