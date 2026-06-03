// AI Generation Limits Configuration

export interface AILimits {
  DAILY_LIMIT: number | null;
  MONTHLY_LIMIT: number | null;
  TOTAL_LIMIT: number | null;
}

export const AI_LIMITS = {
  // Free tier limits
  FREE_TIER: {
    DAILY_LIMIT: 3,          // 3 generations per day
    MONTHLY_LIMIT: 15,       // 15 generations per month
    TOTAL_LIMIT: 50,         // 50 total generations ever
  } as AILimits,
  
  // Premium tier limits (for future subscription plans)
  PREMIUM_TIER: {
    DAILY_LIMIT: 25,         // 25 generations per day
    MONTHLY_LIMIT: 200,      // 200 generations per month
    TOTAL_LIMIT: null,       // Unlimited total generations
  } as AILimits,
  
  // Admin/unlimited access
  UNLIMITED_TIER: {
    DAILY_LIMIT: null,       // No daily limit
    MONTHLY_LIMIT: null,     // No monthly limit
    TOTAL_LIMIT: null,       // No total limit
  } as AILimits,
  
  // Configuration
  RESET_HOUR: 0,             // Daily reset at midnight UTC
  WARNING_THRESHOLD: 0.8,    // Show warning at 80% of limit
};

// Admin user IDs with unlimited access
export const UNLIMITED_USERS = [
  'OuPXRURBSOQzqhylS9MWgaPBYJw2', // Your admin UID
  'BoTJcdHh9ogYZUWEaKWbEkuPzTJ2', // Secondary admin UID
];

// Helper functions
export const getUserTier = (userId: string): keyof typeof AI_LIMITS => {
  if (UNLIMITED_USERS.includes(userId)) {
    return 'UNLIMITED_TIER';
  }
  
  // TODO: Check if user has premium subscription
  // For now, everyone gets free tier
  return 'FREE_TIER';
};

// Get limits for a specific user
export const getLimitsForUser = (userId: string): AILimits => {
  // Check if user is in unlimited tier (admin/special users)
  if (UNLIMITED_USERS.includes(userId)) {
    return AI_LIMITS.UNLIMITED_TIER;
  }
  
  // TODO: Add logic to check user's subscription tier from database
  // For now, default to FREE_TIER
  // In production, you'd check the user's subscription status from Firestore
  
  return AI_LIMITS.FREE_TIER;
};

// Get today's date string for daily tracking
export const getTodayKey = (): string => {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
};

// Get current month key for monthly tracking
export const getMonthKey = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
};
