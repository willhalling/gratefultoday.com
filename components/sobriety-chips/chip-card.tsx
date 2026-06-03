'use client';

import Link from 'next/link';
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

interface ChipCardProps {
  chipData: ChipData;
  index: number;
}

export default function ChipCard({ chipData, index }: ChipCardProps) {
  return (
    <Link
      href={`/sobriety-chips/${chipData.id}`}
      className="group bg-white hover:bg-neutral-50 p-4 rounded-xl border border-neutral-200 hover:border-primary hover:shadow-lg transition-all duration-200"
    >
      <div className="max-w-xs mx-auto text-center">
        {/* Chip Component */}
        <div className="mb-3">
          <Chip 
            chipData={chipData}
            index={index}
          />
        </div>

        {/* Milestone title */}
        <div className="text-center">
          <h3 className="text-sm font-semibold text-neutral-900 group-hover:text-primary transition-colors">
            {chipData.chipNumber} {chipData.chipText}
          </h3>
          <p className="text-xs text-neutral-600 mt-1">
            {chipData.title}
          </p>
        </div>
      </div>
    </Link>
  );
}
