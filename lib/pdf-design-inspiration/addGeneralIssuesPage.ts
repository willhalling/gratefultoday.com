import { PDFDocument, PDFFont, rgb } from 'pdf-lib';
import { ScrapedContent } from '@/types/audit';
import { addSectionPageHeading } from '../utils/addSectionPageHeading';
import { addList } from '../utils/addList';

/**
 * Adds a comprehensive General Issues page to the PDF that includes:
 * - Meta tag and structural issues (title, description, canonical URL, headers, word count, CTAs)
 * - Accessibility violations from both desktop and mobile testing
 * - Lighthouse performance issues and violations
 * 
 * CRO focus: Only includes issues relevant to conversion rate optimization
 * Pagination: Automatically adds new pages when more than 12 issues are found
 */
export const addGeneralIssuesPage = async (
  pdfDoc: PDFDocument, 
  pageData: ScrapedContent, 
  headingFont: PDFFont, 
  bodyFont: PDFFont,
  pageIndex: number = 0
) => {
  // Create page with heading
  const { page, width, contentStartY, contentStartX } = addSectionPageHeading(
    pdfDoc,
    'General Issues',
    rgb(1, 1, 1), // White text on colored background
    headingFont,
    pageIndex,
    pageData.url,
    rgb(0.3, 0.3, 0.3) // Gray color for URL
  );

  // Helper function to determine if an issue is CRO-related
  const isCroRelated = (issue: string): boolean => {
    const croKeywords = [
      'meta title', 'meta description', 'header', 'h1', 'h2', 'call-to-action', 'cta',
      'conversion', 'click', 'button', 'form', 'checkout', 'cart', 'landing page',
      'user experience', 'ux', 'usability', 'clarity', 'readability', 'engagement',
      'content', 'value proposition', 'trust', 'credibility', 'social proof',
      'speed', 'performance', 'mobile', 'responsive', 'layout', 'color contrast',
      'font', 'loading time', 'navigation', 'search', 'visibility', 'clarity',
      'accessibility', 'canonical', 'word count', 'image', 'alt text', 
      'conversion rate', 'bounce rate', 'exit rate', 'session duration'
    ];
    
    // Convert to lowercase for case-insensitive matching
    const lowerIssue = issue.toLowerCase();
    
    // Check if any CRO keyword is in the issue
    return croKeywords.some(keyword => lowerIssue.includes(keyword.toLowerCase()));
  };

  let currentY = contentStartY - 20;
  const leftMargin = contentStartX;
  const tableWidth = width - leftMargin - 40;

  // Collect all general issues
  const generalIssues: string[] = [];

  // Check for header order issues (using hasSingleH1 as a proxy for header structure)
  if (!pageData.hasSingleH1) {
    generalIssues.push('Header hierarchy is not properly structured (should follow H1 → H2 → H3 order)');
  }

  // Check for missing meta fields
  if (!pageData.meta?.title) {
    generalIssues.push('Missing meta title - important for search engine visibility');
  }

  if (!pageData.meta?.description) {
    generalIssues.push('Missing meta description - affects search engine click-through rates');
  }

  // Check for missing canonical URL
  if (!pageData.meta?.canonical) {
    generalIssues.push('Missing canonical URL - important for preventing duplicate content issues');
  }

  // Check for low word count
  if ((pageData.wordCount || 0) < 300) {
    generalIssues.push(`Low word count (${pageData.wordCount || 0} words) - consider adding more valuable content for better SEO`);
  }

  // Check for no CTAs
  if (!pageData.ctas || pageData.ctas.length === 0) {
    generalIssues.push('No call-to-action buttons found - add clear action buttons to guide user behavior');
  }

  // Categorize issues by severity and display with appropriate colors
  const criticalIssues: string[] = [];
  const warningIssues: string[] = [];
  const suggestionIssues: string[] = [];

  // Categorize existing issues - filter for CRO-related only
  generalIssues.forEach(issue => {
    if (!isCroRelated(issue)) return; // Skip non-CRO issues
    
    if (issue.includes('Missing meta title') || 
        issue.includes('Missing meta description') ||
        issue.includes('Missing canonical URL') ||
        issue.includes('Header hierarchy') ||
        issue.includes('No call-to-action')) {
      criticalIssues.push(issue);
    } else if (issue.includes('Low word count') ||
               issue.includes('Image without alt text') ||
               issue.includes('Form without label')) {
      warningIssues.push(issue);
    } else {
      suggestionIssues.push(issue);
    }
  });

  // Add content analysis issues with appropriate categorization - filter for CRO-related only
  if ((pageData as any).contentAnalysis?.contentIssues) {
    (pageData as any).contentAnalysis.contentIssues.forEach((issue: string) => {
      if (!isCroRelated(issue)) return; // Skip non-CRO issues
      
      if (issue.includes('missing') || issue.includes('required') || issue.includes('critical')) {
        criticalIssues.push(issue);
      } else if (issue.includes('improve') || issue.includes('consider') || issue.includes('should')) {
        warningIssues.push(issue);
      } else {
        suggestionIssues.push(issue);
      }
    });
  }

  // Add content analysis suggestions as low-priority suggestions - filter for CRO-related only
  if ((pageData as any).contentAnalysis?.contentSuggestions) {
    (pageData as any).contentAnalysis.contentSuggestions.forEach((issue: string) => {
      if (isCroRelated(issue)) {
        suggestionIssues.push(issue);
      }
    });
  }

  // Add all accessibility violations (both desktop and mobile) with categorization
  // Desktop accessibility violations - filter for CRO-related only
  if (pageData.accessibilityDesktop?.violations) {
    pageData.accessibilityDesktop.violations.forEach((violation: any) => {
      const description = violation.issue || `Accessibility issue: ${violation.id}`;
      const suggestion = violation.suggestion ? ` - ${violation.suggestion}` : '';
      const formattedIssue = `${description}${suggestion}`;
      
      // Filter for CRO-related issues only
      if (isCroRelated(formattedIssue)) {
        if (violation.severity === 'critical' || violation.severity === 'serious') {
          criticalIssues.push(formattedIssue);
        } else if (violation.severity === 'moderate') {
          warningIssues.push(formattedIssue);
        } else {
          suggestionIssues.push(formattedIssue);
        }
      }
    });
  }
  
  // Mobile accessibility violations (only add if they're different from desktop) - filter for CRO-related only
  if (pageData.accessibilityMobile?.violations) {
    pageData.accessibilityMobile.violations.forEach((violation: any) => {
      // Check if this violation is already included from desktop
      const description = violation.issue || `Accessibility issue: ${violation.id}`;
      const suggestion = violation.suggestion ? ` - ${violation.suggestion}` : '';
      const formattedIssue = `${description}${suggestion} (mobile)`;
      
      // Check if a similar desktop issue already exists
      const desktopEquivalent = pageData.accessibilityDesktop?.violations?.find(
        (v: any) => v.id === violation.id
      );
      
      // Only add if it's unique to mobile and CRO-related
      if (!desktopEquivalent && isCroRelated(formattedIssue)) {
        if (violation.severity === 'critical' || violation.severity === 'serious') {
          criticalIssues.push(formattedIssue);
        } else if (violation.severity === 'moderate') {
          warningIssues.push(formattedIssue);
        } else {
          suggestionIssues.push(formattedIssue);
        }
      }
    });
  }

  // Add Lighthouse violations (desktop) - filter for CRO-related only
  if ((pageData.lighthouseDesktop as any)?.violations) {
    (pageData.lighthouseDesktop as any).violations.forEach((violation: any) => {
      const formattedIssue = `${violation.issue} - ${violation.suggestion}`;
      
      // Only include CRO-related issues
      if (isCroRelated(formattedIssue)) {
        if (violation.severity === 'critical') {
          criticalIssues.push(formattedIssue);
        } else if (violation.severity === 'moderate') {
          warningIssues.push(formattedIssue);
        } else {
          suggestionIssues.push(formattedIssue);
        }
      }
    });
  }
  
  // Add Lighthouse violations (mobile - only if different from desktop) - filter for CRO-related only
  if ((pageData.lighthouseMobile as any)?.violations) {
    (pageData.lighthouseMobile as any).violations.forEach((violation: any) => {
      // Only add mobile-specific issues that aren't in desktop
      const desktopEquivalent = (pageData.lighthouseDesktop as any)?.violations?.find(
        (v: any) => v.issue === violation.issue
      );
      
      const formattedIssue = `${violation.issue} - ${violation.suggestion} (mobile)`;
      
      // Only include if unique to mobile and CRO-related
      if (!desktopEquivalent && isCroRelated(formattedIssue)) {
        if (violation.severity === 'critical') {
          criticalIssues.push(formattedIssue);
        } else if (violation.severity === 'moderate') {
          warningIssues.push(formattedIssue);
        } else {
          suggestionIssues.push(formattedIssue);
        }
      }
    });
  }

  // Helper function to create a new page with the same heading
  const createNewIssuePage = (pageNumber: number) => {
    const newPage = addSectionPageHeading(
      pdfDoc,
      `General Issues (Page ${pageNumber})`,
      rgb(1, 1, 1), // White text on colored background
      headingFont,
      pageIndex,
      pageData.url,
      rgb(0.3, 0.3, 0.3) // Gray color for URL
    );
    
    return {
      page: newPage.page,
      currentY: newPage.contentStartY - 20,
      leftMargin: newPage.contentStartX,
      tableWidth: newPage.width - newPage.contentStartX - 40
    };
  };
  
  // Function to check if we need a new page based on remaining issues and space
  const needsNewPage = (remainingIssues: number, currentY: number) => {
    // Each issue takes approximately 20-25px of vertical space
    // We need at least 30px for the section heading + 20px per issue + 40px buffer
    const estimatedSpaceNeeded = 30 + (remainingIssues * 25) + 40;
    return currentY - estimatedSpaceNeeded < 50; // 50px from bottom is our threshold
  };

  // Track current page number for pagination
  let currentPage = 1;
  let currentPageObj = { 
    page, 
    currentY, 
    leftMargin, 
    tableWidth 
  };
  
  // Maximum issues to display per page
  const maxIssuesPerPage = 12;
  
  // Process issues by severity, with pagination
  const processIssueCategory = (
    issues: string[],
    title: string,
    color: any
  ) => {
    if (issues.length === 0) return;
    
    // Track how many issues we've processed
    let issuesProcessed = 0;
    
    while (issuesProcessed < issues.length) {
      // Check if we need a new page for this batch
      if (issuesProcessed > 0 || 
          needsNewPage(Math.min(maxIssuesPerPage, issues.length), currentPageObj.currentY)) {
        // Only create new page if this isn't the first batch at the start of a page
        if (!(issuesProcessed === 0 && currentPageObj.currentY === contentStartY - 20)) {
          currentPage++;
          currentPageObj = createNewIssuePage(currentPage);
        }
      }
      
      // Category heading for this page
      currentPageObj.page.drawText(title, {
        x: currentPageObj.leftMargin,
        y: currentPageObj.currentY,
        size: 12,
        font: headingFont,
        color: color
      });
      currentPageObj.currentY -= 20;
      
      // Calculate how many issues to show on this page
      const remainingIssues = issues.length - issuesProcessed;
      const issuesToShow = Math.min(maxIssuesPerPage, remainingIssues);
      const issuesForThisPage = issues.slice(issuesProcessed, issuesProcessed + issuesToShow);
      
      // Add the list for this batch
      const listResult = addList(
        currentPageObj.page,
        currentPageObj.currentY,
        currentPageObj.leftMargin + 10,
        currentPageObj.tableWidth - 20,
        bodyFont,
        issuesForThisPage,
        color
      );
      
      currentPageObj.currentY = listResult - 15;
      issuesProcessed += issuesToShow;
    }
  };
  
  // Process each category of issues
  processIssueCategory(criticalIssues, 'Critical Issues', rgb(0.8, 0.2, 0.2));
  processIssueCategory(warningIssues, 'Warnings', rgb(0.9, 0.6, 0.1));
  processIssueCategory(suggestionIssues, 'Suggestions', rgb(0.2, 0.6, 0.2));
  
  // If no issues found, display a positive message
  if (criticalIssues.length === 0 && warningIssues.length === 0 && suggestionIssues.length === 0) {
    currentPageObj.page.drawText('No significant issues found. Your page appears to be well-optimized!', {
      x: currentPageObj.leftMargin,
      y: currentPageObj.currentY,
      size: 12,
      font: bodyFont,
      color: rgb(0.2, 0.6, 0.2) // Green color for positive message
    });
  }
};
