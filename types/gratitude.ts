export interface GratitudePost {
  id: string;
  text: string;
  createdAt: Date;
  userId: string; // Firebase UID for rate limiting, not displayed
  promptId?: string; // Optional: which email prompt they responded to
  flagged: boolean;
  flagCount: number;
  avatarColor: string; // Assigned color for anonymous visual variety
  isArchived?: boolean; // Admin can archive posts
  firstName?: string; // User's first name from newsletter signup
  lastname?: string; // User's last name initial from newsletter signup
}

export interface UserPostActivity {
  userId: string;
  postsToday: number;
  lastPostDate: string; // YYYY-MM-DD format
  totalPosts: number;
}

export const AVATAR_COLORS = [
  '#9EADA0', // sage green
  '#B4C7A8', // soft green
  '#A8B8C8', // soft blue
  '#C8B8A8', // warm beige
  '#B8A8C8', // soft purple
  '#C8A8B8', // soft rose
  '#A8C8B8', // seafoam
  '#C8B8A8', // sand
];

export const MAX_POSTS_PER_DAY = 3;
export const MIN_POST_LENGTH = 10;
export const MAX_POST_LENGTH = 500;

// Admin UIDs
export const ADMIN_UIDS = ['dsA7nNvIaWckmHSJZMfBhGAPBFc2'];

export const isAdmin = (uid: string | null | undefined): boolean => {
  return !!uid && ADMIN_UIDS.includes(uid);
};
