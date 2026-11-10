'use client';

import Link from 'next/link';
import { useState } from 'react';
import CardFront from '@/components/sobriety-cards/card-front';
import { cardHref, type SobrietyCard } from '@/lib/sobriety-card-data';
import { defaultCardDesign } from '@/lib/sobriety-card-design';

interface CardThumbProps {
  card: SobrietyCard;
}

/**
 * Grid thumbnail in the card's default style. Static until hovered or
 * keyboard-focused: photos drift (CSS), stripes mount the live renderer
 * (one WebGL context at a time).
 */
export default function CardThumb({ card }: CardThumbProps) {
  const [active, setActive] = useState(false);

  return (
    <Link
      href={cardHref(card)}
      className="group block rounded-2xl focus:outline-none focus-visible:ring-4 focus-visible:ring-primary focus-visible:ring-offset-2"
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') setActive(true);
      }}
      onPointerLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
    >
      <CardFront
        design={defaultCardDesign(card)}
        motion="hover"
        active={active}
        displayWidth={280}
        className="rounded-2xl shadow-md ring-1 ring-black/5 transition-transform duration-300 group-hover:-translate-y-1 group-hover:shadow-xl motion-reduce:transition-none motion-reduce:group-hover:translate-y-0"
      />
      <div className="mt-3 px-1">
        <h3 className="text-base font-semibold text-neutral-900 group-hover:text-neutral-700">{card.title}</h3>
      </div>
    </Link>
  );
}
