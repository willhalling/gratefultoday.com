'use client';

import React from 'react';
import { Button } from '@heroui/react';
import { Edit3 } from 'lucide-react';

interface ChipEditButtonProps {
  onEdit: (e?: React.MouseEvent) => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'solid' | 'bordered' | 'light' | 'flat' | 'faded' | 'shadow' | 'ghost';
  className?: string;
  showText?: boolean;
}

const ChipEditButton: React.FC<ChipEditButtonProps> = ({ 
  onEdit, 
  size = 'sm',
  variant = 'flat',
  className = '',
  showText = false
}) => {
  const handlePress = () => {
    onEdit();
  };

  return (
    <Button
      size={size}
      variant={variant}
      onPress={handlePress}
      startContent={<Edit3 size={14} />}
      className={`
        bg-forest-700/80 hover:bg-forest-600 
        text-white border-forest-600
        backdrop-blur-sm transition-all duration-200
        ${className}
      `}
    >
      {showText && 'Customize'}
    </Button>
  );
};

export default ChipEditButton;