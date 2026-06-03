"use client";

import React, { useState, useCallback } from 'react';
import { 
  Modal, 
  ModalContent, 
  ModalHeader, 
  ModalBody, 
  ModalFooter, 
  Button, 
  Input, 
  Textarea, 
  Card,
  CardBody,
  Divider
} from '@heroui/react';

import { Download, Share2, RotateCw } from 'lucide-react';
import Chip from './chip';
import styles from './chip-editor-modal.module.css';

// Define 10 themed color schemes
interface ColorTheme {
  id: string;
  name: string;
  chipColor: string;
  textColor: string;
  backgroundGradient: string;
}

const COLOR_THEMES: ColorTheme[] = [
  {
    id: 'emerald',
    name: 'Emerald',
    chipColor: '#10B981',
    textColor: '#FFFFFF',
    backgroundGradient: 'linear-gradient(135deg, #1e1b4b 0%, #0f0f23 50%, #1e1b4b 100%)'
  },
  {
    id: 'gold',
    name: 'Gold',
    chipColor: '#F59E0B',
    textColor: '#FFFFFF',
    backgroundGradient: 'linear-gradient(135deg, #1c1917 0%, #0c0a09 50%, #1c1917 100%)'
  },
  {
    id: 'ruby',
    name: 'Ruby',
    chipColor: '#DC2626',
    textColor: '#FFFFFF',
    backgroundGradient: 'linear-gradient(135deg, #4c1d95 0%, #2e1065 50%, #4c1d95 100%)'
  },
  {
    id: 'sapphire',
    name: 'Sapphire',
    chipColor: '#0284C7',
    textColor: '#FFFFFF',
    backgroundGradient: 'linear-gradient(135deg, #172554 0%, #0f172a 50%, #172554 100%)'
  },
  {
    id: 'amethyst',
    name: 'Amethyst',
    chipColor: '#7C3AED',
    textColor: '#FFFFFF',
    backgroundGradient: 'linear-gradient(135deg, #581c87 0%, #3b0764 50%, #581c87 100%)'
  },
  {
    id: 'copper',
    name: 'Copper',
    chipColor: '#EA580C',
    textColor: '#FFFFFF',
    backgroundGradient: 'linear-gradient(135deg, #292524 0%, #1c1917 50%, #292524 100%)'
  },
  {
    id: 'platinum',
    name: 'Platinum',
    chipColor: '#6B7280',
    textColor: '#FFFFFF',
    backgroundGradient: 'linear-gradient(135deg, #374151 0%, #1f2937 50%, #374151 100%)'
  },
  {
    id: 'rose',
    name: 'Rose',
    chipColor: '#E11D48',
    textColor: '#FFFFFF',
    backgroundGradient: 'linear-gradient(135deg, #881337 0%, #4c0519 50%, #881337 100%)'
  },
  {
    id: 'jade',
    name: 'Jade',
    chipColor: '#059669',
    textColor: '#FFFFFF',
    backgroundGradient: 'linear-gradient(135deg, #14532d 0%, #052e16 50%, #14532d 100%)'
  },
  {
    id: 'bronze',
    name: 'Bronze',
    chipColor: '#B45309',
    textColor: '#FFFFFF',
    backgroundGradient: 'linear-gradient(135deg, #451a03 0%, #292524 50%, #451a03 100%)'
  }
];

// Congratulations text variations
const getCongratulationsVariations = (chipNumber: number, chipText: string) => [
  `Congratulations on ${chipNumber} ${chipText}`,
  `Celebrating ${chipNumber} ${chipText} of sobriety`,
  `${chipNumber} ${chipText} strong and counting`,
  `Proud of your ${chipNumber} ${chipText} milestone`,
  `Amazing ${chipNumber} ${chipText} achievement`,
  `${chipNumber} ${chipText} of incredible progress`,
  `Honoring your ${chipNumber} ${chipText} journey`,
  `Cheers to ${chipNumber} ${chipText} sober`,
  `Inspiring ${chipNumber} ${chipText} of recovery`,
  `Remarkable ${chipNumber} ${chipText} milestone`
];

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

interface ChipEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  chipData: ChipData;
  onSave?: (editedChipData: ChipData, customText: string) => void;
}



const ChipEditorModal: React.FC<ChipEditorModalProps> = ({
  isOpen,
  onClose,
  chipData,
  onSave
}) => {
  const [editedChip, setEditedChip] = useState<ChipData>(chipData);
  const [congratulationsVariations] = useState(() => getCongratulationsVariations(chipData.chipNumber, chipData.chipText));
  const [currentVariationIndex, setCurrentVariationIndex] = useState(0);
  const [customText, setCustomText] = useState(() => getCongratulationsVariations(chipData.chipNumber, chipData.chipText)[0]);
  const [selectedTheme, setSelectedTheme] = useState<ColorTheme>(COLOR_THEMES[0]); // Default to Emerald
  const [recipientName, setRecipientName] = useState('');
  const [personalMessage, setPersonalMessage] = useState('');

    const handleThemeChange = (theme: ColorTheme) => {
    console.log('Theme changed to:', theme.name);
    setSelectedTheme(theme);
    
    setEditedChip({
      ...editedChip,
      chipColor: theme.chipColor,
      backgroundColour: theme.chipColor
    });
  };

  const cycleCongratulationsText = () => {
    const nextIndex = (currentVariationIndex + 1) % congratulationsVariations.length;
    setCurrentVariationIndex(nextIndex);
    setCustomText(congratulationsVariations[nextIndex]);
  };



  const handleSave = () => {
    if (onSave) {
      onSave(editedChip, customText);
    }
  };

  const handleDownload = async () => {
    const snapshotContainer = document.getElementById('snapshot');
    if (!snapshotContainer) {
      console.error('Snapshot container not found');
      return;
    }

    try {
      console.log('Trying html2canvas method...');
      console.log('Container dimensions:', snapshotContainer.offsetWidth, 'x', snapshotContainer.offsetHeight);
      
      // Try html2canvas for full snapshot with background and text
      const html2canvas = (await import('html2canvas')).default;
      
      const canvas = await html2canvas(snapshotContainer, {
        backgroundColor: null,
        scale: 2.16, // Scale to get 1080x1080 from container (assuming ~500px container)
        useCORS: true,
        allowTaint: true,
        logging: true, // Enable logging
        width: snapshotContainer.offsetWidth,
        height: snapshotContainer.offsetHeight
      });

      console.log('html2canvas success! Canvas size:', canvas.width, 'x', canvas.height);

      // Create a new 1080x1080 canvas and draw the result centered
      const finalCanvas = document.createElement('canvas');
      const finalCtx = finalCanvas.getContext('2d');
      if (!finalCtx) {
        console.error('Could not get final canvas context');
        return;
      }

      finalCanvas.width = 1080;
      finalCanvas.height = 1080;
      
      // Calculate scaling and positioning to fit content in 1080x1080
      const scale = Math.min(1080 / canvas.width, 1080 / canvas.height);
      const scaledWidth = canvas.width * scale;
      const scaledHeight = canvas.height * scale;
      const x = (1080 - scaledWidth) / 2;
      const y = (1080 - scaledHeight) / 2;
      
      // Fill background with black
      finalCtx.fillStyle = '#000000';
      finalCtx.fillRect(0, 0, 1080, 1080);
      
      // Draw the scaled content
      finalCtx.drawImage(canvas, x, y, scaledWidth, scaledHeight);

      // Create download link
      const link = document.createElement('a');
      link.download = `${recipientName ? `${recipientName}-` : ''}sobriety-chip-${editedChip.chipNumber}-${editedChip.chipText}.png`;
      link.href = finalCanvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (html2canvasError) {
      console.error('html2canvas failed:', html2canvasError);
      
      // FALLBACK: Use our working SVG method
      try {
        console.log('Trying SVG fallback method...');
        
        const svgElement = snapshotContainer.querySelector('svg');
        console.log('Found SVG element:', svgElement);
        
        if (!svgElement) {
          console.error('SVG fallback failed: no SVG found');
          return;
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          console.error('Could not get canvas context');
          return;
        }

        const targetWidth = 1080;
        const targetHeight = 1080; // Changed to 1080x1080
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        ctx.clearRect(0, 0, targetWidth, targetHeight);
        
        // Fill background with black
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        // Our working SVG serialization method
        const svgData = new XMLSerializer().serializeToString(svgElement);
        console.log('Serialized SVG length:', svgData.length);
        
        const img = new Image();
        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);

        img.onload = () => {
          console.log('SVG image loaded successfully');
          const chipSize = Math.min(targetWidth, targetHeight) * 0.8;
          const x = (targetWidth - chipSize) / 2;
          const y = (targetHeight - chipSize) / 2;
          
          console.log('Drawing image at:', x, y, 'size:', chipSize);
          ctx.drawImage(img, x, y, chipSize, chipSize);

          const dataUrl = canvas.toDataURL('image/png');
          console.log('Generated data URL length:', dataUrl.length);

          const link = document.createElement('a');
          link.download = `${recipientName ? `${recipientName}-` : ''}sobriety-chip-${editedChip.chipNumber}-${editedChip.chipText}.png`;
          link.href = dataUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        };

        img.onerror = (error) => {
          console.error('SVG image failed to load:', error);
        };

      } catch (svgError) {
        console.error('SVG fallback failed:', svgError);
      }
    }
  };

  const handleWhatsAppShare = async () => {
    const snapshotContainer = document.getElementById('snapshot');
    if (!snapshotContainer) {
      console.error('Snapshot container not found');
      return;
    }

    try {
      console.log('Generating PNG for WhatsApp share...');
      
      // Use the SAME method as handleDownload to generate PNG
      const html2canvas = (await import('html2canvas')).default;
      
      const canvas = await html2canvas(snapshotContainer, {
        backgroundColor: null,
        scale: 2.16, // Same scale as download
        useCORS: true,
        allowTaint: true,
        logging: true,
        width: snapshotContainer.offsetWidth,
        height: snapshotContainer.offsetHeight
      });

      console.log('html2canvas success! Canvas size:', canvas.width, 'x', canvas.height);

      // Create a new 1080x1080 canvas and draw the result centered (same as download)
      const finalCanvas = document.createElement('canvas');
      const finalCtx = finalCanvas.getContext('2d');
      if (!finalCtx) {
        console.error('Could not get final canvas context');
        return;
      }

      finalCanvas.width = 1080;
      finalCanvas.height = 1080;
      
      // Calculate scaling and positioning to fit content in 1080x1080
      const scale = Math.min(1080 / canvas.width, 1080 / canvas.height);
      const scaledWidth = canvas.width * scale;
      const scaledHeight = canvas.height * scale;
      const x = (1080 - scaledWidth) / 2;
      const y = (1080 - scaledHeight) / 2;
      
      // Fill background with black
      finalCtx.fillStyle = '#000000';
      finalCtx.fillRect(0, 0, 1080, 1080);
      
      // Draw the scaled content
      finalCtx.drawImage(canvas, x, y, scaledWidth, scaledHeight);

      // Convert to blob for sharing
      finalCanvas.toBlob(async (blob) => {
        if (!blob) {
          console.error('Failed to create blob');
          return;
        }

        // Create file for sharing
        const fileName = `${recipientName ? `${recipientName}-` : ''}sobriety-chip-${editedChip.chipNumber}-${editedChip.chipText}.png`;
        const file = new File([blob], fileName, { type: 'image/png' });
        
        // Try Web Share API
        if (navigator.share) {
          try {
            await navigator.share({
              files: [file],
              title: customText,
              text: personalMessage || 'Celebrating my sobriety milestone! 🎉'
            });
            console.log('Successfully shared via Web Share API');
            return;
          } catch (shareError) {
            console.log('Web Share API failed:', shareError);
          }
        }

        // Fallback: Download and show instructions
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        alert('Image saved to downloads! You can now share it on WhatsApp by selecting the downloaded image from your gallery.');
        
      }, 'image/png');

    } catch (html2canvasError) {
      console.error('html2canvas failed:', html2canvasError);
      
      // Use SVG fallback (same as download function)
      try {
        console.log('Trying SVG fallback method...');
        
        const svgElement = snapshotContainer.querySelector('svg');
        if (!svgElement) {
          console.error('No SVG element found');
          return;
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          console.error('Could not get canvas context');
          return;
        }

        canvas.width = 1080;
        canvas.height = 1080;
        ctx.clearRect(0, 0, 1080, 1080);

        const svgData = new XMLSerializer().serializeToString(svgElement);
        const img = new Image();
        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);

        img.onload = () => {
          const chipSize = Math.min(1080, 1080) * 0.8;
          const x = (1080 - chipSize) / 2;
          const y = (1080 - chipSize) / 2;
          ctx.drawImage(img, x, y, chipSize, chipSize);

          canvas.toBlob(async (blob) => {
            if (!blob) return;

            const fileName = `${recipientName ? `${recipientName}-` : ''}sobriety-chip-${editedChip.chipNumber}-${editedChip.chipText}.png`;
            const file = new File([blob], fileName, { type: 'image/png' });
            
            if (navigator.share) {
              try {
                await navigator.share({
                  files: [file],
                  title: customText,
                  text: personalMessage || 'Celebrating my sobriety milestone! 🎉'
                });
                return;
              } catch (shareError) {
                console.log('Web Share API failed:', shareError);
              }
            }

            // Fallback download
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            alert('Image saved to downloads! You can now share it on WhatsApp by selecting the downloaded image from your gallery.');
          }, 'image/png');
        };

        img.onerror = (error) => {
          console.error('SVG image failed to load:', error);
        };

      } catch (svgError) {
        console.error('SVG fallback failed:', svgError);
      }
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      size="5xl"
      scrollBehavior="inside"
      classNames={{
        base: "bg-neutral-50",
        backdrop: "bg-black/80",
        header: "border-b border-neutral-200",
        footer: "border-t border-neutral-200"
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <h2 className="text-2xl font-heading font-bold text-neutral-900">
            Customize Your Sobriety Chip
          </h2>
          <p className="text-neutral-600 text-sm">
            Personalize your milestone celebration
          </p>
        </ModalHeader>
        
        <ModalBody className="py-6">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left Column - Preview */}
            <div className="space-y-6">
              <Card className="bg-white border border-neutral-200">
                <CardBody className="p-6">
                  <h3 className="text-lg font-heading font-semibold text-neutral-900 mb-4 text-center">
                    Preview
                  </h3>
                  
                  {/* 9:16 Aspect Ratio Container */}
                  <div 
                    id='snapshot' 
                    className={styles.snapshot}
                    style={{
                      '--background-gradient': selectedTheme.backgroundGradient
                    } as React.CSSProperties}
                  >
                    {/* Top Section - Custom Text */}
                    <div className={styles.topSection}>
                      <p className={styles.customText}>
                        {customText}
                      </p>
                      {recipientName && (
                        <p className={styles.recipientName}>
                          {recipientName}
                        </p>
                      )}
                    </div>
                    
                    {/* Middle Section - Chip Preview */}
                    <div className={styles.middleSection}>
                      <div className={styles.chipContainer}>
                        <div 
                          style={{ 
                            '--chip-color': selectedTheme.chipColor,
                            '--text-color': selectedTheme.textColor
                          } as React.CSSProperties}
                          data-chip-color={selectedTheme.chipColor}
                          data-text-color={selectedTheme.textColor}
                        >
                          <Chip
                            chip={{
                              ...editedChip,
                              text: personalMessage || 'Celebrate your journey!'
                            }}
                            type={`preview_${editedChip.id}`}
                            index={0}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Bottom Section */}
                    <div className={styles.bottomSection}>
                      {/* Personal Message */}
                      {personalMessage && (
                        <p className={styles.personalMessage}>
                          &ldquo;{personalMessage}&rdquo;
                        </p>
                      )}
                      
                      {/* Branding */}
                      <p className={styles.branding}>
                        Created with GratefulToday.com
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* Right Column - Customization Options */}
            <div className="space-y-6">
              {/* Text Customization */}
              <Card className="bg-white border border-neutral-200">
                <CardBody className="p-6">
                  <h3 className="text-lg font-heading font-semibold text-neutral-900 mb-4">
                    Personalize Text
                  </h3>
                  
                  <div className="space-y-4">
                    <Input
                      label="Recipient Name"
                      placeholder="Enter recipient's name"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      classNames={{
                        input: "text-neutral-900",
                        label: "text-neutral-700"
                      }}
                    />
                    
                    <Input
                      label="Main Congratulations Text"
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      endContent={
                        <Button
                          isIconOnly
                          variant="flat"
                          size="sm"
                          onPress={cycleCongratulationsText}
                          className="text-neutral-600 hover:text-neutral-800 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 transition-all"
                          title="Cycle through different congratulations messages"
                        >
                          <RotateCw size={16} />
                        </Button>
                      }
                      classNames={{
                        input: "text-neutral-900",
                        label: "text-neutral-700"
                      }}
                    />
                    
                    <p className="text-xs text-neutral-300 -mt-2 flex items-center gap-2">
                      <RotateCw size={12} />
                      Variation {currentVariationIndex + 1} of {congratulationsVariations.length}
                    </p>
                    
                    <Textarea
                      label="Personal Message"
                      placeholder="Add an inspiring message..."
                      value={personalMessage}
                      onChange={(e) => setPersonalMessage(e.target.value)}
                      maxRows={3}
                      classNames={{
                        input: "text-neutral-900",
                        label: "text-neutral-700"
                      }}
                    />
                  </div>
                </CardBody>
              </Card>

              {/* Theme Selection */}
              <Card className="bg-white border border-neutral-200">
                <CardBody className="p-6">
                  <h3 className="text-lg font-heading font-semibold text-neutral-900 mb-4">
                    Color Theme
                  </h3>
                  
                  <div className="grid grid-cols-5 gap-3">
                    {COLOR_THEMES.map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => handleThemeChange(theme)}
                        className={`
                          group relative aspect-square rounded-lg overflow-hidden border-2 transition-all
                          ${selectedTheme.id === theme.id 
                            ? 'border-white scale-105 shadow-lg' 
                            : 'border-transparent hover:border-white/50 hover:scale-102'
                          }
                        `}
                        style={{ background: theme.backgroundGradient }}
                        title={theme.name}
                      >
                        {/* Mini chip preview */}
                        <div className="absolute inset-2 flex items-center justify-center">
                          <div 
                            className="w-6 h-6 rounded-full border border-white/20"
                            style={{ backgroundColor: theme.chipColor }}
                          />
                        </div>
                        
                        {/* Theme name label */}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-xs text-white text-center py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {theme.name}
                        </div>
                      </button>
                    ))}
                  </div>
                  
                </CardBody>
              </Card>

              {/* Milestone Information */}
              <Card className="bg-white border border-neutral-200">
                <CardBody className="p-6">
                  <h3 className="text-lg font-heading font-semibold text-neutral-900 mb-4">
                    Milestone Details
                  </h3>
                  
                  <div className="space-y-2 text-neutral-700">
                    <p><span className="font-medium">Achievement:</span> {chipData.title}</p>
                    <p><span className="font-medium">Duration:</span> {chipData.chipNumber} {chipData.chipText}</p>
                    <p><span className="font-medium">Milestone Type:</span> {chipData.type || 'Standard'}</p>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        </ModalBody>
        
        <ModalFooter className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="light"
            onPress={onClose}
            className="text-neutral-700 hover:bg-neutral-100"
          >
            Cancel
          </Button>
          
          <div className="flex gap-2">
            <Button
              color="primary"
              variant="solid"
              startContent={<Download size={16} />}
              onPress={handleDownload}
              className="bg-primary hover:bg-primary-hover"
            >
              Download
            </Button>
            
            <Button
              color="secondary"
              variant="solid"
              startContent={<Share2 size={16} />}
              onPress={handleWhatsAppShare}
              className="bg-accent hover:bg-accent-600"
            >
              Share on WhatsApp
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ChipEditorModal;