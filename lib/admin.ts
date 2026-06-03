/**
 * Admin authorization utilities
 * Centralized admin UID management for scalability
 */

// List of authorized admin UIDs
// Add new admin UIDs here
const ADMIN_UIDS = [
  'dsA7nNvIaWckmHSJZMfBhGAPBFc2', // Primary admin
  // Add more admin UIDs here as needed
];

/**
 * Check if a user ID is an authorized admin
 */
export function isAdmin(uid: string | null | undefined): boolean {
  if (!uid) return false;
  return ADMIN_UIDS.includes(uid);
}

/**
 * Get list of all admin UIDs
 */
export function getAdminUids(): string[] {
  return [...ADMIN_UIDS];
}

/**
 * Throws an error if the user is not an admin
 * Use this in API routes or server components
 */
export function requireAdmin(uid: string | null | undefined): void {
  if (!isAdmin(uid)) {
    throw new Error('Unauthorized: Admin access required');
  }
}
