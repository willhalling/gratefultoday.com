'use client';

import { Input, Button } from '@heroui/react';
import { Copy, Check } from 'lucide-react';
import { useEffect, useState } from 'react';

interface VideoTitleProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function VideoTitle({
  value,
  onChange,
  placeholder = 'Enter video title...',
}: VideoTitleProps) {
  const [localValue, setLocalValue] = useState(value);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLocalValue(value);
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
    <div className="mb-2 flex gap-2">
      <Input
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        classNames={{
          input: '!text-gray-200 !text-lg font-semibold placeholder:text-gray-500 !bg-gray-900',
          inputWrapper:
            'bg-gray-900 border border-gray-800 hover:border-purple-600/50 data-[hover=true]:border-purple-600/50 data-[focus=true]:!bg-gray-900 hover:!bg-gray-900 !bg-gray-900',
        }}
        aria-label="Video title"
      />
      <Button
        isIconOnly
        onClick={handleCopy}
        className="bg-gray-800 hover:bg-gray-700"
        aria-label="Copy title"
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4 text-gray-400" />
        )}
      </Button>
    </div>
  );
}
