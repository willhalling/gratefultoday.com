'use client';

import CardFront from '@/components/sobriety-cards/card-front';
import { PAPER_COLOR } from '@/lib/sobriety-card-art';
import type { CardDesign } from '@/lib/sobriety-card-design';
import { cardInsideFont } from '@/lib/sobriety-card-font';

interface CardStageProps {
  design: CardDesign;
  toName: string;
  fromName: string;
  message: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Soft wave ripple through the stripes on load (stripes style). */
  ripple?: boolean;
  /** Heading level for the front headline text. */
  headlineAs?: 'p' | 'h2';
}

/**
 * Large animated card front that flips open (CSS 3D) to the inside message.
 * Reduced motion: no flip animation, no drift (static frame).
 */
export default function CardStage({
  design,
  toName,
  fromName,
  message,
  open,
  onOpenChange,
  ripple = false,
  headlineAs = 'p',
}: CardStageProps) {
  const to = toName.trim();
  const from = fromName.trim();

  return (
    <div className="mx-auto w-full max-w-[440px]">
      <div className="[perspective:1800px]">
        <div
          className={`relative transition-transform duration-700 ease-out [transform-style:preserve-3d] motion-reduce:transition-none ${
            open ? '[transform:rotateY(180deg)]' : ''
          }`}
        >
          <div className="[backface-visibility:hidden]" aria-hidden={open} inert={open}>
            <CardFront
              design={design}
              motion="always"
              ripple={ripple}
              headlineAs={headlineAs}
              displayWidth={440}
              priority
              className="rounded-2xl shadow-2xl ring-1 ring-black/5"
            />
          </div>

          <div
            className="absolute inset-0 overflow-hidden rounded-2xl shadow-2xl ring-1 ring-black/5 [backface-visibility:hidden] [transform:rotateY(180deg)]"
            style={{ backgroundColor: PAPER_COLOR, containerType: 'inline-size' }}
            aria-hidden={!open}
            inert={!open}
          >
            <div
              className="absolute inset-y-0 left-0 w-[3cqw]"
              style={{ background: `linear-gradient(90deg, rgba(0,0,0,0.08), transparent)` }}
              aria-hidden="true"
            />
            <div
              className={`${cardInsideFont.className} flex h-full flex-col justify-center gap-[5cqw] overflow-y-auto px-[11cqw] py-[12cqw] text-neutral-900`}
              style={{ fontSize: '6.4cqw', lineHeight: 1.35 }}
            >
              {to && <p className="m-0">{to},</p>}
              <p className="m-0 whitespace-pre-wrap break-words">
                {message.trim() || 'Thinking of you.'}
              </p>
              {from && <p className="m-0 text-right">love, {from}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex justify-center">
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          aria-pressed={open}
          className="rounded-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-neutral-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {open ? 'Close card' : 'Open card'}
        </button>
      </div>
    </div>
  );
}
