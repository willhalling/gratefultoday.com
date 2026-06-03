import React, { useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import Chip from './chip';

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

interface ChipCanvasProps {
  chipData: ChipData;
  customText: string;
  recipientName?: string;
  personalMessage?: string;
  colorScheme: string;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

const colorSchemes: Record<string, { color: string; secondary: string; accent: string }> = {
  forest: { color: '#013328', secondary: '#E3DCD2', accent: '#CC8B65' },
  terracotta: { color: '#CC8B65', secondary: '#E3DCD2', accent: '#013328' },
  midnight: { color: '#100C0D', secondary: '#E3DCD2', accent: '#CC8B65' },
  sand: { color: '#E3DCD2', secondary: '#013328', accent: '#CC8B65' },
  gold: { color: '#FFD700', secondary: '#100C0D', accent: '#013328' },
  silver: { color: '#C0C0C0', secondary: '#100C0D', accent: '#013328' },
  emerald: { color: '#50C878', secondary: '#E3DCD2', accent: '#013328' },
  ruby: { color: '#E0115F', secondary: '#E3DCD2', accent: '#013328' },
};

const ChipCanvas: React.FC<ChipCanvasProps> = ({
  chipData,
  customText,
  recipientName,
  personalMessage,
  colorScheme,
  onCanvasReady
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const generateCanvas = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size for 9:16 aspect ratio
      canvas.width = 1080;
      canvas.height = 1920;

      const colors = colorSchemes[colorScheme];

      // Clear canvas with gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, colors.color);
      gradient.addColorStop(0.5, `${colors.color}E6`);
      gradient.addColorStop(1, colors.color);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Calculate layout
      const centerY = canvas.height / 2;
      const chipSize = 400;
      const spacing = 120;
      
      // Helper function to wrap text
      const wrapText = (text: string, maxWidth: number, fontSize: number): string[] => {
        ctx.font = `bold ${fontSize}px Playfair Display, serif`;
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';
        
        for (const word of words) {
          const testLine = currentLine + word + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && currentLine !== '') {
            lines.push(currentLine.trim());
            currentLine = word + ' ';
          } else {
            currentLine = testLine;
          }
        }
        lines.push(currentLine.trim());
        return lines;
      };

      // Draw main text at top
      ctx.fillStyle = colors.secondary;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const textLines = wrapText(customText, 900, 56);
      const textHeight = textLines.length * 70;
      let textY = centerY - (chipSize / 2) - spacing - textHeight / 2;
      
      for (const line of textLines) {
        ctx.font = 'bold 56px Playfair Display, serif';
        ctx.fillText(line, canvas.width / 2, textY);
        textY += 70;
      }

      // Draw recipient name
      if (recipientName) {
        ctx.font = 'bold 44px Playfair Display, serif';
        ctx.fillStyle = colors.accent;
        ctx.fillText(recipientName, canvas.width / 2, textY + 30);
      }

      // Take a screenshot of the actual chip element using html2canvas
      try {
        // Find the actual chip element that's rendered on the page
        const chipElement = document.querySelector('.chip-for-canvas') as HTMLElement;
        
        if (chipElement) {
          // Take a screenshot of the chip element
          const chipCanvas = await html2canvas(chipElement, {
            backgroundColor: null,
            scale: 1,
            useCORS: true,
            allowTaint: true,
            logging: false,
            width: chipElement.offsetWidth,
            height: chipElement.offsetHeight
          });
          
          // Draw the chip screenshot on main canvas centered
          const chipX = (canvas.width - chipSize) / 2;
          const chipY = centerY - chipSize / 2;
          ctx.drawImage(chipCanvas, chipX, chipY, chipSize, chipSize);
        } else {
          throw new Error('Chip element not found');
        }
        
      } catch (error) {
        console.error('Error capturing chip with html2canvas:', error);
        
        // Fallback: draw simple chip
        ctx.beginPath();
        ctx.arc(canvas.width / 2, centerY, chipSize / 2, 0, 2 * Math.PI);
        ctx.fillStyle = colors.secondary;
        ctx.fill();
        ctx.strokeStyle = colors.accent;
        ctx.lineWidth = 8;
        ctx.stroke();

        // Fallback chip text
        ctx.fillStyle = colors.color;
        ctx.font = 'bold 80px Playfair Display, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(chipData.chipNumber.toString(), canvas.width / 2, centerY - 20);
        
        ctx.font = 'bold 24px Playfair Display, serif';
        ctx.fillText(chipData.chipText.toUpperCase(), canvas.width / 2, centerY + 40);
      }

      // Draw personal message
      if (personalMessage) {
        ctx.fillStyle = colors.secondary;
        ctx.font = 'italic 32px Playfair Display, serif';
        ctx.textAlign = 'center';
        
        const messageLines = wrapText(`"${personalMessage}"`, 800, 32);
        let messageY = centerY + chipSize / 2 + spacing + 40;
        
        for (const line of messageLines) {
          ctx.fillText(line, canvas.width / 2, messageY);
          messageY += 45;
        }
      }

      // Draw milestone badge
      const badgeY = personalMessage ? 
        centerY + chipSize / 2 + spacing + 200 : 
        centerY + chipSize / 2 + spacing + 60;
      
      // Badge background
      ctx.fillStyle = `${colors.accent}80`;
      const badgeWidth = ctx.measureText(chipData.title).width + 48;
      ctx.fillRect((canvas.width - badgeWidth) / 2, badgeY - 20, badgeWidth, 40);
      
      // Badge text
      ctx.fillStyle = colors.secondary;
      ctx.font = 'bold 28px Playfair Display, serif';
      ctx.fillText(chipData.title, canvas.width / 2, badgeY);

      // Draw branding
      ctx.fillStyle = `${colors.secondary}99`;
      ctx.font = '22px Playfair Display, serif';
      ctx.fillText('Created with GratefulToday.com', canvas.width / 2, canvas.height - 80);

      // Draw decorative lines
      ctx.strokeStyle = `${colors.accent}66`;
      ctx.lineWidth = 3;
      
      // Top line
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2 - 150, textY - 60);
      ctx.lineTo(canvas.width / 2 + 150, textY - 60);
      ctx.stroke();
      
      // Bottom line
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2 - 150, badgeY + 60);
      ctx.lineTo(canvas.width / 2 + 150, badgeY + 60);
      ctx.stroke();

      if (onCanvasReady) {
        onCanvasReady(canvas);
      }
    };

    generateCanvas();
  }, [chipData, customText, recipientName, personalMessage, colorScheme, onCanvasReady]);

  return (
    <div>
      <canvas
        ref={canvasRef}
        className="hidden" // Hidden as it's just for generation
        width={1080}
        height={1920}
      />
      
      {/* Render the actual chip component for html2canvas to capture */}
      <div className="chip-for-canvas" style={{ 
        width: '400px', 
        height: '400px', 
        position: 'absolute', 
        top: '10px', 
        left: '10px',
        background: 'white',
        padding: '20px'
      }}>
        <Chip 
          chip={{
            chipNumber: chipData.chipNumber,
            chipText: chipData.chipText,
            chipNumberX: chipData.chipNumberX,
            chipNumberY: chipData.chipNumberY,
            chipTextX: chipData.chipTextX,
            chipTextY: chipData.chipTextY,
            text: chipData.title
          }}
          type="canvas"
          index={0}
        />
      </div>
    </div>
  );
};

export default ChipCanvas;