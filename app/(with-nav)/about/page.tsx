import { Metadata } from 'next';
import ProsePageLayout from '@/components/prose-page-layout';

export const metadata: Metadata = {
  title: 'About | GratefulToday',
  description:
    'A quiet place to notice what matters. For anyone trying to stay sober, one day at a time.',
};

export default function AboutPage() {
  return (
    <ProsePageLayout title="About GratefulToday">
      <div className="space-y-6">
        <p className="text-xl font-medium text-neutral-800">
          We made this because we needed it.
        </p>

        <p>
          In early recovery, we were looking for something that felt real. Not preachy. Not perfect.
          Just honest.
        </p>

        <p>
          We needed tools for 3am when we couldn&apos;t sleep. For the hard days. For learning to notice the small things again.
        </p>

        <p>
          So we started making meditations. Writing things down. Showing up when we could.
        </p>

        <p>
          GratefulToday is what we wish we had on day 1. It&apos;s for anyone trying to stay sober.
          One day at a time.
        </p>

        <p className="text-lg font-medium text-neutral-800 italic">
          Without sobriety, we have nothing. With it, we have everything.
        </p>

        <p>
          If you&apos;re here, you&apos;re probably on a similar path. You&apos;re not alone.
        </p>

        <p className="text-right text-neutral-600 mt-8">— GratefulToday</p>
      </div>
    </ProsePageLayout>
  );
}
