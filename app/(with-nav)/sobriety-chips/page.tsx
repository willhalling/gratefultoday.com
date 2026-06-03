import type { Metadata } from 'next';
import ChipsSearchFilter from '@/components/sobriety-chips/chips-search-filter';

export const metadata: Metadata = {
  title: 'Virtual Sobriety Coins - Free Digital Milestone Markers | Grateful Today',
  description:
    'Create free virtual sobriety coins to mark your recovery milestones. From 24 hours to 20 years, customize and share digital sobriety chips for alcohol, substance, or any recovery journey.',
  openGraph: {
    title: 'Virtual Sobriety Coins - Free Digital Milestone Markers | Grateful Today',
    description:
      'Create free virtual sobriety coins to mark your recovery milestones. From 24 hours to 20 years, customize and share digital sobriety chips for alcohol, substance, or any recovery journey.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Virtual Sobriety Coins - Free Digital Milestone Markers',
    description:
      'Create free virtual sobriety coins to mark your recovery milestones. From 24 hours to 20 years, customize and share digital sobriety chips for alcohol, substance, or any recovery journey.',
  },
};

export default function SobrietyChipsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-neutral-900 mb-6 leading-tight">
            Sobriety Coins
          </h1>
          <p className="text-xl text-neutral-600 max-w-4xl mx-auto mb-4 leading-relaxed">
            Create your own Virtual Sobriety Chip, or make one to send to a friend in fellowship.
          </p>
          <p className="text-xl text-neutral-600 max-w-4xl mx-auto mb-4 leading-relaxed">
            Our Digital Sobriety Chips allow you to add name, color, and a personal message if you
            wish
          </p>
        </div>

        {/* Interactive Search and Filter Component */}
        <ChipsSearchFilter />

        {/* SEO Content Sections */}
        <div className="max-w-4xl mx-auto mt-16 space-y-12">
          {/* What Are Virtual Sobriety Coins */}
          <section className="bg-white/60 backdrop-blur-sm p-8 rounded-xl border border-neutral-200 shadow-sm">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">What these are</h2>
            <div className="space-y-4 text-neutral-700 leading-relaxed">
              <p>
                If you've been to a meeting, you know about chips. The ones you hold in your hand.
                These are the digital version. Same idea, different format.
              </p>
              <p>
                They work like the physical chips from AA, NA, or any other recovery program. Each
                one marks a span of time. 24 hours. 30 days. A year. Five years. You get to decide
                if it matters, and you get to decide who sees it.
              </p>
              <p>
                You can put a name on it, pick a color that feels right, write something personal.
                Or keep it simple. Whatever helps.
              </p>
            </div>
          </section>

          {/* How to Use */}
          <section className="bg-white/60 backdrop-blur-sm p-8 rounded-xl border border-neutral-200 shadow-sm">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">How it works</h2>
            <div className="space-y-4 text-neutral-700 leading-relaxed">
              <p>
                Pick the milestone that matches where you are. Could be 24 hours. Could be 10 years.
                There's no wrong answer.
              </p>
              <p>
                From there, you can add a name if you want. Yours, or someone else's if you're
                making this for them. Choose a color. Write a message if words are coming. Or leave
                it blank. That works too.
              </p>
              <p>
                When you're done, you get a link. It's yours to keep or share. Send it to your
                sponsor. Show your therapist. Text it to a friend who gets it. Or just save it
                somewhere private. Your call.
              </p>
              <p>
                The whole thing is free. No account needed. No email to confirm. Just make the coin
                and it exists.
              </p>
            </div>
          </section>

          {/* Common Milestones */}
          <section className="bg-white/60 backdrop-blur-sm p-8 rounded-xl border border-neutral-200 shadow-sm">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">The milestones people mark</h2>
            <div className="space-y-4 text-neutral-700 leading-relaxed">
              <p>
                Different programs do this differently, and honestly, you get to decide what counts
                for you. But here are the ones that show up most:
              </p>
              <ul className="grid sm:grid-cols-2 gap-3 mt-4">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>
                    <strong>24 Hours:</strong> You made it through one full day
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>
                    <strong>30 Days:</strong> A month is no small thing
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>
                    <strong>60 Days:</strong> Two months of staying with it
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>
                    <strong>90 Days:</strong> Three months. A lot of people aim for this one early
                    on
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>
                    <strong>6 Months:</strong> Half a year
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>
                    <strong>1 Year:</strong> You got through a full year
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>
                    <strong>Multiple Years:</strong> 2, 5, 10, 15, 20. Each one matters
                  </span>
                </li>
              </ul>
            </div>
          </section>

          {/* For Any Recovery */}
          <section className="bg-white/60 backdrop-blur-sm p-8 rounded-xl border border-neutral-200 shadow-sm">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Whatever you're working on</h2>
            <div className="space-y-4 text-neutral-700 leading-relaxed">
              <p>
                These coins started in AA. Alcohol, substances, the traditional stuff. But recovery
                looks different for everyone, and time counts no matter what you're stepping away
                from.
              </p>
              <ul className="space-y-2 ml-6 mt-3">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Alcohol</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Drugs, pills, whatever you were using</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Nicotine, vaping, smoking</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Gambling</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Food patterns, eating disorders</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Anything else you're trying to change</span>
                </li>
              </ul>
              <p className="mt-4">
                No one here is checking your story. If it matters to you, it matters.
              </p>
            </div>
          </section>

          {/* Sharing and Privacy */}
          <section className="bg-white/60 backdrop-blur-sm p-8 rounded-xl border border-neutral-200 shadow-sm">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Who sees it</h2>
            <div className="space-y-4 text-neutral-700 leading-relaxed">
              <p>
                Every coin gets its own link. Nobody can find it unless you give it to them. So you
                choose. Send it to your sponsor. Share it in your group chat. Text it to someone
                who's been there. Or keep it private. All of that is fine.
              </p>
              <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 mt-4">
                <p className="font-medium text-neutral-900 mb-2">Privacy matters:</p>
                <ul className="space-y-1 text-sm text-neutral-700">
                  <li>We don't track you.</li>
                  <li>We don't email you.</li>
                  <li>Your coin page is private unless you share the link.</li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
