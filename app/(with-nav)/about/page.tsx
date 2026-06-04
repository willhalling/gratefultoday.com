import { Metadata } from 'next';
import ProsePageLayout from '@/components/prose-page-layout';

export const metadata: Metadata = {
  title: 'About | GratefulToday',
  description:
    'Quiet thoughts about family, friendship, time, ageing and the small moments that seem to matter more as we get older.',
};

export default function AboutPage() {
  return (
    <ProsePageLayout title="About GratefulToday">
      <div className="space-y-6">
        <p>
          Grateful Today is a collection of quiet thoughts about family, friendship, time, ageing
          and the small moments that seem to matter more as we get older.
        </p>

        <p>
          Set against train journeys and everyday scenes, these short videos aren&apos;t lessons or
          advice. They&apos;re simply observations.
        </p>

        <p>
          The kind of thoughts that appear somewhere between where you&apos;ve been and where
          you&apos;re going.
        </p>

        <p className="text-right text-neutral-600 mt-8">— GratefulToday</p>
      </div>
    </ProsePageLayout>
  );
}
