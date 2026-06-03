import { PDFDocument, PDFFont, rgb } from 'pdf-lib';
import { ScrapedContent } from '@/types/audit';
import { addSectionPageHeading } from '../utils/addSectionPageHeading';
// import { addWordCloud, WordCloudData } from '../utils/addWordCloud'; // Temporarily disabled
import { drawTextWithWrapping } from '../utils/drawTextWithWrapping';

/**
 * Expected AI data structure for content enhancement:
 * pageData.ai = {
 *   meta: {
 *     title: { analysis: string, suggestion: string },
 *     description: { analysis: string, suggestion: string }
 *   },
 *   content: {
 *     heading: { analysis: string, suggestion: string },
 *     cta: { analysis: string, suggestion: string },
 *     tone: { analysis: string, suggestion: string },
 *     readability: { analysis: string, suggestion: string },
 *     intent: { analysis: string, suggestion: string }
 *   }
 * }
 */

// Page colors from addSectionPageHeading - temporarily disabled with word cloud
/*
const PAGE_COLORS = [
  { r: 0.2, g: 0.4, b: 0.8 },  // Blue
  { r: 0.2, g: 0.7, b: 0.4 },  // Green
  { r: 0.9, g: 0.5, b: 0.2 },  // Orange
  { r: 0.6, g: 0.2, b: 0.8 },  // Purple
  { r: 0.2, g: 0.8, b: 0.7 },  // Teal
  { r: 0.9, g: 0.2, b: 0.3 },  // Red
];
*/

export const addContentAnalysisPage = async (
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

  let currentY = contentStartY - 20;
  const leftMargin = contentStartX;
  const tableWidth = width - leftMargin - 40;

  // Add URL and Word Count at the top (same format as addContentPage)
  const basicMetaData: [string, string, string?][] = [
    ['URL', pageData.url],
    ['Word Count', (pageData.wordCount || 0).toString()]
  ];

  // Display basic metadata using the same layout as addContentPage
  const leftColumnX = leftMargin;
  const rightColumnX = leftMargin + (width - leftMargin) / 3;
  
  currentY = drawTextWithWrapping(page, currentY, leftColumnX, rightColumnX, headingFont, bodyFont, basicMetaData);
  
  // Add some space after the basic metadata
  currentY -= 30;
  
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

  // Check for meta title - Use AI data if available
  if ((pageData as any).ai?.meta?.title) {
    const ai = (pageData as any).ai.meta.title;
    addTableRow(
      'Meta Title',
      pageData.meta?.title || 'Missing',
      ai.suggestion || 'Consider adding a more compelling title with target keywords',
      !pageData.meta?.title || (pageData.meta?.title?.length ?? 0) < 30
    );
  } else {
    addTableRow(
      'Meta Title',
      pageData.meta?.title || 'Missing',
      'Add a compelling title (50-60 characters) with target keywords',
      !pageData.meta?.title || (pageData.meta?.title?.length ?? 0) < 30
    );
  }

  // Check for meta description - Use AI data if available
  if ((pageData as any).ai?.meta?.description) {
    const ai = (pageData as any).ai.meta.description;
    addTableRow(
      'Meta Description',
      pageData.meta?.description || 'Missing',
      ai.suggestion || 'Add a compelling description that includes a call-to-action',
      !pageData.meta?.description
    );
  } else {
    addTableRow(
      'Meta Description',
      pageData.meta?.description || 'Missing',
      'Add a compelling description (150-160 characters) with call-to-action',
      !pageData.meta?.description
    );
  }

  // Check for headings - Use AI data if available
  if ((pageData as any).ai?.content?.heading) {
    const ai = (pageData as any).ai.content.heading;
    addTableRow(
      'Main Heading (H1)',
      pageData.headers?.h1 || 'Missing',
      ai.suggestion || 'Use benefit-focused language that speaks to your audience',
      !pageData.headers?.h1
    );
  } else {
    addTableRow(
      'Main Heading (H1)',
      pageData.headers?.h1 || 'Missing',
      'Use clear, benefit-focused language that speaks to your target audience',
      !pageData.headers?.h1
    );
  }

  // Check for CTAs - Use AI data if available
  if ((pageData as any).ai?.content?.cta) {
    const ai = (pageData as any).ai.content.cta;
    const currentCTAs = (pageData.ctas?.length ?? 0) > 0 
      ? pageData.ctas!.slice(0, 3).join(', ') 
      : 'None found';
    addTableRow(
      'Call-to-Actions',
      currentCTAs,
      ai.suggestion || 'Use action-oriented language: "Get Started", "Learn More", "Contact Us"',
      !pageData.ctas || (pageData.ctas?.length ?? 0) === 0
    );
  } else {
    const currentCTAs = (pageData.ctas?.length ?? 0) > 0 
      ? pageData.ctas!.slice(0, 3).join(', ') 
      : 'None found';
    addTableRow(
      'Call-to-Actions',
      currentCTAs,
      'Add clear action buttons: "Get Started Today", "Learn More", "Contact Us"',
      !pageData.ctas || (pageData.ctas?.length ?? 0) === 0
    );
  }

  // Check for content tone - Use AI data if available  
  if ((pageData as any).ai?.content?.tone) {
    const ai = (pageData as any).ai.content.tone;
    // Use AI analysis if available, fallback to contentAnalysis, then fallback message
    const currentTone = ai.analysis || (pageData as any).contentAnalysis?.toneAnalysis || 'Not analyzed';
    addTableRow(
      'Content Tone',
      currentTone,
      ai.suggestion || 'Ensure tone matches your target audience and business goals',
      false // AI provides specific guidance, so no generic issue flagging
    );
  } else {
    // Fallback to existing content analysis or show not analyzed
    const currentTone = (pageData as any).contentAnalysis?.toneAnalysis || 'Not analyzed - AI enhancement available';
    addTableRow(
      'Content Tone',
      currentTone,
      'Ensure your tone matches your target audience and business goals',
      false
    );
  }

  // Check for readability - Use AI data if available
  if ((pageData as any).ai?.content?.readability) {
    const ai = (pageData as any).ai.content.readability;
    const currentReadability = ai.analysis || (pageData as any).contentAnalysis?.readabilityLevel || 'Not analyzed';
    addTableRow(
      'Content Readability',
      currentReadability,
      ai.suggestion || 'Optimize content for your target audience reading level',
      false
    );
  } else if ((pageData as any).contentAnalysis?.readabilityLevel) {
    addTableRow(
      'Content Readability',
      (pageData as any).contentAnalysis.readabilityLevel,
      'Ensure content matches your target audience comprehension level',
      false
    );
  }

  // Check for intent alignment - Use AI data if available
  if ((pageData as any).ai?.content?.intent) {
    const ai = (pageData as any).ai.content.intent;
    addTableRow(
      'Content Intent',
      ai.analysis || 'Content intent not specified',
      ai.suggestion || 'Align content with user search intent and business goals',
      false
    );
  }

  // End of table - word cloud temporarily disabled
  // currentY -= 30;

  // TODO: Re-enable word cloud when ready
  /*
  // Add word cloud if available
  if (pageData.wordCloudData && pageData.wordCloudData.length > 0) {
    // Convert the word cloud data to the expected format
    const wordCloudData: WordCloudData[] = pageData.wordCloudData.map((item: any) => ({
      text: item.text,
      size: item.size
    }));
    
    // Use full available width for word cloud, properly centered
    const availableWidth = width - leftMargin - 20; // Account for margins
    
    // Position word cloud below the table, centered in available space
    const wordCloudX = leftMargin + availableWidth / 2; // Center point
    const wordCloudY = currentY - 120; // Position below table
    const wordCloudWidth = availableWidth - 20; // Almost full width with small margins
    const wordCloudHeight = 280; // Good height for full width display
    
    // Get page color for word cloud
    const pageColor = PAGE_COLORS[pageIndex % PAGE_COLORS.length];
    
    // Draw white background for word cloud (full width)
    page.drawRectangle({
      x: leftMargin,
      y: currentY - 300,
      width: availableWidth,
      height: 300,
      color: rgb(1, 1, 1), // White background
    });
    
    try {
      await addWordCloud(
        page, 
        wordCloudX, 
        wordCloudY, 
        wordCloudWidth, 
        wordCloudHeight, 
        wordCloudData,
        pageColor
      );
    } catch (error) {
      console.error('Error adding word cloud to issues page:', error);
    }
  } else {
    // Show placeholder message for word cloud
    const availableWidth = width - leftMargin - 20;
    
    // Draw white background for placeholder
    page.drawRectangle({
      x: leftMargin,
      y: currentY - 150,
      width: availableWidth,
      height: 150,
      color: rgb(0.98, 0.98, 0.98), // Light gray background
      borderColor: rgb(0.9, 0.9, 0.9),
      borderWidth: 1
    });
    
    // Add placeholder text
    const placeholderText = 'Word Cloud Analysis - Coming Soon';
    const subText = 'AI-powered keyword analysis will appear here';
    
    const mainTextWidth = headingFont.widthOfTextAtSize(placeholderText, 16);
    const subTextWidth = bodyFont.widthOfTextAtSize(subText, 12);
    
    page.drawText(placeholderText, {
      x: leftMargin + (availableWidth - mainTextWidth) / 2,
      y: currentY - 80,
      size: 16,
      font: headingFont,
      color: rgb(0.4, 0.4, 0.4),
    });
    
    page.drawText(subText, {
      x: leftMargin + (availableWidth - subTextWidth) / 2,
      y: currentY - 105,
      size: 12,
      font: bodyFont,
      color: rgb(0.6, 0.6, 0.6),
    });
  }
  */
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
