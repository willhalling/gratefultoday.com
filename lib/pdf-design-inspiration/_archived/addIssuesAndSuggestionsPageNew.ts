import { PDFDocument, PDFFont, rgb } from 'pdf-lib';
import { ScrapedContent } from '@/types/audit';
import { addSectionPageHeading } from '../utils/addSectionPageHeading';

export const addIssuesAndSuggestionsPage = async (
  pdfDoc: PDFDocument, 
  pageData: ScrapedContent, 
  headingFont: PDFFont, 
  bodyFont: PDFFont,
  pageIndex: number = 0
) => {
  // Create page with heading
  const { page, width, contentStartY, contentStartX } = addSectionPageHeading(
    pdfDoc,
    'Improvement Suggestions',
    rgb(1, 1, 1), // White text on colored background
    headingFont,
    pageIndex,
    pageData.url,
    rgb(0.3, 0.3, 0.3) // Gray color for URL
  );

  let currentY = contentStartY - 30;
  const leftMargin = contentStartX;
  const tableWidth = width - leftMargin - 40;
  
  // Table setup
  const columnWidths = {
    field: tableWidth * 0.25,
    current: tableWidth * 0.35,
    suggestion: tableWidth * 0.40
  };

  // Colors
  const headerColor = rgb(0.2, 0.2, 0.2);
  const textColor = rgb(0.4, 0.4, 0.4);
  const issueColor = rgb(0.8, 0.2, 0.2);
  const suggestionColor = rgb(0.2, 0.6, 0.2);

  // Table header
  currentY -= 10;
  page.drawText('Field', {
    x: leftMargin,
    y: currentY,
    size: 12,
    font: headingFont,
    color: headerColor
  });

  page.drawText('Current', {
    x: leftMargin + columnWidths.field,
    y: currentY,
    size: 12,
    font: headingFont,
    color: headerColor
  });

  page.drawText('Suggested Improvement', {
    x: leftMargin + columnWidths.field + columnWidths.current,
    y: currentY,
    size: 12,
    font: headingFont,
    color: headerColor
  });

  // Header underline
  currentY -= 15;
  page.drawLine({
    start: { x: leftMargin, y: currentY },
    end: { x: leftMargin + tableWidth, y: currentY },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8)
  });

  currentY -= 20;

  // Helper function to add table row
  const addTableRow = (field: string, current: string, suggestion: string, hasIssue: boolean = false) => {
    // Field column
    page.drawText(field, {
      x: leftMargin,
      y: currentY,
      size: 10,
      font: headingFont,
      color: headerColor
    });

    // Current column (red if issue)
    const currentLines = wrapText(current, bodyFont, 9, columnWidths.current - 10);
    let lineY = currentY;
    for (const line of currentLines) {
      page.drawText(line, {
        x: leftMargin + columnWidths.field,
        y: lineY,
        size: 9,
        font: bodyFont,
        color: hasIssue ? issueColor : textColor
      });
      lineY -= 12;
    }

    // Suggestion column (green)
    const suggestionLines = wrapText(suggestion, bodyFont, 9, columnWidths.suggestion - 10);
    lineY = currentY;
    for (const line of suggestionLines) {
      page.drawText(line, {
        x: leftMargin + columnWidths.field + columnWidths.current,
        y: lineY,
        size: 9,
        font: bodyFont,
        color: suggestionColor
      });
      lineY -= 12;
    }

    // Calculate spacing based on text height
    const maxLines = Math.max(currentLines.length, suggestionLines.length);
    currentY -= (maxLines * 12) + 20;
  };

  // Check for meta title
  if (pageData.aiEnhancement?.metaTitle) {
    const ai = pageData.aiEnhancement.metaTitle;
    addTableRow(
      'Meta Title',
      ai.current || pageData.metaTitle,
      ai.suggestions?.[0] || 'Consider adding a more compelling title with target keywords',
      !pageData.metaTitle || pageData.metaTitle.length < 30
    );
  } else {
    addTableRow(
      'Meta Title',
      pageData.metaTitle || 'Missing',
      'Add a compelling title (50-60 characters) with target keywords',
      !pageData.metaTitle
    );
  }

  // Check for meta description
  if (pageData.aiEnhancement?.metaDescription) {
    const ai = pageData.aiEnhancement.metaDescription;
    addTableRow(
      'Meta Description',
      ai.current || pageData.metaDescription || 'Missing',
      ai.suggestions?.[0] || 'Add a compelling description that includes a call-to-action',
      !pageData.metaDescription
    );
  } else {
    addTableRow(
      'Meta Description',
      pageData.metaDescription || 'Missing',
      'Add a compelling description (150-160 characters) with call-to-action',
      !pageData.metaDescription
    );
  }

  // Check for headings
  if (pageData.aiEnhancement?.headings) {
    const ai = pageData.aiEnhancement.headings;
    addTableRow(
      'Main Heading (H1)',
      ai.current || (pageData as any).headings?.h1?.[0] || 'Missing',
      ai.suggestions?.[0] || 'Use benefit-focused language that speaks to your audience',
      !(pageData as any).headings?.h1?.[0]
    );
  } else {
    addTableRow(
      'Main Heading (H1)',
      (pageData as any).headings?.h1?.[0] || 'Missing',
      'Use clear, benefit-focused language that speaks to your target audience',
      !(pageData as any).headings?.h1?.[0]
    );
  }

  // Check for CTAs
  if (pageData.aiEnhancement?.ctas) {
    const ai = pageData.aiEnhancement.ctas;
    const currentCTAs = pageData.ctas && pageData.ctas.length > 0 
      ? pageData.ctas.slice(0, 3).join(', ') 
      : 'None found';
    addTableRow(
      'Call-to-Actions',
      currentCTAs,
      ai.suggestions?.slice(0, 3).join(', ') || 'Use action-oriented language: "Get Started", "Learn More", "Contact Us"',
      !pageData.ctas || pageData.ctas.length === 0
    );
  } else {
    const currentCTAs = pageData.ctas && pageData.ctas.length > 0 
      ? pageData.ctas.slice(0, 3).join(', ') 
      : 'None found';
    addTableRow(
      'Call-to-Actions',
      currentCTAs,
      'Add clear action buttons: "Get Started Today", "Learn More", "Contact Us"',
      !pageData.ctas || pageData.ctas.length === 0
    );
  }

  // Check for content tone
  if (pageData.aiEnhancement?.contentTone) {
    const ai = pageData.aiEnhancement.contentTone;
    addTableRow(
      'Content Tone',
      ai.current || pageData.contentAnalysis?.toneAnalysis || 'Not analyzed',
      ai.suggestion || 'Ensure tone matches your target audience and business goals',
      !!ai.issue
    );
  } else {
    addTableRow(
      'Content Tone',
      pageData.contentAnalysis?.toneAnalysis || 'Not analyzed',
      'Ensure your tone matches your target audience and business goals',
      false
    );
  }

  // Footer note
  if (currentY > 80) {
    currentY -= 20;
    page.drawText('💡 Focus on implementing these improvements to enhance user experience and conversions.', {
      x: leftMargin,
      y: 50,
      size: 10,
      font: bodyFont,
      color: rgb(0.5, 0.5, 0.5)
    });
  }
};

// Helper function to wrap text
function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const textWidth = font.widthOfTextAtSize(testLine, fontSize);

    if (textWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        lines.push(word);
      }
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}
