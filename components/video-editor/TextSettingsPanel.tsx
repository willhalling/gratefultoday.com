'use client';

import { Select, SelectItem, Slider } from '@heroui/react';
import { darkSelectClasses, darkSelectItemClasses } from './DarkSelect';
import type { AdvancedAudioSettings } from './AdvancedSettingsModal';

interface TextSettingsPanelProps {
  advancedSettings: AdvancedAudioSettings;
  onAdvancedSettingsChange: (settings: AdvancedAudioSettings) => void;
}

export function TextSettingsPanel({
  advancedSettings,
  onAdvancedSettingsChange,
}: TextSettingsPanelProps) {
  return (
    <div className="space-y-6">
      {/* Font Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">Font</label>
        <Select
          selectedKeys={
            advancedSettings.textFont
              ? new Set([advancedSettings.textFont])
              : new Set(['Playfair Display'])
          }
          onSelectionChange={(keys) => {
            const selected = Array.from(keys)[0] as 'Playfair Display' | 'Inter';
            onAdvancedSettingsChange({
              ...advancedSettings,
              textFont: selected,
            });
          }}
          classNames={darkSelectClasses}
        >
          <SelectItem key="Playfair Display" classNames={darkSelectItemClasses}>
            Playfair Display (Elegant Serif)
          </SelectItem>
          <SelectItem key="Inter" classNames={darkSelectItemClasses}>
            Inter (Modern Sans-Serif)
          </SelectItem>
        </Select>
        <p className="text-xs text-gray-400">Choose the font style for text overlays</p>
      </div>

      {/* Font Size */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-300">Font Size</label>
          <span className="text-sm text-purple-400">{advancedSettings.textFontSize ?? 96}px</span>
        </div>
        <Slider
          size="sm"
          step={2}
          minValue={20}
          maxValue={150}
          value={advancedSettings.textFontSize ?? 96}
          onChange={(value) =>
            onAdvancedSettingsChange({
              ...advancedSettings,
              textFontSize: value as number,
            })
          }
          classNames={{
            track: 'bg-gray-800',
            filler: 'bg-purple-600',
            thumb: 'bg-purple-500',
          }}
        />
        <p className="text-xs text-gray-400">Size of the text on screen</p>
      </div>

      {/* Text Opacity */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-300">Text Opacity</label>
          <span className="text-sm text-purple-400">{advancedSettings.textOpacity ?? 100}%</span>
        </div>
        <Slider
          size="sm"
          step={5}
          minValue={0}
          maxValue={100}
          value={advancedSettings.textOpacity ?? 100}
          onChange={(value) =>
            onAdvancedSettingsChange({
              ...advancedSettings,
              textOpacity: value as number,
            })
          }
          classNames={{
            track: 'bg-gray-800',
            filler: 'bg-purple-600',
            thumb: 'bg-purple-500',
          }}
        />
        <p className="text-xs text-gray-400">Transparency of the text (100% = fully visible)</p>
      </div>

      {/* Background Darkness */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-300">Background Darkness</label>
          <span className="text-sm text-purple-400">
            {advancedSettings.textOverlayDarkness ?? 60}%
          </span>
        </div>
        <Slider
          size="sm"
          step={5}
          minValue={0}
          maxValue={100}
          value={advancedSettings.textOverlayDarkness ?? 60}
          onChange={(value) =>
            onAdvancedSettingsChange({
              ...advancedSettings,
              textOverlayDarkness: value as number,
            })
          }
          classNames={{
            track: 'bg-gray-800',
            filler: 'bg-purple-600',
            thumb: 'bg-purple-500',
          }}
        />
        <p className="text-xs text-gray-400">
          Dark overlay behind text for better readability
        </p>
      </div>
    </div>
  );
}
