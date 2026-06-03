'use client';

import { useState, useCallback } from 'react';

interface ChipData {
  id: string;
  chipNumber: number;
  chipText: string;
  chipNumberX: number;
  chipNumberY: number;
  chipTextX: number;
  chipTextY: number;
  title: string;
  order: number;
  type?: string;
  chipColor?: string;
  backgroundColour?: string;
}

interface UseChipEditorReturn {
  isEditorOpen: boolean;
  selectedChip: ChipData | null;
  openEditor: (chip: ChipData) => void;
  closeEditor: () => void;
  handleChipSave: (editedChip: ChipData, customText: string) => void;
}

export const useChipEditor = (): UseChipEditorReturn => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedChip, setSelectedChip] = useState<ChipData | null>(null);

  const openEditor = useCallback((chip: ChipData) => {
    setSelectedChip(chip);
    setIsEditorOpen(true);
  }, []);

  const closeEditor = useCallback(() => {
    setIsEditorOpen(false);
    setSelectedChip(null);
  }, []);

  const handleChipSave = useCallback((editedChip: ChipData, customText: string) => {
    // Here you could implement save functionality
    // For now, we'll just log the data
    console.log('Chip saved:', { editedChip, customText });
    
    // You could dispatch to a context, make an API call, etc.
    // Example: saveChipToStorage(editedChip, customText);
    
    closeEditor();
  }, [closeEditor]);

  return {
    isEditorOpen,
    selectedChip,
    openEditor,
    closeEditor,
    handleChipSave,
  };
};