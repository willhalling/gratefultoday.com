import { PDFDocument, rgb } from 'pdf-lib';
import { ScrapedContent } from '@/types/audit';
import { addSectionPageHeading } from '../utils/addSectionPageHeading';
import { addList } from '../utils/addList';

export const addPageAccessibilityRecommendations = async (
  doc: PDFDocument,
  pageData: ScrapedContent,
  headingFont: any,
  bodyFont: any,
  pageIndex: number = 0
): Promise<void> => {
  
  // Create page with diagonal heading - Pages section
  const { page, width, contentStartY, contentStartX } = addSectionPageHeading(
    doc,
    'Accessibility Recommendations',
    rgb(1, 1, 1), // White text
    headingFont,
    pageIndex, // Use matching page index for color consistency
    'PAGES',
    rgb(0.3, 0.3, 0.3)
  );

  // Colors
  const darkBlue = rgb(0.067, 0.118, 0.294);
  const green = rgb(0.396, 0.639, 0.082);

  let yPosition = contentStartY - 20;

  // Simple recommendations list
  page.drawText('Accessibility Best Practices', {
    x: contentStartX,
    y: yPosition,
    size: 16,
    font: headingFont,
    color: darkBlue,
  });

  yPosition -= 20;

  const recommendations = [
    'Add descriptive alt text to all images',
    'Use proper heading hierarchy (H1, H2, H3, etc.)',
    'Ensure sufficient color contrast (4.5:1 minimum)',
    'Make all interactive elements keyboard accessible',
    'Use ARIA labels for complex UI components',
    'Test with screen readers regularly',
    'Provide skip navigation links',
    'Use semantic HTML elements',
    'Ensure forms have proper labels',
    'Test with keyboard navigation only'
  ];

  // Use green circles for consistency
  const maxWidth = width - contentStartX - 50;
  yPosition = addList(page, yPosition, contentStartX + 10, maxWidth, bodyFont, recommendations, green);
};
