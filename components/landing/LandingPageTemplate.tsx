import React, { ReactNode } from 'react';
import HeroWithImage from '@/components/heros/hero-with-image';
import NewsletterForm from '@/components/NewsletterForm';

export interface LandingPageSection {
  id: string;
  title?: string;
  content: ReactNode;
  backgroundColor?: 'neutral-50' | 'neutral-100' | 'primary' | 'secondary' | 'white';
  textAlign?: 'left' | 'center';
  maxWidth?: '4xl' | '5xl' | '6xl';
  padding?: 'sm' | 'md' | 'lg';
}

export interface LandingPageHero {
  title: string;
  subtitle: string;
  backgroundImage?: string;
  backgroundOpacity?: number;
  textAlign?: 'left' | 'center';
  afterSubtitle?: ReactNode;
  ctas?: Array<{
    href?: string;
    text: string;
    variant?: 'primary' | 'secondary';
    onClick?: () => void;
  }>;
}

export interface LandingPageFormSection {
  title: string;
  subtitle: string;
  downloadUrl?: string;
  customForm?: ReactNode;
  formPosition?: 'sidebar' | 'inline';
  whatHappensNext?: string[];
}

export interface LandingPageTemplateProps {
  hero: LandingPageHero;
  contentSections: LandingPageSection[];
  formSection: LandingPageFormSection;
  formInHero?: boolean;
  mainRight?: ReactNode;
  swapColumns?: boolean;
  finalCTA?: {
    title: string;
    subtitle: string;
    buttonText: string;
    backgroundColor?: 'primary' | 'secondary' | 'accent';
  };
}

const LandingPageTemplate: React.FC<LandingPageTemplateProps> = ({
  hero,
  contentSections,
  formSection,
  formInHero = false,
  mainRight,
  swapColumns = false,
  finalCTA,
}) => {
  const getMaxWidth = (maxWidth?: string) => {
    switch (maxWidth) {
      case '4xl':
        return 'max-w-4xl';
      case '5xl':
        return 'max-w-5xl';
      case '6xl':
        return 'max-w-6xl';
      default:
        return 'max-w-6xl';
    }
  };

  const getPadding = (padding?: string) => {
    switch (padding) {
      case 'sm':
        return 'py-8';
      case 'md':
        return 'py-12';
      case 'lg':
        return 'py-16';
      default:
        return 'py-16';
    }
  };

  const getBackgroundColor = (bg?: string) => {
    switch (bg) {
      case 'neutral-50':
        return 'bg-neutral-50';
      case 'neutral-100':
        return 'bg-neutral-100';
      case 'primary':
        return 'bg-primary';
      case 'secondary':
        return 'bg-secondary';
      case 'white':
        return 'bg-white';
      default:
        return 'bg-neutral-50';
    }
  };

  // Find the main content section to render with the form
  const mainContentSection = contentSections.find((section) => section.id === 'main-content');
  const otherSections = contentSections.filter((section) => section.id !== 'main-content');

  const FormCard = (
    <div className="bg-white rounded-xl shadow-xl p-8 border-2 border-accent">
      <h3 className="text-2xl font-bold text-neutral-900 mb-2">{formSection.title}</h3>
      <p className="text-neutral-600 mb-6">{formSection.subtitle}</p>

      {formSection.customForm ? (
        formSection.customForm
      ) : (
        <NewsletterForm downloadUrl={formSection.downloadUrl || ''} />
      )}

      {formSection.whatHappensNext && (
        <div className="mt-6 pt-6 border-t border-neutral-200 bg-neutral-50 -mx-8 px-8 -mb-8 pb-8 rounded-b-xl">
          <p className="text-sm text-neutral-600 mb-3">
            <strong>What happens next:</strong>
          </p>
          <ol className="text-sm text-neutral-600 space-y-2 ml-4">
            {formSection.whatHappensNext.map((step, index) => (
              <li key={index}>
                {index + 1}. {step}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );

  return (
    <div>
      {/* Hero Section */}
      <HeroWithImage
        title={hero.title}
        subtitle={hero.subtitle}
        backgroundImage={hero.backgroundImage}
        backgroundOpacity={hero.backgroundOpacity}
        textAlign={hero.textAlign}
        ctas={hero.ctas}
        afterSubtitle={hero.afterSubtitle}
        rightContent={formInHero ? (
          <div className="self-center">{FormCard}</div>
        ) : undefined}
      />

      {/* Main Content + Form Section */}
      {mainContentSection && (
        <div
          className={`${getBackgroundColor(mainContentSection.backgroundColor)} ${getPadding(mainContentSection.padding)}`}
        >
          <div
            className={`mx-auto ${getMaxWidth(mainContentSection.maxWidth)} px-4 sm:px-6 lg:px-8`}
          >
            <div className="grid lg:grid-cols-2 gap-12">
              {swapColumns ? (
                <>
                  {/* Left: Custom content or Form */}
                  <div>
                    <div className="sticky top-8">
                      {mainRight ? mainRight : (!formInHero ? FormCard : null)}
                    </div>
                  </div>
                  
                  {/* Right: Main Content */}
                  <div>{mainContentSection.content}</div>
                </>
              ) : (
                <>
                  {/* Left: Main Content */}
                  <div>{mainContentSection.content}</div>

                  {/* Right: Custom content or Form */}
                  <div>
                    <div className="sticky top-8">
                      {mainRight ? mainRight : (!formInHero ? FormCard : null)}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Additional Sections */}
      {otherSections.map((section) => (
        <div
          key={section.id}
          className={`${getBackgroundColor(section.backgroundColor)} ${getPadding(section.padding)}`}
        >
          <div
            className={`mx-auto ${getMaxWidth(section.maxWidth)} px-4 sm:px-6 lg:px-8 ${section.textAlign === 'center' ? 'text-center' : ''}`}
          >
            {section.title && (
              <h2 className="text-3xl font-bold text-neutral-900 mb-8">{section.title}</h2>
            )}
            {section.content}
          </div>
        </div>
      ))}

      {/* Final CTA */}
      {finalCTA && (
        <div className={`bg-${finalCTA.backgroundColor || 'primary'} py-16`}>
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{finalCTA.title}</h2>
            <p className="text-xl text-white/90 mb-8">{finalCTA.subtitle}</p>
            <a
              href="#top"
              className="inline-flex items-center rounded-lg bg-accent px-8 py-4 text-neutral-900 text-lg font-semibold shadow-md hover:bg-accent-600 transition-colors"
            >
              {finalCTA.buttonText}
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPageTemplate;
