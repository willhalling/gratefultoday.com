import React from 'react';

export interface NewsletterContent {
  title: string;
  subtitle: string;
  date: string;
  greeting: string;
  mainContent: string[];
  gratitudes: string[];
  closingThought: string;
  callToAction?: string;
  signature: string;
}

interface NewsletterTemplateProps {
  content: NewsletterContent;
}

export function NewsletterTemplate({ content }: NewsletterTemplateProps) {
  return (
    <div className="min-h-screen bg-neutral-50 pt-4 pb-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm border border-neutral-200">
        {/* Header */}
        <div className="p-8 md:p-12 border-b border-neutral-200">
          <p className="text-sm text-neutral-500 mb-2">{content.date}</p>
          <h1 className="text-3xl md:text-4xl font-bold text-neutral-900">
            {content.title}
          </h1>
        </div>

        {/* Greeting */}
        <div className="px-8 md:px-12 pt-8">
          <p className="text-neutral-900 mb-4">{content.greeting}</p>
        </div>

        {/* Main Content */}
        <div className="px-8 md:px-12">
          {content.mainContent.map((paragraph, index) => (
            <p key={index} className="text-neutral-800 leading-relaxed mb-4" dangerouslySetInnerHTML={{ __html: paragraph.split('\n').join('<br>') }} />
          ))}
        </div>

        {/* Signature */}
        <div className="px-8 md:px-12">
          <p className="text-neutral-800 leading-relaxed mb-4">— {content.closingThought}</p>
        </div>

        {/* Call to Action */}
        {content.callToAction && (
          <div className="px-8 md:px-12 mb-4">
            <p className="text-neutral-800 leading-relaxed italic">
              {content.callToAction}
            </p>
          </div>
        )}

        {/* Links */}
        <div className="px-8 md:px-12 pb-8 md:pb-12">
          <ul className="space-y-1 text-base leading-relaxed">
            <li>
              <a href="https://iam.gratefultoday.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Share Gratitude
              </a>
            </li>
            <li>
              <a href="https://gratefultoday.com" className="text-neutral-600 hover:underline">
                Grateful Today Homepage
              </a>
            </li>
            <li>
              <a href="https://www.youtube.com/@GratefulToday" target="_blank" rel="noopener noreferrer" className="text-neutral-600 hover:underline">
                YouTube
              </a>
            </li>
          </ul>
        </div>

        {/* Footer */}
        <div className="px-8 md:px-12 py-5 bg-neutral-50 rounded-b-lg">
          <p className="text-center text-xs text-neutral-600 mb-2">GratefulToday</p>
          <p className="text-center text-xs text-neutral-400">
            <a href="#" className="text-neutral-600 underline">Unsubscribe</a>
          </p>
        </div>
      </div>
    </div>
  );
}
