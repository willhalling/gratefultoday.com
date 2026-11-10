import type { Metadata } from "next";
import ProsePageLayout from "@/components/prose-page-layout";

export const metadata: Metadata = {
  title: "About | Grateful Today",
  description:
    "Grateful Today is a simple place for daily gratitude, recovery milestones, and honest encouragement. One day. One thing.",
};

export default function AboutPage() {
  return (
    <ProsePageLayout
      title="About Grateful Today"
      subtitle="One day. One thing."
    >
      <div className="space-y-6">
        <p>
          Grateful Today is a simple place to notice something good and mark the
          days that matter. It brings daily gratitude and recovery into the same
          gentle practice, without asking either to look a particular way.
        </p>
        <p>
          You can answer one small prompt, read what other people are grateful
          for, or make a colourful chip or card for a sober milestone. Some days
          that means a whole year. Some days it means five quiet minutes and a
          warm cup of tea.
        </p>
        <h2 className="pt-4">Why it exists</h2>
        <p>
          Big promises are not always helpful. A small reason to come back each
          day can be. The tools here are free and straightforward: notice one
          thing, celebrate one milestone, send one honest message, and let that
          be enough for today.
        </p>
        <p>
          Grateful Today is not a treatment program or a substitute for
          professional help. It is a companion to the support people already
          have, with a direct path to more help whenever today feels too heavy.
        </p>
        <p className="text-right text-neutral-600">— Grateful Today</p>
      </div>
    </ProsePageLayout>
  );
}
