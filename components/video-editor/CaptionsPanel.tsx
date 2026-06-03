'use client';
import { Button, Checkbox, Input, Select, SelectItem } from '@heroui/react';
import { Slider } from '@heroui/react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getStorage } from 'firebase/storage';
import React, { useState, useEffect } from 'react';
import { firestoreAuth } from '@/firebase/firebase-config';
import { parseSRT, parseVTT } from '@/lib/remotion/caption-parsers';
import type { CaptionData, CaptionStyle } from '@/lib/remotion/caption-types';
import { parseSimpleCaptionScript } from '@/lib/remotion/caption-utils';

interface CaptionsPanelProps {
  isOpen?: boolean;
  captionsEnabled: boolean;
  onCaptionsEnabledChange: (enabled: boolean) => void;
  captionData: CaptionData | null;
  onCaptionDataChange: (data: CaptionData | null) => void;
  captionStyle: CaptionStyle;
  onCaptionStyleChange: (style: CaptionStyle) => void;
  useCaptionAnimation: boolean;
  onUseCaptionAnimationChange: (use: boolean) => void;
  captionAnimationSpeed?: 'slow' | 'normal' | 'fast';
  onCaptionAnimationSpeedChange?: (speed: 'slow' | 'normal' | 'fast') => void;
  onUseTtsAsAudio?: (use: boolean) => void; // optional toggle to use TTS audio as preview
  captionOverlayDarkness: number;
  onCaptionOverlayDarknessChange: (value: number) => void;
  captionOpacity: number;
  onCaptionOpacityChange: (value: number) => void;
  captionDelaySeconds?: number;
  onCaptionDelaySecondsChange?: (value: number) => void;
  onCaptionFileUpload: (file: File) => void;
  onCaptionFileUrlReady: (url: string) => void;
  uploadingCaptionFile: File | null;
  existingCaptionFileUrl?: string;
}

export const CaptionsPanel: React.FC<CaptionsPanelProps> = ({
  captionsEnabled,
  onCaptionsEnabledChange,
  captionData,
  onCaptionDataChange,
  captionStyle,
  onCaptionStyleChange,
  useCaptionAnimation,
  onUseCaptionAnimationChange,
  captionAnimationSpeed = 'slow',
  onCaptionAnimationSpeedChange,
  onUseTtsAsAudio,
  captionOverlayDarkness,
  onCaptionOverlayDarknessChange,
  captionOpacity,
  onCaptionOpacityChange,
  captionDelaySeconds,
  onCaptionDelaySecondsChange,
  onCaptionFileUpload,
  onCaptionFileUrlReady,
  uploadingCaptionFile,
  existingCaptionFileUrl,
}) => {
  const [offsetSeconds, setOffsetSeconds] = useState(0);
  const [fileName, setFileName] = useState<string>('');

  // Load existing caption file from Firebase on mount
  useEffect(() => {
    const loadExistingCaptions = async () => {
      if (existingCaptionFileUrl && !captionData) {
        try {
          const response = await fetch(existingCaptionFileUrl);
          const text = await response.text();
          const url = new URL(existingCaptionFileUrl);
          const pathParts = url.pathname.split('/');
          const fileNameWithParams = pathParts[pathParts.length - 1];
          const name = decodeURIComponent(fileNameWithParams.split('?')[0]);
          setFileName(name);
          await parseAndSetCaptionData(text, name);
          // Auto-enable captions when loaded from Firebase
          if (!captionsEnabled) {
            onCaptionsEnabledChange(true);
          }
        } catch (error) {
          console.error('Failed to load existing captions:', error);
        }
      }
    };
    loadExistingCaptions();
  }, [existingCaptionFileUrl]);

  const parseAndSetCaptionData = async (text: string, name: string) => {
    const lowerName = name.toLowerCase();
    let data: CaptionData | null = null;

    try {
      if (lowerName.endsWith('.srt')) {
        data = parseSRT(text);
      } else if (lowerName.endsWith('.vtt')) {
        data = parseVTT(text);
      } else if (lowerName.endsWith('.txt')) {
        const segments = parseSimpleCaptionScript(text);
        const totalDuration = segments.length > 0 ? segments[segments.length - 1].endTime : 0;
        data = { segments, totalDuration };
      } else if (lowerName.endsWith('.json')) {
        data = JSON.parse(text);
      }
    } catch (e) {
      console.error('Failed to parse captions:', e);
      return;
    }

    if (!data) {
      return;
    }

    if (offsetSeconds !== 0) {
      data = {
        ...data,
        segments: data.segments.map((s) => ({
          ...s,
          startTime: s.startTime + offsetSeconds,
          endTime: s.endTime + offsetSeconds,
        })),
      };
    }

    onCaptionDataChange(data);
  };

  const uploadToFirebase = async (file: File) => {
    try {
      const storage = getStorage();
      const user = firestoreAuth.currentUser;

      if (!storage || !user) {
        console.warn('Storage not available or user not signed in');
        return;
      }

      const safeName = file.name.replace(/\s+/g, '_');
      const path = `users/${user.uid}/captions/${Date.now()}-${safeName}`;
      const objectRef = ref(storage, path);

      await uploadBytes(objectRef, file, {
        contentType: file.type,
        cacheControl: 'public, max-age=86400',
      });

      const url = await getDownloadURL(objectRef);
      onCaptionFileUrlReady(url);
    } catch (err) {
      console.error('Firebase caption upload failed:', err);
    }
  };

  const handleCaptionFile = async (file: File) => {
    onCaptionFileUpload(file);

    const text = await file.text();
    setFileName(file.name);
    await parseAndSetCaptionData(text, file.name);

    // Upload to Firebase
    uploadToFirebase(file);

    // Auto-enable captions when file is loaded
    if (!captionsEnabled) {
      onCaptionsEnabledChange(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Enable Captions Checkbox */}
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-gray-300">Enable Captions</label>
          <p className="text-xs text-gray-500">Show captions during video playback</p>
        </div>
        <Checkbox
          isSelected={captionsEnabled}
          onChange={(v) => onCaptionsEnabledChange(!!v)}
          classNames={{
            wrapper: 'after:bg-purple-600 border-gray-700',
            label: 'text-gray-300',
          }}
        />
      </div>

      {captionData && (
        <div className="rounded-md bg-gray-900 p-3 text-sm">
          <p className="text-gray-300">
            <span className="font-medium text-purple-400">{captionData.segments.length}</span>{' '}
            caption segments loaded
            {fileName && <span className="text-gray-500"> • {fileName}</span>}
          </p>
        </div>
      )}

      {/* Upload Captions */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">Upload Caption File</label>
        <Input
          type="file"
          accept=".srt,.vtt,.txt,.json"
          size="sm"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleCaptionFile(file);
          }}
          classNames={{
            input:
              '!bg-gray-900 !text-gray-300 file:bg-gray-800 file:text-gray-300 file:border-0 file:px-4 file:py-2 file:mr-4 file:rounded',
            inputWrapper: '!bg-gray-900 !border !border-gray-700 hover:!border-gray-600',
          }}
        />
        <p className="text-xs text-gray-400">Supported formats: .srt, .vtt, .txt, .json</p>
      </div>

      {/* Timing Offset */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-300">Timing Offset</label>
          <span className="text-xs text-purple-400">{offsetSeconds}s</span>
        </div>
        <Slider
          size="sm"
          step={0.1}
          minValue={-5}
          maxValue={5}
          value={offsetSeconds}
          onChange={(value) => setOffsetSeconds(typeof value === 'number' ? value : 0)}
          classNames={{
            base: 'max-w-full',
            track: 'bg-gray-700',
            filler: 'bg-purple-600',
            thumb: 'bg-purple-500',
          }}
        />
        <p className="text-xs text-gray-400">Adjust caption timing by -5 to +5 seconds</p>
      </div>

      {/* Animation Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-gray-300">Animated Text</label>
          <p className="text-xs text-gray-500">Use letter-by-letter animation effect</p>
        </div>
        <Checkbox
          isSelected={useCaptionAnimation}
          onChange={(v) => onUseCaptionAnimationChange(!!v)}
          classNames={{
            wrapper: 'after:bg-purple-600 border-gray-700',
            label: 'text-gray-300',
          }}
        />
      </div>

      {/* Animation Speed */}
      {useCaptionAnimation && onCaptionAnimationSpeedChange && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Animation Speed</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'slow', label: 'Slow' },
              { value: 'normal', label: 'Normal' },
              { value: 'fast', label: 'Fast' },
            ].map((speed) => (
              <button
                key={speed.value}
                onClick={() =>
                  onCaptionAnimationSpeedChange(speed.value as 'slow' | 'normal' | 'fast')
                }
                className={`rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                  captionAnimationSpeed === speed.value
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {speed.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400">Speed of letter-by-letter animation</p>
        </div>
      )}

      {/* Caption Position */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">Caption Position</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'top', label: 'Top' },
            { value: 'center', label: 'Center' },
            { value: 'bottom', label: 'Bottom' },
          ].map((position) => (
            <button
              key={position.value}
              onClick={() =>
                onCaptionStyleChange({
                  ...captionStyle,
                  position: position.value as CaptionStyle['position'],
                })
              }
              className={`rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                (captionStyle.position ?? 'center') === position.value
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {position.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400">Vertical position of captions on screen</p>
      </div>

      {/* Font Family */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">Font</label>
        <Select
          size="sm"
          selectedKeys={[captionStyle.fontFamily?.includes('Inter') ? 'Inter' : 'Playfair Display']}
          onSelectionChange={(keys) => {
            const selected = Array.from(keys)[0] as string;
            onCaptionStyleChange({ ...captionStyle, fontFamily: selected });
          }}
          classNames={{
            trigger: 'bg-gray-900 border-gray-700 hover:bg-gray-800 data-[hover=true]:bg-gray-800',
            value: '!text-gray-300',
            selectorIcon: 'text-gray-400',
            listboxWrapper: 'bg-gray-900',
            popoverContent: 'bg-gray-900 border border-gray-700',
          }}
        >
          {['Inter', 'Playfair Display'].map((f) => (
            <SelectItem
              key={f}
              classNames={{
                base: '!text-gray-300 data-[hover=true]:!bg-gray-800',
              }}
            >
              {f}
            </SelectItem>
          ))}
        </Select>
        <p className="text-xs text-gray-400">Choose the font style for captions</p>
      </div>

      {/* Font Size */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-300">Font Size</label>
          <span className="text-xs text-purple-400">{captionStyle.fontSize || 72}px</span>
        </div>
        <Slider
          size="sm"
          step={2}
          minValue={40}
          maxValue={120}
          value={captionStyle.fontSize || 72}
          onChange={(value) =>
            onCaptionStyleChange({
              ...captionStyle,
              fontSize: typeof value === 'number' ? value : 72,
            })
          }
          classNames={{
            base: 'max-w-full',
            track: 'bg-gray-700',
            filler: 'bg-purple-600',
            thumb: 'bg-purple-500',
          }}
        />
        <p className="text-xs text-gray-400">Size of caption text (40-120px)</p>
      </div>

      {/* Text Opacity */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-300">Text Opacity</label>
          <span className="text-xs text-purple-400">{captionOpacity}%</span>
        </div>
        <Slider
          size="sm"
          step={5}
          minValue={0}
          maxValue={100}
          value={captionOpacity}
          onChange={(value) => onCaptionOpacityChange(typeof value === 'number' ? value : 100)}
          classNames={{
            base: 'max-w-full',
            track: 'bg-gray-700',
            filler: 'bg-purple-600',
            thumb: 'bg-purple-500',
          }}
        />
        <p className="text-xs text-gray-400">Opacity of caption text (0-100%)</p>
      </div>

      {/* Caption Delay */}
      {onCaptionDelaySecondsChange && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-300">Caption Delay</label>
            <span className="text-xs text-purple-400">{captionDelaySeconds ?? 0}s</span>
          </div>
          <Slider
            size="sm"
            step={0.5}
            minValue={0}
            maxValue={10}
            value={captionDelaySeconds ?? 0}
            onChange={(value) => onCaptionDelaySecondsChange(typeof value === 'number' ? value : 0)}
            classNames={{
              base: 'max-w-full',
              track: 'bg-gray-700',
              filler: 'bg-purple-600',
              thumb: 'bg-purple-500',
            }}
          />
          <p className="text-xs text-gray-400">Delay before captions start (0-10 seconds)</p>
        </div>
      )}

      {/* Background Darkness */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-300">Background Darkness</label>
          <span className="text-xs text-purple-400">{captionOverlayDarkness}%</span>
        </div>
        <Slider
          size="sm"
          step={5}
          minValue={0}
          maxValue={100}
          value={captionOverlayDarkness}
          onChange={(value) =>
            onCaptionOverlayDarknessChange(typeof value === 'number' ? value : 60)
          }
          classNames={{
            base: 'max-w-full',
            track: 'bg-gray-700',
            filler: 'bg-purple-600',
            thumb: 'bg-purple-500',
          }}
        />
        <p className="text-xs text-gray-400">
          Dark overlay to improve caption readability (0-100%)
        </p>
      </div>

      {/* Use TTS Audio */}
      {onUseTtsAsAudio && (
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-300">Use TTS Audio for Preview</label>
            <p className="text-xs text-gray-500">Use uploaded voiceover as preview audio</p>
          </div>
          <Checkbox
            onChange={(v) => onUseTtsAsAudio(!!v)}
            classNames={{
              wrapper: 'after:bg-purple-600 border-gray-700',
              label: 'text-gray-300',
            }}
          />
        </div>
      )}

      {/* Clear Button */}
      {captionData && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="flat"
            className="border border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700"
            onClick={() => {
              onCaptionDataChange(null);
              setFileName('');
            }}
          >
            Clear Captions
          </Button>
        </div>
      )}

      <div className="rounded-md bg-gray-900 p-3 text-xs text-gray-400">
        Tip: For perfect sync, use the same TTS audio file for the preview and the captions timing.
      </div>
    </div>
  );
};
