'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { Button } from '@heroui/react';
import { Share2, Download } from 'lucide-react';
import { motion } from 'motion/react';
import Chip from '@/components/sobriety-chips/chip';
import type { SavedChip } from '@/lib/sobriety-chips';

interface ChipDisplayPageProps {
  chip: SavedChip;
}

export default function ChipDisplayPage({ chip }: ChipDisplayPageProps) {
  const snapshotRef = useRef<HTMLDivElement>(null);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${chip.recipientName || 'Someone'}'s ${chip.chipNumber} ${chip.chipText}`,
          text: chip.customText,
          url,
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard');
    }
  };

  const handleDownload = async () => {
    const snapshotContainer = snapshotRef.current;
    if (!snapshotContainer) return;

    try {
      const html2canvas = (await import('html2canvas')).default;
      
      const canvas = await html2canvas(snapshotContainer, {
        backgroundColor: null,
        scale: 2.16,
        useCORS: true,
        allowTaint: true,
      });

      const finalCanvas = document.createElement('canvas');
      const finalCtx = finalCanvas.getContext('2d');
      if (!finalCtx) return;

      finalCanvas.width = 1080;
      finalCanvas.height = 1080;
      
      const scale = Math.min(1080 / canvas.width, 1080 / canvas.height);
      const scaledWidth = canvas.width * scale;
      const scaledHeight = canvas.height * scale;
      const x = (1080 - scaledWidth) / 2;
      const y = (1080 - scaledHeight) / 2;
      
      finalCtx.fillStyle = '#000000';
      finalCtx.fillRect(0, 0, 1080, 1080);
      finalCtx.drawImage(canvas, x, y, scaledWidth, scaledHeight);

      const link = document.createElement('a');
      link.download = `${chip.recipientName ? `${chip.recipientName}-` : ''}sobriety-chip.png`;
      link.href = finalCanvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const chipData = {
    id: chip.chipId,
    chipNumber: chip.chipNumber,
    chipText: chip.chipText,
    chipColor: chip.chipColor,
    chipNumberX: chip.chipNumberX,
    chipNumberY: chip.chipNumberY,
    chipTextX: chip.chipTextX,
    chipTextY: chip.chipTextY,
    title: `${chip.chipNumber} ${chip.chipText}`,
    order: 0,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-8">
        {/* Coin Display */}
        <motion.div 
          ref={snapshotRef}
          className="relative aspect-square w-full max-w-md mx-auto rounded-xl overflow-hidden shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #0f0f23 50%, #1e1b4b 100%)'
          }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
            {chip.recipientName && (
              <motion.h2 
                className="text-2xl md:text-3xl font-bold text-white mb-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
              >
                {chip.recipientName}
              </motion.h2>
            )}

            <motion.div 
              className="w-48 h-48 mb-6"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
            >
              <Chip chipData={chipData} index={0} />
            </motion.div>

            <motion.p 
              className="text-xl md:text-2xl font-semibold text-white mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
            >
              {chip.customText}
            </motion.p>

            {chip.personalMessage && (
              <motion.p 
                className="text-sm md:text-base text-neutral-200 italic max-w-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4, ease: 'easeOut' }}
              >
                &ldquo;{chip.personalMessage}&rdquo;
              </motion.p>
            )}
          </div>
        </motion.div>

        {/* CTAs */}
        <motion.div 
          className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: 'easeOut' }}
        >
          <Button
            onClick={handleDownload}
            className="flex-1 bg-primary hover:bg-primary-600 text-neutral-900"
            size="lg"
            radius="full"
            startContent={<Download className="w-5 h-5" />}
          >
            Claim chip
          </Button>
          <Button
            onClick={handleShare}
            variant="bordered"
            className="flex-1 border-neutral-300 text-neutral-700 hover:bg-neutral-50"
            size="lg"
            radius="full"
            startContent={<Share2 className="w-5 h-5" />}
          >
            Share
          </Button>
        </motion.div>

        {/* Footer Link */}
        <motion.div 
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6, ease: 'easeOut' }}
        >
          <Link 
            href="/sobriety-chips" 
            className="text-sm text-neutral-600 hover:text-primary transition-colors"
          >
            Create your own chip
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
