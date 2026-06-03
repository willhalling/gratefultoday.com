/**
 * Example Component: PDF Challenge Download Button
 * Demonstrates how to use the PDF generation system
 */

'use client';

import { Button } from '@heroui/react';
import { useState } from 'react';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { HiDownload } from 'react-icons/hi';
import { HiDocumentText } from 'react-icons/hi2';
import { downloadChallengePDF, viewChallengePDF } from '@/lib/pdf-client';

interface PDFChallengeButtonProps {
  slug: string;
  challengeName: string;
  variant?: 'download' | 'view';
  className?: string;
}

/**
 * Button component to download or view a PDF challenge
 */
export function PDFChallengeButton({
  slug,
  challengeName,
  variant = 'download',
  className = '',
}: PDFChallengeButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (variant === 'download') {
        await downloadChallengePDF(slug);
      } else {
        await viewChallengePDF(slug);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to access PDF');
      console.error('PDF error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        color="primary"
        variant="solid"
        size="lg"
        startContent={
          isLoading ? (
            <AiOutlineLoading3Quarters className="w-5 h-5 animate-spin" />
          ) : variant === 'download' ? (
            <HiDownload className="w-5 h-5" />
          ) : (
            <HiDocumentText className="w-5 h-5" />
          )
        }
        isDisabled={isLoading}
        onPress={handleClick}
        className={className}
      >
        {isLoading
          ? 'Generating PDF...'
          : variant === 'download'
            ? `Download ${challengeName}`
            : `View ${challengeName}`}
      </Button>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

/**
 * Card component showcasing a PDF challenge
 */
interface PDFChallengeCardProps {
  slug: string;
  title: string;
  description: string;
  features?: string[];
}

export function PDFChallengeCard({
  slug,
  title,
  description,
  features = [],
}: PDFChallengeCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start gap-4 mb-4">
        <div className="bg-brand-green-100 dark:bg-brand-green-900 p-3 rounded-lg">
          <HiDocumentText className="w-6 h-6 text-brand-green-700 dark:text-brand-green-300" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
          <p className="text-gray-600 dark:text-gray-300">{description}</p>
        </div>
      </div>

      {features.length > 0 && (
        <ul className="mb-4 space-y-2">
          {features.map((feature, index) => (
            <li
              key={index}
              className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2"
            >
              <span className="text-brand-green-600 dark:text-brand-green-400 mt-0.5">✓</span>
              {feature}
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-3">
        <PDFChallengeButton slug={slug} challengeName="PDF" variant="download" className="flex-1" />
        <PDFChallengeButton
          slug={slug}
          challengeName=""
          variant="view"
          className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
        />
      </div>
    </div>
  );
}
