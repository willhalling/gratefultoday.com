import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import sobrietyChipsData from '@/json/sobriety-chips.json';
import ChipPageContent from './chip-page-content';

interface ChipPageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Generate static params for all chips
export async function generateStaticParams() {
  return sobrietyChipsData.map((chip) => ({
    slug: chip.id,
  }));
}

// Generate metadata for each chip page
export async function generateMetadata({ params }: ChipPageProps): Promise<Metadata> {
  const { slug } = await params;
  const chipData = sobrietyChipsData.find((chip) => chip.id === slug);

  if (!chipData) {
    return {
      title: 'Chip Not Found - Grateful Today',
    };
  }

  const title = `${chipData.title} Sobriety Coin - Free Virtual Recovery Chip | Grateful Today`;
  const description = `Create a free virtual sobriety coin for ${chipData.title.toLowerCase()} of recovery. Customize with a name, choose colors, add a personal message, and share with your support network.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

// Helper function to get reflection message
function getInspirationMessage(chipData: any): string {
  const { chipNumber, chipText } = chipData;
  
  if (chipText === "hours") {
    return "You chose to start. That choice is yours.";
  } else if (chipText === "days") {
    if (chipNumber === 1) return "Today you showed up.";
    if (chipNumber <= 7) return "Each day is its own choice.";
    if (chipNumber === 30) return "A month of choosing differently.";
    if (chipNumber === 60) return "Two months of being present.";
    if (chipNumber === 90) return "Three months. Still here.";
    return `${chipNumber} days of showing up.`;
  } else if (chipText === "WEEK" || chipText === "weeks") {
    if (chipNumber === 1) return "You made it through one week.";
    return `${chipNumber} weeks of steady choices.`;
  } else if (chipText === "month" || chipText === "months") {
    if (chipNumber === 1) return "One month counts.";
    if (chipNumber === 3) return "Three months of being here.";
    if (chipNumber === 6) return "Half a year. You kept going.";
    return `${chipNumber} months of choosing this.`;
  } else if (chipText === "year" || chipText === "years") {
    if (chipNumber === 1) return "One year. You stayed.";
    if (chipNumber === 5) return "Five years of quiet strength.";
    if (chipNumber >= 10) return `${chipNumber} years. Still choosing.`;
    return `${chipNumber} years of showing up.`;
  }
  
  return "This moment matters.";
}

// Helper to get chip color
function getChipColor(chipData: any): string {
  const chipText = chipData.chipText.toLowerCase();
  const chipNumber = chipData.chipNumber;

  if (chipText.includes('year')) {
    if (chipNumber === 20) return '#FFD700';
    if (chipNumber === 15) return '#C0C0C0';
    if (chipNumber >= 10) return '#CD7F32';
    return '#DC2626';
  }
  
  if (chipText.includes('month')) return '#F59E0B';
  if (chipText.includes('week')) return '#7C3AED';
  if (chipText.includes('day')) return '#2563EB';
  if (chipText.includes('hour')) return '#059669';
  
  return '#6B7280';
}

export default async function ChipPage({ params }: ChipPageProps) {
  const { slug } = await params;
  const chipData = sobrietyChipsData.find((chip) => chip.id === slug);

  if (!chipData) {
    notFound();
  }

  const chipColor = getChipColor(chipData);
  const modifiedChipData = {
    ...chipData,
    chipColor,
  };

  const inspirationMessage = getInspirationMessage(chipData);

  return <ChipPageContent initialChipData={modifiedChipData} inspirationMessage={inspirationMessage} />;
}