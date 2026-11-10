'use client';

import { Check, Copy, Download, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { CardDesign } from '@/lib/sobriety-card-design';
import type { CardExportFormat } from '@/lib/sobriety-card-renderer';

const buttonClass =
  'inline-flex items-center justify-center gap-2 rounded-full border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-neutral-800 transition-colors hover:bg-neutral-50 disabled:opacity-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary focus-visible:ring-offset-2';

interface CardShareActionsProps {
  url: string;
  /** Text handed to the OS share sheet — keep neutral for discreet cards. */
  shareTitle: string;
  shareText: string;
}

export function CardShareActions({ url, shareTitle, shareText }: CardShareActionsProps) {
  const [status, setStatus] = useState('');
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator.share === 'function');
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setStatus('Link copied');
    } catch {
      setStatus('Could not copy. Select the link and copy it instead.');
    }
  };

  const share = async () => {
    try {
      await navigator.share({ title: shareTitle, text: shareText, url });
    } catch {
      // Share sheet dismissed.
    }
  };

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="sr-only">Card link</span>
        <input
          readOnly
          value={url}
          onFocus={(event) => event.currentTarget.select()}
          className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      </label>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={copy} className={buttonClass}>
          {status === 'Link copied' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          Copy link
        </button>
        {canShare && (
          <button type="button" onClick={share} className={buttonClass}>
            <Share2 className="h-4 w-4" />
            Share
          </button>
        )}
      </div>
      <p className="min-h-5 text-sm text-neutral-600" aria-live="polite">
        {status}
      </p>
    </div>
  );
}

interface CardDownloadActionsProps {
  design: CardDesign;
  filename: string;
}

export function CardDownloadActions({ design, filename }: CardDownloadActionsProps) {
  const [busy, setBusy] = useState<CardExportFormat | null>(null);
  const [error, setError] = useState('');

  const download = async (format: CardExportFormat) => {
    setBusy(format);
    setError('');
    try {
      const { exportSobrietyCardPng } = await import('@/lib/sobriety-card-renderer');
      const blob = await exportSobrietyCardPng({ design, format });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `${filename}${format === 'og' ? '-wide' : ''}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (err) {
      console.error('[sobriety-card] download failed:', err);
      setError('The image could not be created. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => download('card')} disabled={busy !== null} className={buttonClass}>
          <Download className="h-4 w-4" />
          {busy === 'card' ? 'Preparing…' : 'Download image'}
        </button>
        <button type="button" onClick={() => download('og')} disabled={busy !== null} className={buttonClass}>
          <Download className="h-4 w-4" />
          {busy === 'og' ? 'Preparing…' : 'Wide image'}
        </button>
      </div>
      <p className="text-xs text-neutral-500">Card is 1200×1680. Wide is 1200×630, sized for link previews and posts.</p>
      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
