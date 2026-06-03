import { PDFDocument, PDFFont, rgb } from 'pdf-lib';
import { ScrapedContent } from '@/types/audit';
import { addSectionPageHeading } from '../utils/addSectionPageHeading';

interface IssueEntry {
  number: number;
  field: string;
  type: 'issue' | 'suggestion';
  description: string;
  severity: 'high' | 'medium' | 'low';
}

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
    'Issues & Suggestions',
    rgb(1, 1, 1), // White text on colored background
    headingFont,
    pageIndex,
    pageData.url,
    rgb(0.3, 0.3, 0.3) // Gray color for URL
  );

  // Calculate layout dimensions
  const contentWidth = width - contentStartX - 40;
  let currentY = contentStartY - 30;

  // Analyze this specific page for issues
  const pageIssues = analyzePageIssues(pageData, 1);

  // If no issues found, show a positive message
  if (pageIssues.length === 0) {
    currentY -= 20;
    page.drawText('🎉 Great news! No critical issues found on this page.', {
      x: contentStartX,
      y: currentY,
      size: 16,
      font: headingFont,
      color: rgb(0.2, 0.7, 0.2)
    });
    
    currentY -= 30;
    page.drawText('This page appears to be well-optimized. Continue monitoring', {
      x: contentStartX,
      y: currentY,
      size: 12,
      font: bodyFont,
      color: rgb(0.4, 0.4, 0.4)
    });
    
    currentY -= 16;
    page.drawText('for new opportunities and maintain current best practices.', {
      x: contentStartX,
      y: currentY,
      size: 12,
      font: bodyFont,
      color: rgb(0.4, 0.4, 0.4)
    });
    
    return;
  }

  // Group issues by severity
  const highSeverityIssues = pageIssues.filter(issue => issue.severity === 'high');
  const mediumSeverityIssues = pageIssues.filter(issue => issue.severity === 'medium');
  const lowSeverityIssues = pageIssues.filter(issue => issue.severity === 'low');

  // Summary section
  currentY -= 10;
  page.drawText('Page Analysis Summary', {
    x: contentStartX,
    y: currentY,
    size: 16,
    font: headingFont,
    color: rgb(0.2, 0.2, 0.2)
  });

  currentY -= 25;
  const summaryText = `Found ${pageIssues.length} item${pageIssues.length !== 1 ? 's' : ''} for improvement: ` +
    `${highSeverityIssues.length} high priority, ${mediumSeverityIssues.length} medium priority, ` +
    `${lowSeverityIssues.length} low priority`;
  
  page.drawText(summaryText, {
    x: contentStartX,
    y: currentY,
    size: 11,
    font: bodyFont,
    color: rgb(0.4, 0.4, 0.4)
  });

  currentY -= 30;

  // AI Enhancement Highlights (if available)
  if (pageData.aiEnhancement) {
    const ai = pageData.aiEnhancement;
    
    page.drawText('🤖 AI-Powered Enhancement Suggestions', {
      x: contentStartX,
      y: currentY,
      size: 14,
      font: headingFont,
      color: rgb(0.1, 0.4, 0.8)
    });

    currentY -= 20;

    // Show tone alignment if available
    if (ai.toneAlignment) {
      page.drawText(`Tone-Audience Alignment: ${ai.toneAlignment.score}/10`, {
        x: contentStartX + 15,
        y: currentY,
        size: 10,
        font: bodyFont,
        color: rgb(0.3, 0.3, 0.3)
      });
      currentY -= 12;
    }

    // Show content quality if available
    if (ai.contentQuality) {
      page.drawText(`Content Quality Score: ${ai.contentQuality.overallScore}/10`, {
        x: contentStartX + 15,
        y: currentY,
        size: 10,
        font: bodyFont,
        color: rgb(0.3, 0.3, 0.3)
      });
      currentY -= 15;
    }

    // Show available enhancement counts
    const enhancementCounts = [
      ai.metaTitleSuggestions?.length && `${ai.metaTitleSuggestions.length} title suggestions`,
      ai.metaDescriptionSuggestions?.length && `${ai.metaDescriptionSuggestions.length} description suggestions`,
      ai.ctaSuggestions?.length && `${ai.ctaSuggestions.length} CTA suggestions`
    ].filter(Boolean);

    if (enhancementCounts.length > 0) {
      page.drawText(`Available: ${enhancementCounts.join(', ')}`, {
        x: contentStartX + 15,
        y: currentY,
        size: 10,
        font: bodyFont,
        color: rgb(0.2, 0.6, 0.2)
      });
      currentY -= 20;
    } else {
      currentY -= 10;
    }
  }

  currentY -= 10;

  // Render issues by severity
  if (highSeverityIssues.length > 0) {
    currentY = renderIssueSection(page, '🔴 High Priority Issues', highSeverityIssues, 
      currentY, contentStartX, contentWidth, headingFont, bodyFont, rgb(0.8, 0.2, 0.2));
  }

  if (mediumSeverityIssues.length > 0) {
    currentY = renderIssueSection(page, '🟡 Medium Priority Issues', mediumSeverityIssues, 
      currentY, contentStartX, contentWidth, headingFont, bodyFont, rgb(0.9, 0.6, 0.1));
  }

  if (lowSeverityIssues.length > 0) {
    currentY = renderIssueSection(page, '🟢 Low Priority Issues', lowSeverityIssues, 
      currentY, contentStartX, contentWidth, headingFont, bodyFont, rgb(0.2, 0.6, 0.2));
  }

  // Add footer note
  if (currentY > 60) {
    page.drawText('💡 Tip: Start with high priority issues for maximum impact on conversion rates.', {
      x: contentStartX,
      y: 50,
      size: 10,
      font: bodyFont,
      color: rgb(0.5, 0.5, 0.5)
    });
  }
};

// Helper function to analyze a single page and return its issues
function analyzePageIssues(pageData: ScrapedContent, startingNumber: number): IssueEntry[] {
  const issues: IssueEntry[] = [];
  let currentNumber = startingNumber;

  // Check meta description
  if (!pageData.metaDescription) {
    issues.push({
      number: ++currentNumber,
      field: `Meta Description (${pageData.pagePath})`,
      type: 'issue',
      description: 'Missing meta description. Add a compelling meta description (150-160 characters) that summarizes the page content and includes relevant keywords to improve search engine visibility and click-through rates.',
      severity: 'high'
    });
  }

  // Check word count
  if (pageData.wordCount < 300) {
    issues.push({
      number: ++currentNumber,
      field: `Word Count (${pageData.pagePath})`,
      type: 'issue',
      description: `Current word count is ${pageData.wordCount}. Consider adding more valuable content to reach at least 300 words for better SEO performance and user engagement.`,
      severity: 'medium'
    });
  }

  // Check header hierarchy
  if (!pageData.isHeaderOrderValid) {
    issues.push({
      number: ++currentNumber,
      field: `Header Hierarchy (${pageData.pagePath})`,
      type: 'issue',
      description: 'Invalid header hierarchy detected. Ensure headers follow proper hierarchy (H1 → H2 → H3, etc.) to improve accessibility and SEO structure.',
      severity: 'high'
    });
  }

  // Check CTAs
  if (!pageData.ctas || pageData.ctas.length === 0) {
    issues.push({
      number: ++currentNumber,
      field: `Call-to-Actions (${pageData.pagePath})`,
      type: 'issue',
      description: 'No CTAs found. Add clear call-to-action buttons or links to guide users toward desired actions (e.g., "Contact Us", "Learn More", "Get Started").',
      severity: 'medium'
    });
  }

  // AI-Enhanced Suggestions
  if (pageData.aiEnhancement) {
    const ai = pageData.aiEnhancement;

    // Tone-Audience Alignment Issues
    if (ai.toneAlignment && ai.toneAlignment.score < 7) {
      issues.push({
        number: ++currentNumber,
        field: `Content Tone Alignment (${pageData.pagePath})`,
        type: 'suggestion',
        description: `AI Analysis: ${ai.toneAlignment.alignment}. ${ai.toneAlignment.improvements?.slice(0, 2).join('. ')}.`,
        severity: 'medium'
      });
    }

    // Content Quality Issues
    if (ai.contentQuality && ai.contentQuality.overallScore < 7) {
      issues.push({
        number: ++currentNumber,
        field: `Content Quality (${pageData.pagePath})`,
        type: 'suggestion',
        description: `AI Quality Score: ${ai.contentQuality.overallScore}/10. Key improvements: ${ai.contentQuality.priorityImprovements?.slice(0, 2).join(', ')}.`,
        severity: ai.contentQuality.overallScore < 5 ? 'high' : 'medium'
      });
    }

    // Meta Title Enhancement Available
    if (ai.metaTitleSuggestions && ai.metaTitleSuggestions.length > 0) {
      issues.push({
        number: ++currentNumber,
        field: `Meta Title Enhancement (${pageData.pagePath})`,
        type: 'suggestion',
        description: `AI suggests improved title: "${ai.metaTitleSuggestions[0]}". This optimization could improve click-through rates and search visibility.`,
        severity: 'low'
      });
    }

    // Meta Description Enhancement Available
    if (ai.metaDescriptionSuggestions && ai.metaDescriptionSuggestions.length > 0) {
      issues.push({
        number: ++currentNumber,
        field: `Meta Description Enhancement (${pageData.pagePath})`,
        type: 'suggestion',
        description: `AI suggests improved description: "${ai.metaDescriptionSuggestions[0]}". This could boost search result appeal and user engagement.`,
        severity: 'low'
      });
    }

    // CTA Enhancement Available
    if (ai.ctaSuggestions && ai.ctaSuggestions.length > 0 && pageData.ctas && pageData.ctas.length > 0) {
      issues.push({
        number: ++currentNumber,
        field: `CTA Enhancement (${pageData.pagePath})`,
        type: 'suggestion',
        description: `AI suggests more effective CTAs: "${ai.ctaSuggestions.slice(0, 2).join('", "')}". These could improve conversion rates and user engagement.`,
        severity: 'low'
      });
    }

    // High-Priority AI Recommendations
    if (ai.recommendations && ai.recommendations.length > 0) {
      issues.push({
        number: ++currentNumber,
        field: `AI Priority Recommendations (${pageData.pagePath})`,
        type: 'suggestion',
        description: `Top AI recommendations: ${ai.recommendations.slice(0, 2).join('. ')}.`,
        severity: 'medium'
      });
    }
  }

  return issues;
}

// Helper function to render a section of issues
function renderIssueSection(
  page: any,
  sectionTitle: string,
  issues: IssueEntry[],
  startY: number,
  contentStartX: number,
  contentWidth: number,
  headingFont: PDFFont,
  bodyFont: PDFFont,
  sectionColor: any
): number {
  let currentY = startY;
  const lineHeight = 16;
  const itemSpacing = 25;

  // Section title
  page.drawText(sectionTitle, {
    x: contentStartX,
    y: currentY,
    size: 14,
    font: headingFont,
    color: sectionColor
  });

  currentY -= 30;

  // Render each issue
  for (const issue of issues) {
    // Issue number and field
    const issueTitle = `${issue.number}. ${issue.field}`;
    page.drawText(issueTitle, {
      x: contentStartX,
      y: currentY,
      size: 11,
      font: headingFont,
      color: rgb(0.2, 0.2, 0.2)
    });

    currentY -= lineHeight;

    // Description with text wrapping
    const descriptionLines = wrapText(issue.description, bodyFont, 10, contentWidth - 20);
    for (const line of descriptionLines) {
      page.drawText(line, {
        x: contentStartX + 20,
        y: currentY,
        size: 10,
        font: bodyFont,
        color: rgb(0.4, 0.4, 0.4)
      });
      currentY -= lineHeight;
    }

    currentY -= itemSpacing;

    // Check if we need a new page
    if (currentY < 100) {
      // Add a note about continuation
      page.drawText('Continued on next page...', {
        x: contentStartX,
        y: currentY + 10,
        size: 10,
        font: bodyFont,
        color: rgb(0.6, 0.6, 0.6)
      });
      break;
    }
  }

  return currentY - 20;
}

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