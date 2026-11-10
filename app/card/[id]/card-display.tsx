'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import CardStage from '@/components/sobriety-cards/card-stage';
import { CardDownloadActions, CardShareActions } from '@/components/sobriety-cards/card-actions';
import { getCollection, type SobrietyCard } from '@/lib/sobriety-card-data';
import { savedCardDesign } from '@/lib/sobriety-card-design';
import type { SavedCard } from '@/lib/sobriety-cards';

interface CardDisplayPageProps {
  saved: SavedCard;
  card: SobrietyCard;
}

export default function CardDisplayPage({ saved, card }: CardDisplayPageProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const design = savedCardDesign(card, saved);
  const sender = saved.fromName?.trim() || 'Someone';
  const heading = saved.toName?.trim()
    ? `${saved.toName.trim()}, ${saved.fromName?.trim() || 'someone'} sent you a card`
    : `${sender} sent you a card`;

  useEffect(() => {
    setUrl(window.location.href);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white flex items-center justify-center p-4">
      <main className="max-w-2xl w-full space-y-8 py-8">
        <h1 className="text-center text-2xl font-bold text-neutral-900">
          {heading}
        </h1>

        <CardStage
          design={design}
          toName={saved.toName}
          fromName={saved.fromName}
          message={saved.message}
          open={open}
          onOpenChange={setOpen}
          ripple
          headlineAs="h2"
        />

        <div className="w-full max-w-md mx-auto space-y-6 rounded-xl border border-neutral-200 bg-white p-4 sm:p-6">
          {url && (
            <CardShareActions
              url={url}
              shareTitle={`${sender} sent you a card`}
              shareText={`${sender} sent you a card`}
            />
          )}
          <CardDownloadActions
            design={design}
            filename="card"
          />
        </div>

        <div className="text-center">
          <Link
            href={getCollection(card).basePath}
            className="text-sm text-neutral-600 hover:text-primary transition-colors rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Make a card for someone
          </Link>
        </div>
      </main>
    </div>
  );
}
