/**
 * Simple usage examples for the PDF Challenge Generator
 * Copy these patterns into your own components
 */

'use client';

import { useState } from 'react';
import { downloadChallengePDF, viewChallengePDF, getChallengePDFUrl } from '@/lib/pdf-client';

// ===== EXAMPLE 1: Simple Download Button =====
export function SimpleDownloadButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    setIsLoading(true);
    try {
      await downloadChallengePDF('7-day-gratitude-challenge-for-recovery');
      alert('PDF downloaded successfully!');
    } catch (error) {
      alert('Failed to download PDF');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button onClick={handleDownload} disabled={isLoading}>
      {isLoading ? 'Downloading...' : 'Download 7-Day Challenge'}
    </button>
  );
}

// ===== EXAMPLE 2: View in New Tab =====
export function ViewPDFButton() {
  const handleView = () => {
    viewChallengePDF('7-day-gratitude-challenge-for-recovery');
  };

  return <button onClick={handleView}>View PDF</button>;
}

// ===== EXAMPLE 3: Direct Link =====
export function DirectPDFLink() {
  const pdfUrl = getChallengePDFUrl('7-day-gratitude-challenge-for-recovery');

  return (
    <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
      Open Challenge PDF
    </a>
  );
}

// ===== EXAMPLE 4: Inline PDF Viewer =====
export function InlinePDFViewer() {
  const pdfUrl = getChallengePDFUrl('7-day-gratitude-challenge-for-recovery');

  return (
    <div style={{ width: '100%', height: '800px' }}>
      <iframe
        src={pdfUrl}
        width="100%"
        height="100%"
        style={{ border: 'none' }}
        title="PDF Challenge"
      />
    </div>
  );
}

// ===== EXAMPLE 5: With Error Handling =====
export function RobustDownloadButton() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleDownload = async () => {
    setStatus('loading');
    setErrorMessage('');

    try {
      await downloadChallengePDF(
        '7-day-gratitude-challenge-for-recovery',
        'my-custom-filename.pdf' // Optional custom filename
      );
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  return (
    <div>
      <button onClick={handleDownload} disabled={status === 'loading'}>
        {status === 'loading' && 'Generating PDF...'}
        {status === 'success' && '✓ Downloaded!'}
        {status === 'error' && '✗ Failed'}
        {status === 'idle' && 'Download Challenge'}
      </button>
      {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
    </div>
  );
}

// ===== EXAMPLE 6: Multiple Challenges =====
export function ChallengeSelector() {
  const challenges = [
    {
      slug: '7-day-gratitude-challenge-for-recovery',
      name: '7-Day Recovery Challenge',
    },
    // Add more as they're created
  ];

  return (
    <div>
      <h2>Available Challenges</h2>
      {challenges.map((challenge) => (
        <div key={challenge.slug} style={{ marginBottom: '10px' }}>
          <button onClick={() => downloadChallengePDF(challenge.slug)}>
            Download {challenge.name}
          </button>
        </div>
      ))}
    </div>
  );
}

// ===== EXAMPLE 7: Share Button =====
export function SharePDFButton() {
  const handleShare = async () => {
    const url =
      window.location.origin + getChallengePDFUrl('7-day-gratitude-challenge-for-recovery');

    if (navigator.share) {
      // Use Web Share API if available
      await navigator.share({
        title: '7-Day Gratitude Challenge for Recovery',
        text: 'Check out this free gratitude challenge!',
        url: url,
      });
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  return <button onClick={handleShare}>Share Challenge</button>;
}
