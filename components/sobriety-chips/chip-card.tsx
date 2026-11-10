'use client';

import Link from 'next/link';

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

interface ChipCardProps {
  chipData: ChipData;
}

export default function ChipCard({ chipData }: ChipCardProps) {
  return (
    <Link
      href={`/sobriety-chips/${chipData.id}`}
      className="group block overflow-hidden rounded-xl border border-neutral-200 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:shadow-xl"
      aria-label={`Open the ${chipData.title} story`}
    >
      <div className="relative aspect-[9/16] overflow-hidden bg-neutral-950">
        <img
          src={`/sobriety-previews/${chipData.id}.jpg`}
          alt={`${chipData.title} story preview`}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        />
      </div>
      <div className="p-4 text-center">
        <h3 className="text-sm font-semibold text-neutral-900 transition-colors group-hover:text-primary">
          {chipData.chipNumber} {chipData.chipText}
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-neutral-600">{chipData.title}</p>
      </div>
    </Link>
  );
}
