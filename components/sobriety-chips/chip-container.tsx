'use client';

import React from 'react';
import { useChipEditor } from '@/hooks/useChipEditor';
import Chip from './chip';
import ChipEditButton from './chip-edit-button';
import ChipEditorModal from './chip-editor-modal';

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

interface ChipContainerProps {
  /**
   * Chip data from JSON
   */
  chipData: ChipData;
  /**
   * Index for unique identification
   */
  index: number;
  /**
   * Optional inspirational message to display below the chip
   */
  message?: string;
  /**
   * Optional custom name to personalize the congratulations message
   */
  name?: string;
  /**
   * Whether to show the congratulations message
   * @default true
   */
  showCongratulations?: boolean;
  /**
   * Display mode - compact shows only chip and title, full shows everything
   * @default "full"
   */
  displayMode?: "full" | "compact";
  /**
   * Custom CSS classes
   */
  className?: string;
}

const ChipContainer: React.FC<ChipContainerProps> = ({
  chipData,
  index,
  message,
  name = "friend",
  showCongratulations = true,
  displayMode = "full",
  className = ""
}) => {
  const { isEditorOpen, selectedChip, openEditor, closeEditor, handleChipSave } = useChipEditor();
  
  const handleEditClick = () => {
    openEditor(chipData);
  };
  // Generate inspirational messages based on milestone
  const getDefaultMessage = (chipData: ChipData): string => {
    const { chipNumber, chipText } = chipData;
    
    if (chipText === "hours") {
      return "Every journey begins with a single step. You've taken that step!";
    } else if (chipText === "days") {
      if (chipNumber === 1) return "The first day is always the hardest. You did it!";
      if (chipNumber <= 7) return "Each day is a victory. Keep going strong!";
      if (chipNumber === 30) return "A full month of sobriety - incredible progress!";
      if (chipNumber === 60) return "Two months of strength and determination!";
      if (chipNumber === 90) return "Three months of courage and commitment!";
      return `${chipNumber} days of incredible strength!`;
    } else if (chipText === "WEEK" || chipText === "weeks") {
      if (chipNumber === 1) return "One week of strength and determination!";
      return `${chipNumber} weeks of amazing progress!`;
    } else if (chipText === "month" || chipText === "months") {
      if (chipNumber === 1) return "One month - what an achievement!";
      if (chipNumber === 3) return "A quarter of a year - you're amazing!";
      if (chipNumber === 6) return "Half a year of incredible growth!";
      return `${chipNumber} months of dedication and strength!`;
    } else if (chipText === "year" || chipText === "years") {
      if (chipNumber === 1) return "One full year - you are a champion!";
      if (chipNumber === 5) return "Five years of transformation and growth!";
      if (chipNumber >= 10) return `${chipNumber} years - you're an inspiration to others!`;
      return `${chipNumber} years of incredible achievement!`;
    }
    
    return "Every milestone matters. Keep celebrating your journey!";
  };

  const inspirationalMessage = message || getDefaultMessage(chipData);

  if (displayMode === "compact") {
    return (
      <>
        <div 
          className={`bg-midnight-900/40 backdrop-blur-sm p-4 rounded-xl border border-midnight-700 hover:border-forest-600 transition-all duration-200 cursor-pointer relative ${className}`}
          onClick={handleEditClick}
        >
          <div className="max-w-xs mx-auto text-center">
            {/* Edit Button - Always visible */}
            <div className="absolute -top-2 -right-2 z-10" onClick={(e) => e.stopPropagation()}>
              <ChipEditButton onEdit={handleEditClick} size="sm" />
            </div>
            
            {/* Chip Component */}
            <div className="mb-3">
              <Chip 
                chip={{
                  ...chipData,
                  text: inspirationalMessage
                }} 
                type={chipData.id} 
                index={index}
              />
            </div>

            {/* Just the milestone title in compact mode */}
            <div className="text-center">
              <h3 className="text-sm font-heading font-semibold text-white">
                {chipData.chipNumber} {chipData.chipText}
              </h3>
              <p className="text-xs text-soft-sand-200 mt-1">
                {chipData.title}
              </p>
            </div>
          </div>
        </div>
        
        {/* Editor Modal */}
        {selectedChip && (
          <ChipEditorModal
            isOpen={isEditorOpen}
            onClose={closeEditor}
            chipData={selectedChip}
            onSave={handleChipSave}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div 
        className={`bg-midnight-900/40 backdrop-blur-sm p-6 rounded-xl border border-midnight-700 hover:border-forest-600 transition-all duration-200 cursor-pointer relative ${className}`}
        onClick={handleEditClick}
      >
        <div className="max-w-xs mx-auto">
          {/* Edit Button - Always visible */}
          <div className="absolute -top-2 -right-2 z-10" onClick={(e) => e.stopPropagation()}>
            <ChipEditButton onEdit={handleEditClick} size="md" showText />
          </div>
          
          {/* Congratulations Message */}
          {showCongratulations && (
            <div className="mb-6">
              <p className="text-2xl md:text-3xl font-heading font-semibold text-white text-center leading-tight">
                Congratulations {name} on {chipData.chipNumber} {chipData.chipText}
              </p>
            </div>
          )}
          
          {/* Chip Component */}
          <div 
            className="mb-4"
            style={{ '--chip-color': chipData.chipColor || '#22C55E' } as React.CSSProperties}
          >
            <Chip 
              chip={{
                ...chipData,
                text: inspirationalMessage // Add the required text property
              }} 
              type={chipData.id} 
              index={index}
            />
          </div>

          {/* Inspirational Message */}
          <div className="text-center">
            <p className="text-soft-sand-200 italic text-sm leading-relaxed">
              &ldquo;{inspirationalMessage}&rdquo;
            </p>
          </div>

          {/* Milestone Badge */}
          <div className="mt-4 text-center">
            <span className="inline-block px-3 py-1 bg-forest-700/50 text-soft-sand-200 text-xs rounded-full border border-forest-600">
              {chipData.title}
            </span>
          </div>
        </div>
      </div>
      
      {/* Editor Modal */}
      {selectedChip && (
        <ChipEditorModal
          isOpen={isEditorOpen}
          onClose={closeEditor}
          chipData={selectedChip}
          onSave={handleChipSave}
        />
      )}
    </>
  );
};

export default ChipContainer;