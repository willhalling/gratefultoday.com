/**
 * Type definitions for GratefulToday newsletter email generation
 */

export interface NewsletterGenerationRequest {
  series: 'coffeeAndGratitude';
  dayOfYear: number; // 0-365
  customPrompt?: string;
  // Anti-repetition context
  previousDays?: {
    dayOfYear: number;
    subject: string;
    body: string;
    metadata?: NewsletterEmail['metadata'];
  }[];
}

export interface NewsletterBatchRequest {
  series: 'coffeeAndGratitude';
  dayRange: {
    start: number; // 0-365
    end: number; // 0-365
  };
}

export interface NewsletterEmail {
  dayOfYear: number;
  subject: string;
  greeting: string;
  body: string;
  signoff: string;
  ps?: string;
  // Metadata for tracking content and avoiding repetition
  metadata?: {
    primaryTopics?: string[]; // e.g., ['coffee', 'morning', 'nature']
    peopleMentioned?: string[]; // e.g., ['friend', 'neighbor']
    emotionalTone?: 'vulnerable' | 'uplifting' | 'reflective' | 'honest' | 'struggling';
    callbackToDays?: number[]; // References to other day numbers
    phase?: 1 | 2 | 3 | 4 | 5; // Story arc phase
  };
}

export interface NewsletterGenerationResponse {
  email?: NewsletterEmail;
  emails?: NewsletterEmail[]; // For batch requests
  wordCount?: number;
  generatedAt: string;
}

export interface NewsletterValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  wordCount: number;
  hasQuestion: boolean;
  exclamationCount: number;
}

// Saved newsletter email record (for database)
export interface SavedNewsletterEmail extends NewsletterEmail {
  id: string;
  theme?: NewsletterTheme;
  mood?: NewsletterMood;
  wordCount: number;
  createdAt: number;
  sentAt?: number;
  recipientCount?: number;
  status: 'draft' | 'sent' | 'scheduled';
}
