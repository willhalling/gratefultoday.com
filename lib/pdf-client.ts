/**
 * Client-side PDF download utilities
 */

/**
 * Download a PDF challenge
 * @param slug - The challenge slug (e.g., "7-day-gratitude-challenge-for-recovery")
 * @param filename - Optional custom filename
 */
export async function downloadChallengePDF(slug: string, filename?: string): Promise<void> {
  try {
    const response = await fetch(`/api/pdf/${slug}`, {
      method: 'GET',
      headers: {
        Accept: 'application/pdf',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to download PDF');
    }

    // Get the PDF blob
    const blob = await response.blob();

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `${slug}.pdf`;

    // Trigger download
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('PDF download failed:', error);
    throw error;
  }
}

/**
 * Open PDF in new tab/window
 * @param slug - The challenge slug
 */
export async function viewChallengePDF(slug: string): Promise<void> {
  try {
    const url = `/api/pdf/${slug}`;
    window.open(url, '_blank');
  } catch (error) {
    console.error('Failed to open PDF:', error);
    throw error;
  }
}

/**
 * Get direct PDF URL for embedding or linking
 * @param slug - The challenge slug
 */
export function getChallengePDFUrl(slug: string): string {
  return `/api/pdf/${slug}`;
}
