'use client';

import { motion } from 'framer-motion';
import WeekJourneySignupForm from './components/WeekJourneySignupForm';
import LandingPageTemplate from '@/components/landing/LandingPageTemplate';
// import { DAY_PROMPTS } from '@/types/just-for-a-week';

export default function JustForAWeekPage() {
  // Demo data for the embedded video preview (all 7 days)
  // Removed video demo; keeping content minimal
  return (
    <LandingPageTemplate
      hero={{
        title: 'Notice what matters. Just for a week.',
        subtitle: 'A quiet place to pause. One prompt a day. Stop anytime.',
        backgroundImage: '/image-backgrounds/just-for-a-week-bg.png',
        backgroundOpacity: 50,
        textAlign: 'left',
      }}
      formInHero
      swapColumns={true}
      mainRight={
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white rounded-xl shadow-xl p-6 border border-neutral-200"
        >
          <h3 className="text-2xl font-bold text-neutral-900 mb-4 text-center">The Prompts</h3>
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <h4 className="font-semibold text-primary-dark mb-2">Day 1: Right Now</h4>
              <p className="text-neutral-600">
                Notice 3 things in this moment.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <h4 className="font-semibold text-primary-dark mb-2">Day 2: Someone Who Showed Up</h4>
              <p className="text-neutral-600">
                Think of one person who was there.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <h4 className="font-semibold text-primary-dark mb-2">Day 3: Small Things</h4>
              <p className="text-neutral-600">What went okay today.</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="pt-2 border-t border-neutral-200"
            >
              <p className="text-sm text-neutral-500 italic">
                + 4 more quiet prompts
              </p>
            </motion.div>
          </div>
        </motion.div>
      }
      contentSections={[
        {
          id: 'main-content',
          backgroundColor: 'white',
          content: (
            <div className="flex items-center min-h-[400px]">
              <div>
                <motion.h2
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="text-3xl md:text-4xl font-bold text-neutral-900 mb-6"
                >
                  How it works
                </motion.h2>

                <ul className="space-y-3 text-lg text-neutral-700">
                  <motion.li
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="flex items-start"
                  >
                    <span className="text-primary mr-3 flex-shrink-0">✓</span>
                    <span>Get Day 1 in your inbox</span>
                  </motion.li>
                  <motion.li
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="flex items-start"
                  >
                    <span className="text-primary mr-3 flex-shrink-0">✓</span>
                    <span>One prompt each day</span>
                  </motion.li>
                  <motion.li
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="flex items-start"
                  >
                    <span className="text-primary mr-3 flex-shrink-0">✓</span>
                    <span>Write if you want to</span>
                  </motion.li>
                  <motion.li
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    className="flex items-start"
                  >
                    <span className="text-primary mr-3 flex-shrink-0">✓</span>
                    <span>After Day 7, get a video of what you noticed</span>
                  </motion.li>
                </ul>
              </div>
            </div>
          ),
        },
        {
          id: 'faq',
          title: 'Frequently Asked Questions',
          backgroundColor: 'neutral-50',
          textAlign: 'left',
          maxWidth: '4xl',
          content: (
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-3">Is this free?</h3>
                <p className="text-neutral-700">
                  Yes. No credit card. Just your email. We never share it.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-3">
                  I'm not good at gratitude.
                </h3>
                <p className="text-neutral-700">
                  This isn't about being good at anything. Some days you're just trying to get through. This is about noticing what's actually here. The small things. The people who showed up. The fact that you woke up today. That's enough.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-3">
                  What if I miss a day?
                </h3>
                <p className="text-neutral-700">
                  Then you miss a day. No streaks. No tracking. Just come back when you can.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-3">
                  How much time does this take?
                </h3>
                <p className="text-neutral-700">
                  A minute or two. Write as much or as little as you want. Or just read the prompt and think about it.
                </p>
              </div>
            </div>
          ),
        },
      ]}
      formSection={{
        title: 'Just for a week',
        subtitle: "No pressure. Stop anytime.",
        customForm: <WeekJourneySignupForm />,
      }}
    />
  );
}
