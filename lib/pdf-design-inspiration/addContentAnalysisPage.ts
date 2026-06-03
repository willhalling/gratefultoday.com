import { PDFDocument, PDFFont, rgb } from 'pdf-lib';
import { ScrapedContent } from '@/types/audit';
import { addSectionPageHeading } from '../utils/addSectionPageHeading';
import { addSubHeader } from '../utils/addSubHeader';
// import { addWordCloud, WordCloudData } from '../utils/addWordCloud'; // Temporarily disabled
import { drawTextWithWrapping } from '../utils/drawTextWithWrapping';
import { wrapTextAdvanced } from '../utils/wrapTextAdvanced';

/**
 * Expected AI data structure for content enhancement:
 * pageData.ai = {
 *   meta: {
 *     title: { analysis: string, suggestion: string },
 *     description: { analysis: string, suggestion: string }
 *   },
 *   content: {
 *     tone: { analysis: string, suggestion: string },
 *     readability: { analysis: string, suggestion: string },
 *     intent: { analysis: string, suggestion: string }
 *   }
 * }
 * 
 * Note: heading and cta analysis are handled by separate pages
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

  // Helper function to format and clean text data
  const formatDataForTable = (data: string | undefined | null): string => {
    if (!data) return 'Missing';
    
    // Clean up extra whitespace and normalize
    return data
      .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
      .trim()                // Remove leading/trailing whitespace
      .replace(/\r\n|\n|\r/g, ' '); // Replace line breaks with spaces
  };

  // Add URL and Word Count at the top (same format as addContentPage)
  const wordCount = pageData.wordCount || 0;
  const isLowWordCount = wordCount < 300;
  const wordCountDisplay = isLowWordCount ? `${wordCount} (Low word count)` : wordCount.toString();
  
  const basicMetaData: [string, string, string?][] = [
    ['URL', formatDataForTable(pageData.url)],
    ['Word Count', wordCountDisplay]
  ];

  // Display basic metadata using the same layout as addContentPage
  const leftColumnX = leftMargin;
  const rightColumnX = leftMargin + (width - leftMargin) / 3;

  // Colors
  const headerColor = rgb(0.2, 0.2, 0.2);
  const textColor = rgb(0.4, 0.4, 0.4);
  const issueColor = rgb(0.8, 0.2, 0.2);
  const warningColor = rgb(0.9, 0.6, 0.1); // Orange warning color from addGeneralIssues
  const suggestionColor = rgb(0.2, 0.6, 0.2);
  
  // Custom drawing for word count with warning color
  if (isLowWordCount) {
    // Draw URL normally
    page.drawText('URL', {
      x: leftColumnX,
      y: currentY,
      size: 10,
      font: headingFont,
      color: headerColor
    });
    
    page.drawText(formatDataForTable(pageData.url), {
      x: rightColumnX,
      y: currentY,
      size: 10,
      font: bodyFont,
      color: textColor
    });
    
    currentY -= 20;
    
    // Draw Word Count with warning
    page.drawText('Word Count', {
      x: leftColumnX,
      y: currentY,
      size: 10,
      font: headingFont,
      color: headerColor
    });
    
    // Draw the number normally
    page.drawText(wordCount.toString(), {
      x: rightColumnX,
      y: currentY,
      size: 10,
      font: bodyFont,
      color: textColor
    });
    
    // Draw the warning text in smaller, orange font
    const numberWidth = bodyFont.widthOfTextAtSize(wordCount.toString(), 10);
    page.drawText(' (Low word count)', {
      x: rightColumnX + numberWidth,
      y: currentY,
      size: 10,
      font: bodyFont,
      color: warningColor
    });
    
    currentY -= 20;
  } else {
    // Use normal drawTextWithWrapping for non-low word count
    currentY = drawTextWithWrapping(page, currentY, leftColumnX, rightColumnX, headingFont, bodyFont, basicMetaData);
  }

  // Add Targeted Keywords section if AI keywords are available
  if ((pageData as any).ai?.meta?.keywords && (pageData as any).ai.meta.keywords.length > 0) {
    // No additional spacing needed - we're already positioned after the previous section
    
    // Draw "Targeted Keywords" header
    page.drawText('Targeted Keywords', {
      x: leftColumnX,
      y: currentY,
      size: 10,
      font: headingFont,
      color: headerColor
    });
    
    // Join keywords with commas and display them
    const keywordsText = (pageData as any).ai.meta.keywords.join(', ');
    // Use proper width calculation with margin from right edge
    const availableWidth = width - rightColumnX - 40; // Add 40px margin from right edge
    const keywordLines = wrapTextAdvanced(keywordsText, bodyFont, 10, availableWidth);
    
    let keywordY = currentY;
    keywordLines.forEach(line => {
      page.drawText(line, {
        x: rightColumnX,
        y: keywordY,
        size: 10,
        font: bodyFont,
        color: textColor // Use black color instead of suggestionColor (green)
      });
      keywordY -= 15;
    });
    
    currentY = keywordY - 5;
  }
  
  // Add some space after the basic metadata
  currentY -= 20;

  // Add sub-header for Content Analysis
  currentY = addSubHeader(
    page,
    'Content Analysis',
    leftMargin,
    currentY,
    headingFont,
    14,
    headerColor,
    tableWidth // Pass available width for full-width underline
  );
  
  // Table setup
  const columnWidths = {
    field: tableWidth * 0.25,
    current: tableWidth * 0.35,
    suggestion: tableWidth * 0.40
  };


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
  currentY -= 10;
  page.drawLine({
    start: { x: leftMargin, y: currentY },
    end: { x: leftMargin + tableWidth, y: currentY },
    thickness: 1,
    color: rgb(0.9, 0.9, 0.9)
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

    // Current column - use advanced wrapping for URLs and long strings
    const currentLines = wrapTextAdvanced(current, bodyFont, 9, columnWidths.current - 10);
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

    // Suggestion column - use advanced wrapping for consistency
    const suggestionLines = wrapTextAdvanced(suggestion, bodyFont, 9, columnWidths.suggestion - 10);
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
      formatDataForTable(pageData.meta?.title),
      ai.suggestion || 'Consider adding a more compelling title with target keywords',
      !pageData.meta?.title || (pageData.meta?.title?.length ?? 0) < 30
    );
  } else {
    addTableRow(
      'Meta Title',
      formatDataForTable(pageData.meta?.title),
      'Add a compelling title (50-60 characters) with target keywords',
      !pageData.meta?.title || (pageData.meta?.title?.length ?? 0) < 30
    );
  }

  // Check for meta description - Use AI data if available
  if ((pageData as any).ai?.meta?.description) {
    const ai = (pageData as any).ai.meta.description;
    addTableRow(
      'Meta Description',
      formatDataForTable(pageData.meta?.description),
      ai.suggestion || 'Add a compelling description that includes a call-to-action',
      !pageData.meta?.description
    );
  } else {
    addTableRow(
      'Meta Description',
      formatDataForTable(pageData.meta?.description),
      'Add a compelling description (150-160 characters) with call-to-action',
      !pageData.meta?.description
    );
  }

  // Check for language attribute with detailed analysis
  /*
  comment out language analysis for now as too much content on page
  const currentLanguage = pageData.meta?.language || 'Missing';
  const hasLanguageIssue = !pageData.meta?.language || pageData.meta.language === '';
  
  // Provide more specific suggestions based on current language
  let languageSuggestion = 'Specify page language to improve accessibility and SEO';
  
  if (hasLanguageIssue) {
    languageSuggestion = 'Add language attribute to <html> tag (e.g., lang="en-US", lang="en-GB", lang="es-ES")';
  } else if (pageData.meta?.language === 'en') {
    languageSuggestion = 'Consider using more specific language codes like "en-US" (American English) or "en-GB" (British English) for better localization';
  } else if (pageData.meta?.language && pageData.meta.language.length === 2) {
    // Generic language code like "es", "fr", "de" - suggest more specific variants
    const suggestions: Record<string, string> = {
      'es': 'Consider "es-ES" (Spain), "es-MX" (Mexico), or "es-US" (US Spanish)',
      'fr': 'Consider "fr-FR" (France), "fr-CA" (Canada), or "fr-CH" (Switzerland)',
      'de': 'Consider "de-DE" (Germany), "de-AT" (Austria), or "de-CH" (Switzerland)',
      'it': 'Consider "it-IT" (Italy) or "it-CH" (Switzerland)',
      'pt': 'Consider "pt-BR" (Brazil) or "pt-PT" (Portugal)',
      'zh': 'Consider "zh-CN" (Simplified Chinese) or "zh-TW" (Traditional Chinese)',
      'ar': 'Consider "ar-SA" (Saudi Arabia), "ar-EG" (Egypt), or other regional variants'
    };
    
    languageSuggestion = suggestions[pageData.meta.language] || 
      `Consider using more specific language codes like "${pageData.meta.language}-[COUNTRY]" for better localization`;
  }
  
  addTableRow(
    'Language',
    currentLanguage,
    languageSuggestion,
    hasLanguageIssue
  ); */

  // Check for canonical URL
  const currentCanonical = formatDataForTable(pageData.meta?.canonical);
  const hasCanonicalIssue = !pageData.meta?.canonical;
  
  let canonicalSuggestion = 'Add canonical URL to prevent duplicate content issues and consolidate page authority';
  
  if (hasCanonicalIssue) {
    canonicalSuggestion = 'Add <link rel="canonical" href="[URL]"> to specify the preferred version of this page and prevent duplicate content penalties';
  } else {
    // Normalize URLs for comparison (remove trailing slash, convert to lowercase, handle protocol)
    const normalizeUrl = (url: string): string => {
      return url
        .toLowerCase()
        .replace(/\/$/, '') // Remove trailing slash
        .replace(/^https?:\/\//, '') // Remove protocol for comparison
        .replace(/^www\./, ''); // Remove www for comparison
    };
    
    const normalizedCanonical = normalizeUrl(pageData.meta?.canonical || '');
    const normalizedCurrentUrl = normalizeUrl(pageData.url || '');
    
    const isCanonicalSelf = normalizedCanonical === normalizedCurrentUrl;
    
    if (isCanonicalSelf) {
      canonicalSuggestion = 'Canonical URL correctly set to self-reference. Ensure this is the preferred version of the content';
    } else {
      canonicalSuggestion = 'Canonical points to different URL. Verify this is intentional and the target URL contains the primary version of this content';
    }
  }
  
  // Special handling for canonical URL to ensure proper word wrapping
  const addCanonicalRow = (field: string, current: string, suggestion: string, hasIssue: boolean = false) => {
    // Field column
    page.drawText(field, {
      x: leftMargin,
      y: currentY,
      size: 10,
      font: headingFont,
      color: headerColor
    });

    // Current column with advanced word wrapping for URLs
    const currentLines = wrapTextAdvanced(current, bodyFont, 9, columnWidths.current - 10);
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

    // Suggestion column (green) - also use advanced wrapping for consistency
    const suggestionLines = wrapTextAdvanced(suggestion, bodyFont, 9, columnWidths.suggestion - 10);
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
  
  addCanonicalRow(
    'Canonical URL',
    currentCanonical,
    canonicalSuggestion,
    hasCanonicalIssue
  );

  // Check for content tone - Use AI data if available  
  if ((pageData as any).ai?.content?.tone) {
    const ai = (pageData as any).ai.content.tone;
    // Use AI analysis if available, fallback to contentAnalysis, then fallback message
    const currentTone = formatDataForTable(ai.analysis || (pageData as any).contentAnalysis?.toneAnalysis || 'Not analyzed');
    addTableRow(
      'Content Tone',
      currentTone,
      ai.suggestion || 'Ensure tone matches your target audience and business goals',
      false // AI provides specific guidance, so no generic issue flagging
    );
  } else {
    // Fallback to existing content analysis or show not analyzed
    const currentTone = formatDataForTable((pageData as any).contentAnalysis?.toneAnalysis || 'Not analyzed - AI enhancement available');
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
    const currentReadability = formatDataForTable(ai.analysis || (pageData as any).contentAnalysis?.readabilityLevel || 'Not analyzed');
    addTableRow(
      'Content Readability',
      currentReadability,
      ai.suggestion || 'Optimize content for your target audience reading level',
      false
    );
  } else if ((pageData as any).contentAnalysis?.readabilityLevel) {
    addTableRow(
      'Content Readability',
      formatDataForTable((pageData as any).contentAnalysis.readabilityLevel),
      'Ensure content matches your target audience comprehension level',
      false
    );
  }

  // Check for intent alignment - Use AI data if available
  if ((pageData as any).ai?.content?.intent) {
    const ai = (pageData as any).ai.content.intent;
    addTableRow(
      'Content Intent',
      formatDataForTable(ai.analysis || 'Content intent not specified'),
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
