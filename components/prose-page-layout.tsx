import React from 'react';

interface ProsePageLayoutProps {
  /**
   * Page title/heading
   */
  title: string;
  /**
   * Optional subtitle
   */
  subtitle?: string;
  /**
   * Main content
   */
  children: React.ReactNode;
  /**
   * Maximum width of content
   * @default 'prose' (65ch)
   */
  maxWidth?: 'prose' | 'wide' | 'full';
}

export default function ProsePageLayout({
  title,
  subtitle,
  children,
  maxWidth = 'prose',
}: ProsePageLayoutProps) {
  const maxWidthClasses = {
    prose: 'max-w-prose', // ~65ch
    wide: 'max-w-4xl',
    full: 'max-w-7xl',
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Heading Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-neutral-800 mb-4">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xl text-neutral-600 max-w-2xl mx-auto">{subtitle}</p>
          )}
        </div>

        {/* Prose Content */}
        <div className={`${maxWidthClasses[maxWidth]} mx-auto`}>
          <div className="prose prose-lg prose-neutral prose-headings:font-heading prose-headings:text-neutral-800 prose-p:text-neutral-700 prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
