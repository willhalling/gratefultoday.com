import { NewsletterContent } from '@/components/newsletter/NewsletterTemplate';

// Sample newsletter - Day 1: Coffee and New Beginnings
export const sampleNewsletter: NewsletterContent = {
  title: 'coffee and new beginnings',
  subtitle: 'day 1',
  date: 'January 1st',
  greeting: 'hey.',
  mainContent: [
    "january 1st. New year, same recovery. Made coffee extra strong this morning - needed it after staying up too late watching fireworks sober.",
    "not gonna lie, new year's was weird without drinking. But I'm here. Clear head, no regret, no shame spiral about what I did last night.",
  ],
  gratitudes: [
    'i am grateful for my sobriety (without sobriety i have nothing)',
    "i am grateful for this quiet morning before the world wakes up",
    "i am grateful for coffee that actually tastes good when you're not hungover",
  ],
  closingThought:
    "starting this practice today because recovery needs daily maintenance. Some days gratitude will feel easy, other days it'll feel like work. Today feels somewhere in between.",
  callToAction:
    "the thing about january 1st in recovery - it's not about becoming a new person. It's about showing up as the person you already are, just one more day sober.\n\nyou showed up today. that counts.",
  signature: 'GratefulToday',
};

// Future newsletters can be added here
export const newsletters = {
  'coffee-and-new-beginnings': sampleNewsletter,
  // Add more newsletters here...
};
