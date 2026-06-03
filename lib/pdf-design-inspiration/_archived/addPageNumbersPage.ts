import { PDFDocument, rgb } from 'pdf-lib';
import { addSectionPageHeading } from '../utils/addSectionPageHeading';
import { addList } from '../utils/addList'; // Import for potential issues
import { ScrapedContent } from '@/types/audit';

export const addPageNumbersPage = async (
  pdfDoc: PDFDocument, 
  pageData: ScrapedContent, 
  headingFont: any, 
  bodyFont: any,
  pageIndex: number = 0
) => {
  // Create page with new heading style
  const { page: coverPage, width: coverWidth, contentStartY, contentStartX } = addSectionPageHeading(
    pdfDoc,
    'Page Analysis',
    rgb(1, 1, 1),
    headingFont,
    pageIndex,
    pageData.url,
    rgb(0.3, 0.3, 0.3)
  );

  // Adjust layout to account for side header
  const availableWidth = coverWidth - contentStartX;
  
  // Main section: Issues on top, Suggestions below
  const mainSectionTopY = contentStartY - 0; // Start at same position as URL/metadata on page 1
  const totalAvailableHeight = contentStartY - 70; // Use available space from top down to footer margin
  
  // Split into two sections vertically: Issues (top) and Suggestions (bottom)
  const sectionGap = 20;
  const issuesHeight = (totalAvailableHeight - sectionGap) / 2; // Half for issues
  const suggestionsHeight = (totalAvailableHeight - sectionGap) / 2; // Half for suggestions
  
  const fullWidth = availableWidth - 20; // Leave some margin on the right
  
  // Issues section (top)
  const issuesTopY = mainSectionTopY;
  const issuesBottomY = issuesTopY - issuesHeight;
  
  // Suggestions section (bottom)
  const suggestionsTopY = issuesBottomY - sectionGap;
  const suggestionsBottomY = suggestionsTopY - suggestionsHeight;
  
  const boxPadding = 15;
  const boxBackgroundColor = rgb(0.95, 0.95, 0.95); // Light grey background
  
  // Top Section: Potential Issues Box
  coverPage.drawRectangle({
    x: contentStartX,
    y: issuesBottomY, // Use bottom Y position for rectangle
    width: fullWidth,
    height: issuesHeight,
    color: boxBackgroundColor,
  });
  
  // Issues Title
  let issuesCurrentY = issuesTopY - boxPadding - 15;
  const issuesTitle = 'Potential Issues';
  const issuesTitleWidth = headingFont.widthOfTextAtSize(issuesTitle, 12); // Same size as content
  coverPage.drawText(issuesTitle, {
    x: contentStartX + (fullWidth - issuesTitleWidth) / 2, // Center title
    y: issuesCurrentY,
    size: 12, // Same font size as content
    font: headingFont,
    color: rgb(0, 0, 0),
  });

  issuesCurrentY -= 20;
  const issuesMaxWidth = fullWidth - (2 * boxPadding) - 20; // Available width for text wrapping
  
  // Add issues with colored circles
  issuesCurrentY = addList(coverPage, issuesCurrentY, contentStartX + boxPadding + 10, issuesMaxWidth, bodyFont, pageData.issues.high, rgb(1, 0, 0)); // RED
  issuesCurrentY = addList(coverPage, issuesCurrentY, contentStartX + boxPadding + 10, issuesMaxWidth, bodyFont, pageData.issues.medium, rgb(1, 0.5, 0)); // ORANGE  
  issuesCurrentY = addList(coverPage, issuesCurrentY, contentStartX + boxPadding + 10, issuesMaxWidth, bodyFont, pageData.issues.low, rgb(0, 1, 0)); // GREEN

  // Add content issues to Potential Issues
  issuesCurrentY = addList(
    coverPage,
    issuesCurrentY,
    contentStartX + boxPadding + 10,
    issuesMaxWidth,
    bodyFont,
    pageData.contentAnalysis?.contentIssues || [],
    rgb(0.8, 0.2, 0.2) // Dark red for content issues
  );

  // Bottom Section: Actionable Suggestions Box
  coverPage.drawRectangle({
    x: contentStartX,
    y: suggestionsBottomY, // Use bottom Y position for rectangle
    width: fullWidth,
    height: suggestionsHeight,
    color: boxBackgroundColor,
  });
  
  // Suggestions Title
  let suggestionsCurrentY = suggestionsTopY - boxPadding - 15;
  const suggestionsTitle = 'Actionable Suggestions';
  const suggestionsTitleWidth = headingFont.widthOfTextAtSize(suggestionsTitle, 12); // Same size as content
  coverPage.drawText(suggestionsTitle, {
    x: contentStartX + (fullWidth - suggestionsTitleWidth) / 2, // Center title
    y: suggestionsCurrentY,
    size: 12, // Same font size as content
    font: headingFont,
    color: rgb(0, 0, 0),
  });

  suggestionsCurrentY -= 20;
  
  const suggestionsMaxWidth = fullWidth - (2 * boxPadding) - 20; // Available width for text wrapping
  
  // Add suggestions using addList utility
  suggestionsCurrentY = addList(
    coverPage,
    suggestionsCurrentY,
    contentStartX + boxPadding + 10, // Adjusted for proper alignment
    suggestionsMaxWidth, // Use actual width instead of position
    bodyFont,
    pageData.suggestions,
    rgb(0, 0.7, 0.4) // Green color matching other sections
  );

  // Add content suggestions to Actionable Suggestions
  suggestionsCurrentY = addList(
    coverPage,
    suggestionsCurrentY,
    contentStartX + boxPadding + 10,
    suggestionsMaxWidth, // Use actual width instead of position
    bodyFont,
    pageData.contentAnalysis?.contentSuggestions || [],
    rgb(0, 0.7, 0.4) // Green for suggestions
  );

  return coverPage;
};
