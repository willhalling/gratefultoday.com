'use client';

import { Card, CardBody, CardHeader } from '@heroui/react';
import { Slider } from '@heroui/react';

interface EffectsControlsProps {
  speed: number;
  reverb: number;
  onSpeedChange: (value: number) => void;
  onReverbChange: (value: number) => void;
}

export function EffectsControls({
  speed,
  reverb,
  onSpeedChange,
  onReverbChange,
}: EffectsControlsProps) {
  return (
    <Card className="border-gray-900 bg-gray-950">
      <CardHeader>
        <h3 className="text-lg font-semibold text-white">Effects</h3>
      </CardHeader>
      <CardBody className="gap-6">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm text-gray-400">Speed</label>
            <span className="text-sm font-semibold text-white">{speed.toFixed(2)}x</span>
          </div>
          <Slider
            size="sm"
            step={0.01}
            minValue={0.5}
            maxValue={0.9}
            value={speed}
            onChange={(value) => onSpeedChange(value as number)}
            className="w-full"
            classNames={{
              track: 'bg-gray-800',
              filler: 'bg-purple-600',
              thumb: 'bg-purple-600',
            }}
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm text-gray-400">Reverb</label>
            <span className="text-sm font-semibold text-white">{reverb}%</span>
          </div>
          <Slider
            size="sm"
            step={1}
            minValue={0}
            maxValue={100}
            value={reverb}
            onChange={(value) => onReverbChange(value as number)}
            className="w-full"
            classNames={{
              track: 'bg-gray-800',
              filler: 'bg-purple-600',
              thumb: 'bg-purple-600',
            }}
          />
        </div>
      </CardBody>
    </Card>
  );
}
