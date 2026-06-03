'use client';

import { Textarea, Button } from '@heroui/react';
import { Copy, Check } from 'lucide-react';
import { useEffect, useState } from 'react';

interface VideoDescriptionProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const DEFAULT_TEMPLATE = `***YouTube video description goes here.***

Original music composition (Suno AI)

---

try gratitude just for a week

7 days. 7 prompts. 1 meaningful video at the end: https://gratefultoday.com/just-for-a-week

---

Disclaimer: This is a resource, not a replacement for professional treatment. Some videos may include AI for voice or imagery. Script and creative direction by GratefulToday.

#gratefultoday #sobriety`;

export function VideoDescription({
  value,
  onChange,
  placeholder = 'Enter video description...',
}: VideoDescriptionProps) {
  const [localValue, setLocalValue] = useState(value || DEFAULT_TEMPLATE);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLocalValue(value || DEFAULT_TEMPLATE);
  }, [value]);

  const handleChange = (newValue: string) => {
    setLocalValue(newValue);
    onChange(newValue);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(localValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-medium text-gray-300">Video Description</label>
        <Button
          size="sm"
          onClick={handleCopy}
          className="bg-gray-800 text-gray-300 hover:bg-gray-700"
          startContent={
            copied ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <Copy className="h-3 w-3 text-gray-400" />
            )
          }
        >
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>
      <Textarea
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        minRows={25}
        maxRows={50}
        classNames={{
          input: '!bg-gray-900 !text-gray-200 placeholder:text-gray-500 !text-sm !min-h-[600px]',
          inputWrapper:
            '!bg-gray-900 !border !border-gray-700 hover:!border-purple-600/50 data-[hover=true]:!border-purple-600/50',
          innerWrapper: '!bg-gray-900',
          base: 'bg-gray-900',
        }}
        aria-label="Video description"
      />
    </div>
  );
}

export { DEFAULT_TEMPLATE };
