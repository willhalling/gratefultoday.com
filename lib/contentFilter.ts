// Content filter for harmful/inappropriate words
// This is a basic filter - can be enhanced with more sophisticated NLP

const HARMFUL_KEYWORDS = [
  // Self-harm related
  'kill myself',
  'end it all',
  'suicide',
  'self harm',

  // Explicit profanity (add as needed)
  // Keep minimal - people should feel safe to express emotions

  // Hate speech
  // Add specific terms as needed while allowing emotional expression
];

export function containsHarmfulContent(text: string): boolean {
  const lowerText = text.toLowerCase();

  return HARMFUL_KEYWORDS.some((keyword) => lowerText.includes(keyword.toLowerCase()));
}

export function getFlagReason(text: string): string | null {
  const lowerText = text.toLowerCase();

  // Check for self-harm language
  const selfHarmTerms = ['kill myself', 'end it all', 'suicide', 'self harm'];
  if (selfHarmTerms.some((term) => lowerText.includes(term))) {
    return 'contains_self_harm_language';
  }

  return null;
}

// Helper message for flagged content
export const CRISIS_RESOURCES = {
  title: 'We care about your wellbeing',
  message: "If you're in crisis, please reach out for help:",
  resources: [
    {
      name: '988 Suicide & Crisis Lifeline',
      contact: 'Call or text 988',
      available: '24/7',
    },
    {
      name: 'SAMHSA National Helpline',
      contact: '1-800-662-4357',
      available: '24/7 - Free and confidential',
    },
  ],
};
