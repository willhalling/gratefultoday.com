'use client';

import { Input } from '@heroui/react';
import React from 'react';
import { IoSearch } from 'react-icons/io5';

interface SearchBoxProps {
  /**
   * Current search value
   */
  value: string;
  /**
   * Callback when search value changes
   */
  onValueChange: (value: string) => void;
  /**
   * Placeholder text for the search input
   */
  placeholder?: string;
  /**
   * Size of the search input
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Theme variant for styling
   */
  variant?: 'default' | 'forest' | 'light' | 'primary';
}

const SearchBox: React.FC<SearchBoxProps> = ({
  value,
  onValueChange,
  placeholder = 'Search...',
  size = 'lg',
  className = '',
  variant = 'forest',
}) => {
  const variantStyles = {
    default: {
      base: 'bg-neutral-200/10 backdrop-blur-sm',
      input: 'text-white placeholder:text-neutral-400',
      inputWrapper: 'border-neutral-400/30 hover:border-neutral-300/50',
    },
    primary: {
      base: 'w-full',
      input: 'text-neutral-900 placeholder:text-neutral-600',
      inputWrapper:
        'bg-white border-neutral-300 hover:bg-neutral-50 hover:border-primary focus-within:bg-white focus-within:border-primary',
    },
    forest: {
      base: 'w-full',
      input: 'text-white placeholder:text-neutral-600 !text-white',
      inputWrapper:
        'bg-primary-900/50 border-primary-700 hover:bg-primary-900/60 hover:border-primary-600 focus-within:bg-primary-900/60 focus-within:border-primary-500 data-[hover=true]:bg-primary-900/60',
    },
    light: {
      base: 'bg-white/90 backdrop-blur-sm',
      input: 'text-neutral-900 placeholder:text-neutral-600',
      inputWrapper: 'border-neutral-300/50 hover:border-neutral-400/70',
    },
  };

  const currentStyles = variantStyles[variant];

  return (
    <div className={className}>
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onValueChange={onValueChange}
        startContent={<IoSearch className="w-5 h-5 text-neutral-400" />}
        classNames={{
          base: currentStyles.base,
          mainWrapper: 'w-full',
          input: currentStyles.input,
          inputWrapper: currentStyles.inputWrapper,
        }}
        size={size}
        radius="full"
      />
    </div>
  );
};

export default SearchBox;
