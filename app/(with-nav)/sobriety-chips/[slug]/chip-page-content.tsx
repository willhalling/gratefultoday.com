'use client';

import { Button, Input, Textarea, Card, CardBody } from '@heroui/react';
import { RotateCw, Share2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import Chip from '@/components/sobriety-chips/chip';
import { saveChip } from '@/lib/sobriety-chips';

interface ChipPageContentProps {
  initialChipData: any;
  inspirationMessage: string;
}

// Define color themes
interface ColorTheme {
  id: string;
  name: string;
  chipColor: string;
  textColor: string;
}

const COLOR_THEMES: ColorTheme[] = [
  { id: 'emerald', name: 'Emerald', chipColor: '#10B981', textColor: '#FFFFFF' },
  { id: 'gold', name: 'Gold', chipColor: '#F59E0B', textColor: '#FFFFFF' },
  { id: 'ruby', name: 'Ruby', chipColor: '#DC2626', textColor: '#FFFFFF' },
  { id: 'sapphire', name: 'Sapphire', chipColor: '#0284C7', textColor: '#FFFFFF' },
  { id: 'amethyst', name: 'Amethyst', chipColor: '#7C3AED', textColor: '#FFFFFF' },
  { id: 'copper', name: 'Copper', chipColor: '#EA580C', textColor: '#FFFFFF' },
  { id: 'platinum', name: 'Platinum', chipColor: '#6B7280', textColor: '#FFFFFF' },
  { id: 'rose', name: 'Rose', chipColor: '#E11D48', textColor: '#FFFFFF' },
  { id: 'jade', name: 'Jade', chipColor: '#059669', textColor: '#FFFFFF' },
  { id: 'bronze', name: 'Bronze', chipColor: '#B45309', textColor: '#FFFFFF' },
];

const getCongratulationsVariations = (chipNumber: number, chipText: string) => [
  `${chipNumber} ${chipText}`,
  `${chipNumber} ${chipText} here`,
  `${chipNumber} ${chipText} counted`,
  `${chipNumber} ${chipText} chosen`,
  `${chipNumber} ${chipText} present`,
  `${chipNumber} ${chipText} today`,
  `${chipNumber} ${chipText} and still here`,
  `${chipNumber} ${chipText} of showing up`,
  `${chipNumber} ${chipText} matters`,
  `${chipNumber} ${chipText} kept`,
];

export default function ChipPageContent({
  initialChipData,
  inspirationMessage,
}: ChipPageContentProps) {
  const router = useRouter();
  const snapshotRef = useRef<HTMLDivElement>(null);
  const [chipData, setChipData] = useState(initialChipData);
  const [selectedTheme, setSelectedTheme] = useState<ColorTheme>(
    COLOR_THEMES.find((t) => t.chipColor === initialChipData.chipColor) || COLOR_THEMES[0]
  );
  const [congratulationsVariations] = useState(() =>
    getCongratulationsVariations(initialChipData.chipNumber, initialChipData.chipText)
  );
  const [currentVariationIndex, setCurrentVariationIndex] = useState(0);
  const [customText, setCustomText] = useState(congratulationsVariations[0]);
  const [recipientName, setRecipientName] = useState('');
  const [personalMessage, setPersonalMessage] = useState(inspirationMessage);
  const [isSaving, setIsSaving] = useState(false);

  const handleThemeChange = (theme: ColorTheme) => {
    setSelectedTheme(theme);
    setChipData({
      ...chipData,
      chipColor: theme.chipColor,
    });
  };

  const cycleCongratulationsText = () => {
    const nextIndex = (currentVariationIndex + 1) % congratulationsVariations.length;
    setCurrentVariationIndex(nextIndex);
    setCustomText(congratulationsVariations[nextIndex]);
  };

  const handleGenerateCoin = async () => {
    setIsSaving(true);
    try {
      const chipId = await saveChip({
        chipId: chipData.id,
        chipNumber: chipData.chipNumber,
        chipText: chipData.chipText,
        chipColor: chipData.chipColor,
        chipNumberX: chipData.chipNumberX,
        chipNumberY: chipData.chipNumberY,
        chipTextX: chipData.chipTextX,
        chipTextY: chipData.chipTextY,
        recipientName,
        customText,
        personalMessage,
      });

      // Navigate to the generated chip page
      // Keep loading state active until navigation completes
      router.push(`/c/${chipId}`);
    } catch (error) {
      console.error('Failed to save chip:', error);
      alert('Failed to create chip. Please try again.');
      setIsSaving(false);
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
      link.download = `${recipientName ? `${recipientName}-` : ''}sobriety-coin.png`;
      link.href = finalCanvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-8">
          <Link
            href="/sobriety-chips"
            className="text-neutral hover:text-neutral-600 transition-colors inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to All Chips
          </Link>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Customization Options */}
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-4xl font-bold text-neutral-900 mb-2">{initialChipData.title}</h1>
              <p className="text-lg text-neutral-600">Customize your Sobriety Chip</p>
            </div>

            {/* Recipient Name */}
            <Card className="border-neutral-200">
              <CardBody className="p-6">
                <label className="block text-sm font-semibold text-neutral-900 mb-2">
                  Name (optional)
                </label>
                <Input
                  value={recipientName}
                  onValueChange={setRecipientName}
                  placeholder="Your name or theirs..."
                  size="lg"
                  classNames={{
                    input: 'text-neutral-900',
                    inputWrapper: 'border-neutral-300',
                  }}
                />
              </CardBody>
            </Card>

            {/* Congratulations Text */}
            <Card className="border-neutral-200">
              <CardBody className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-neutral-900">
                    Recognition text
                  </label>
                  <Button
                    size="sm"
                    variant="light"
                    onClick={cycleCongratulationsText}
                    className="text-primary"
                    startContent={<RotateCw className="w-4 h-4" />}
                  >
                    Change
                  </Button>
                </div>
                <Input
                  value={customText}
                  onValueChange={setCustomText}
                  size="lg"
                  classNames={{
                    input: 'text-neutral-900',
                    inputWrapper: 'border-neutral-300',
                  }}
                />
              </CardBody>
            </Card>

            {/* Personal Message */}
            <Card className="border-neutral-200">
              <CardBody className="p-6">
                <label className="block text-sm font-semibold text-neutral-900 mb-2">
                  A message
                </label>
                <Textarea
                  value={personalMessage}
                  onValueChange={setPersonalMessage}
                  placeholder="A thought, feeling, or note..."
                  minRows={3}
                  classNames={{
                    input: 'text-neutral-900',
                    inputWrapper: 'border-neutral-300',
                  }}
                />
              </CardBody>
            </Card>

            {/* Color Themes */}
            <Card className="border-neutral-200">
              <CardBody className="p-6">
                <label className="block text-sm font-semibold text-neutral-900 mb-3">
                  Chip Color
                </label>
                <div className="grid grid-cols-5 gap-3">
                  {COLOR_THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => handleThemeChange(theme)}
                      className={`relative aspect-square rounded-lg transition-all ${
                        selectedTheme.id === theme.id
                          ? 'ring-2 ring-primary ring-offset-2 scale-110'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: theme.chipColor }}
                      title={theme.name}
                    >
                      {selectedTheme.id === theme.id && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <svg
                            className="w-6 h-6 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </CardBody>
            </Card>

            {/* About */}
            <Card className="border-neutral-200 bg-neutral-50">
              <CardBody className="p-6">
                <h3 className="text-lg font-bold text-neutral-900 mb-2">About this one</h3>
                <div className="space-y-3 text-neutral-600 text-sm leading-relaxed">
                  <p>
                    This chip marks {initialChipData.title.toLowerCase()}. Maybe that's where you
                    are right now. Maybe you're making this for someone else who just hit this
                    point. Either way, it counts.
                  </p>
                  <p>
                    You can put a name on it. Pick a color that feels right. Write something if you
                    want to. When you save it, you get a link. That link is yours to keep or share.
                    Send it to people who matter. Your sponsor, your therapist, a friend who gets
                    it. Or just keep it for yourself.
                  </p>
                  <div className="bg-white border border-neutral-200 rounded-lg p-3 mt-3">
                    <p className="text-xs text-neutral-700 space-y-1">
                      <span className="block">We don't track you.</span>
                      <span className="block">We don't email you.</span>
                      <span className="block">
                        Your chip page is private unless you share the link.
                      </span>
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Right: Preview */}
          <div className="space-y-6">
            <Card className="border-neutral-200">
              <CardBody className="p-8">
                <h2 className="text-xl font-bold text-neutral-900 mb-4">Preview</h2>
                <div
                  ref={snapshotRef}
                  className="relative aspect-square w-full max-w-md mx-auto rounded-xl overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, #1e1b4b 0%, #0f0f23 50%, #1e1b4b 100%)',
                  }}
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 sm:p-8 text-center">
                    {/* Recipient Name */}
                    {recipientName && (
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-3 sm:mb-4 px-2 break-words max-w-full">
                        {recipientName}
                      </h2>
                    )}

                    {/* Chip */}
                    <div className="w-40 h-40 sm:w-48 sm:h-48 mb-4 sm:mb-6 flex-shrink-0">
                      <Chip chipData={chipData} index={0} />
                    </div>

                    {/* Congratulations Text */}
                    <p className="text-base sm:text-xl md:text-2xl font-semibold text-white mb-3 sm:mb-4 px-2 break-words max-w-full">
                      {customText}
                    </p>

                    {/* Personal Message */}
                    {personalMessage && (
                      <p className="text-sm md:text-base text-neutral-200 italic max-w-sm">
                        &ldquo;{personalMessage}&rdquo;
                      </p>
                    )}
                  </div>
                </div>

                {/* CTA */}
                <div className="mt-6">
                  <Button
                    onClick={handleGenerateCoin}
                    isLoading={isSaving}
                    className="w-full bg-primary hover:bg-primary-600 text-neutral-900"
                    size="lg"
                    radius="full"
                    startContent={!isSaving ? <Share2 className="w-5 h-5" /> : null}
                  >
                    {isSaving ? 'Creating...' : 'Create shareable chip'}
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
