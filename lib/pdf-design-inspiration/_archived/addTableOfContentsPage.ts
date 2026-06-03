import { PDFDocument, rgb } from 'pdf-lib';
import { addSectionHeading } from '../utils/addSectionHeading';
import { Audit } from '@/types/audit';

export const addTableOfContentsPage = async (pdfDoc: PDFDocument, auditData: Audit, headingFont: any, bodyFont: any) => {
  const { page: tocPage, width: tocWidth, contentStartY } = addSectionHeading(pdfDoc, 'Sample Pages', rgb(0, 0, 0), headingFont);

  const tocEntries = (auditData.pages || []).map((page, index) => ({
    title: page.pagePath || `Page ${index + 1}`,
    subtitle: page.meta?.title || page.url || 'Unknown Page',
    page: index + 3 // Assuming the TOC starts at page 3
  }));

  const startY = contentStartY - 30;
  const lineHeight = 12 * 1.5;
  const subtitleLineHeight = 10 * 1.2;
  const entrySpacing = 20; // Additional spacing between entries

  tocEntries.forEach((entry, index) => {
    const y = startY - index * (lineHeight + subtitleLineHeight + entrySpacing);

    // Draw the title
    tocPage.drawText(entry.title, {
      x: 50,
      y,
      size: 12,
      font: bodyFont,
      color: rgb(0, 0, 0),
    });

    // Draw the subtitle in italic
    tocPage.drawText(entry.subtitle, {
      x: 50,
      y: y - subtitleLineHeight - 5, // Add margin between title and subtitle
      size: 10,
      font: bodyFont,
      color: rgb(0.5, 0.5, 0.5) // Changed to gray
    });

    // Draw the page number aligned to the right
    const pageNumberText = `Page ${entry.page}`;
    const pageNumberWidth = bodyFont.widthOfTextAtSize(pageNumberText, 12);
    tocPage.drawText(pageNumberText, {
      x: tocWidth - 20 - pageNumberWidth, // Align to the right with 20px margin
      y,
      size: 12,
      font: bodyFont,
      color: rgb(0, 0, 0),
    });
  });
};
