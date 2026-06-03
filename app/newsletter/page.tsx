'use client';

import { motion } from 'framer-motion';
import LandingPageTemplate from '@/components/landing/LandingPageTemplate';
import { NewsletterForm } from '@/components/newsletter/NewsletterForm';
import { TodayStats } from '@/components/stats/TodayStats';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: 'easeOut' },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function NewsletterPage() {
  return (
    <LandingPageTemplate
      hero={{
        title: 'Start Your Day With Gratitude',
        subtitle:
          'Get a simple gratitude prompt in your inbox every morning. Reflect, post to our community wall, and build a daily practice that helps you stay grounded, one day at a time.',
        textAlign: 'left',
        // afterSubtitle: <TodayStats noShadow variant="newsletter" />,
      }}
      formSection={{
        title: 'Sign Up',
        subtitle: 'Choose daily or weekly reminders',
        customForm: <NewsletterForm />,
      }}
      formInHero={true}
      contentSections={[
        {
          id: 'how-it-works',
          title: 'Three Minutes Every Morning',
          backgroundColor: 'white',
          textAlign: 'center',
          padding: 'lg',
          content: (
            <motion.div
              className="grid md:grid-cols-3 gap-8 mt-12"
              variants={staggerContainer}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true, margin: '-100px' }}
            >
              <motion.div className="text-center" variants={fadeInUp}>
                <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-3">
                  1. Receive Your Prompt
                </h3>
                <p className="text-neutral-600">
                  A simple gratitude question arrives in your inbox each morning at 7am.
                </p>
              </motion.div>

              <motion.div className="text-center" variants={fadeInUp}>
                <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-3">2. Reflect and Post</h3>
                <p className="text-neutral-600">
                  Take a moment to think. Answer our prompt or share whatever you're grateful for
                  today. Post anonymously to our community wall, or just reflect privately.
                </p>
              </motion.div>

              <motion.div className="text-center" variants={fadeInUp}>
                <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-3">3. Build the Habit</h3>
                <p className="text-neutral-600">
                  Daily prompts help you notice the good, even on hard days. Especially on hard
                  days.
                </p>
              </motion.div>
            </motion.div>
          ),
        },
        {
          id: 'faqs',
          title: 'FAQs',
          backgroundColor: 'neutral-50',
          textAlign: 'center',
          padding: 'lg',
          content: (
            <motion.div
              className="max-w-3xl mx-auto space-y-8 text-left"
              variants={staggerContainer}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true, margin: '-100px' }}
            >
              <motion.div variants={fadeInUp}>
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                  Can I change my frequency later?
                </h3>
                <p className="text-neutral-600">
                  Yes! Update your preferences anytime from any email we send.
                </p>
              </motion.div>

              <motion.div variants={fadeInUp}>
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">Will you spam me?</h3>
                <p className="text-neutral-600">
                  Never. You'll only get the gratitude prompts you signed up for, daily or weekly.
                  No promotional emails, no selling your info.
                </p>
              </motion.div>

              <motion.div variants={fadeInUp}>
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                  What if I miss a day?
                </h3>
                <p className="text-neutral-600">
                  No guilt, no streaks to maintain. Just pick back up whenever you're ready.
                  Recovery and gratitude aren't about perfection.
                </p>
              </motion.div>

              <motion.div variants={fadeInUp}>
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                  Is this only for people in recovery?
                </h3>
                <p className="text-neutral-600">
                  Not at all. While many of our community members are in recovery, anyone can
                  benefit from a daily gratitude practice.
                </p>
              </motion.div>

              <motion.div variants={fadeInUp}>
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                  What happens to what I post?
                </h3>
                <p className="text-neutral-600">
                  If you choose to post your gratitude to our community wall, it's anonymous and
                  visible to others for encouragement. You can also just reflect privately. Posting
                  is always optional.
                </p>
              </motion.div>
            </motion.div>
          ),
        },
      ]}
    />
  );
}
