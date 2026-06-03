/**
 * 7-Day Gratitude Challenge for Recovery
 * Content definition for PDF generation
 */

import type { ChallengeDefinition } from '@/types/pdf-challenge';

export const recoveryChallenge: ChallengeDefinition = {
  slug: '7-day-gratitude-challenge-for-recovery',

  cover: {
    title: '7-Day Gratitude Challenge\nfor Recovery',
    subtitle: 'A simple daily practice to help you notice\nthe good, even on hard days.',
    tagline: 'By GratefulToday\ngratefultoday.com',
    coverImageHeightPercent: 0.7, // 70% height for image, 30% for text
  },

  welcome: {
    heading: 'Welcome to the Challenge',
    body: [
      "If you're reading this, you're probably in recovery or thinking about it. Maybe you're on day 1, maybe day 1000. Either way, you're here. That matters.",
      "Gratitude in recovery isn't about pretending everything is perfect. It's about noticing what's real and good, even when things are hard.",
      "This 7-day challenge is simple. Each day, you'll get one prompt. Write whatever comes to mind. No right answers. No pressure.",
      'Some days will feel easy. Some days you might struggle to find anything. Both are okay. Just show up and try.',
    ],
    instructions: [
      'Do one prompt per day (or go at your own pace)',
      'Write in the space provided, or use your own journal',
      'Be honest. This is for you, not anyone else',
      'There\'s no "right" way to feel grateful',
      'Skip a day if you need to, come back when you can',
    ],
  },

  dailyChallenges: [
    {
      day: 1,
      title: 'Right Now',
      prompt:
        "List 3 things you're grateful for in this exact moment.\n\nThey don't have to be big. Could be your coffee. The quiet. That you woke up today. That you're trying.\n\nWhat are you grateful for right now?",
      linesNeeded: 3,
      whyText:
        'Gratitude works best when it\'s specific and present. "Right now" keeps you grounded in what\'s actually here, not what you wish was here.',
    },
    {
      day: 2,
      title: 'Someone Who Showed Up',
      prompt:
        'Think of one person who showed up for you in your recovery journey.\n\nMaybe they stayed when others left. Maybe they checked in. Maybe they just believed you could do this.\n\nWrite about them. What did they do? How did it help?',
      linesNeeded: 5,
      whyText:
        "Recovery isn't done alone. Recognizing who's been there reminds you that you're not as isolated as you sometimes feel.\n\nOptional: Tell them thank you today.",
    },
    {
      day: 3,
      title: 'Small Wins',
      prompt:
        "List 5 small things that went right today (or yesterday).\n\nNot big milestones. Just small, ordinary moments. The mundane stuff that's easy to overlook.\n\nExamples: You made your bed. You didn't snap at someone. You remembered to eat. You took a shower. You showed up.\n\nWhat small things went right?",
      linesNeeded: 5,
      whyText:
        'Recovery is built on small wins. Learning to notice them changes how you see your days.',
    },
    {
      day: 4,
      title: 'What Sobriety Gave Back',
      prompt:
        "What has sobriety given back to you that you'd lost?\n\nYour clear mind? Your mornings? A relationship? Trust? The ability to remember last night?\n\nWrite about what you got back.",
      linesNeeded: 5,
      whyText:
        "It's easy to focus on what you gave up. This reminds you what you gained.\n\nIf you're early in recovery and haven't gotten much back yet, write about what you hope to get back. That counts too.",
    },
    {
      day: 5,
      title: 'A Moment of Peace',
      prompt:
        "Describe one moment recently where you felt peaceful. Even if it was brief.\n\nMaybe it was morning coffee. A walk. Rain on the window. Silence. A good conversation. Five minutes where you weren't anxious.\n\nWhat was the moment? What did it feel like?",
      linesNeeded: 5,
      whyText:
        "Peace isn't a permanent state. It's moments. Learning to recognize them helps you find more of them.",
    },
    {
      day: 6,
      title: 'Learning to Appreciate Again',
      prompt:
        "What's something simple you're learning to appreciate again that you took for granted before?\n\nExamples: Waking up without a hangover. Having money in your account. Being trusted. Remembering conversations. Tasting food. Feeling things.\n\nWhat are you appreciating now that you couldn't before?",
      linesNeeded: 5,
      whyText:
        'Sobriety gives you back the ability to actually experience life. Noticing what you can feel again is gratitude in action.',
    },
    {
      day: 7,
      title: 'This Week',
      prompt:
        'You made it through the week. Look back at what you wrote.\n\nWhat surprised you? What was hard? What did you notice about your recovery or yourself?',
      linesNeeded: 5,
      whyText:
        "Reflection turns practice into awareness. You didn't just do this. You showed up for yourself. That's huge.",
      additionalPrompt: 'Now: What are you grateful for about completing this challenge?',
      additionalLines: 3,
    },
  ],

  closing: {
    heading: 'You Did It',
    sections: [
      {
        heading: '',
        body: [
          "You showed up for 7 days. That's the practice.",
          "Gratitude isn't a one-time thing. It's a daily choice to notice what's real and good, even when everything isn't good.",
        ],
      },
      {
        heading: 'Keep Going',
        body: [
          'Here are some ways to continue:',
          '',
          'Daily Practice:',
          '• Download the free Gratitude Journal Template at gratefultoday.com',
          '• Set a reminder: 5 minutes before bed, list 3 things',
          "• Keep it simple. This doesn't have to be perfect",
          '',
          'Join the Community:',
          "• Every Friday on YouTube, we share what we're grateful for",
          "• Drop a comment, read others', remember you're not alone",
          '• Subscribe: youtube.com/@gratefultoday',
          '',
          'Need Support:',
          '• Crisis meditations: [link to playlist]',
          '• Sleep support: [link to playlist]',
          '• Milestone meditations: [link to playlist]',
        ],
      },
      {
        heading: 'One Last Thing',
        body: [
          "Some days you won't feel grateful. Some days survival is enough.",
          '',
          "That's okay. Gratitude is about noticing the small, true things, even in the dark. Real moments. Real progress.",
          '',
          "You're doing hard work. You're showing up. That's something to be grateful for.",
          '',
          'Keep going. One day at a time.',
        ],
      },
    ],
    callToActions: ['GratefulToday', 'gratefultoday.com'],
  },
};
