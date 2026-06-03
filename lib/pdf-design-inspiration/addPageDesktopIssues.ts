import { PDFDocument, rgb } from 'pdf-lib';
import { ScrapedContent } from '@/types/audit';
import { addSectionPageHeading } from '../utils/addSectionPageHeading';
import { addList } from '../utils/addList';
import { addNumberedList } from '../utils/addNumberedList';
import { addSubHeader } from '../utils/addSubHeader';
import fetch from 'node-fetch';

export const addPageDesktopIssues = async (
  doc: PDFDocument,
  pageData: ScrapedContent,
  headingFont: any,
  bodyFont: any,
  pageIndex: number = 0,
  auditData?: any // Add auditData parameter to access accessibility data
): Promise<void> => {
  
  // Get accessibility data from page data (based on actual audit structure)
  const accessibilityData = pageData.accessibilityDesktop;
  
  if (!accessibilityData) {
    // Create page with no data message
    const { page, contentStartY, contentStartX } = addSectionPageHeading(
      doc,
      'Desktop Accessibility Issues',
      rgb(1, 1, 1), // White text
      headingFont,
      pageIndex, // Use matching page index for color consistency
      pageData.url, // Pass the actual page URL
      rgb(0.3, 0.3, 0.3)
    );

    // Use addList for consistent formatting
    const rightMargin = 30;
    const maxTextWidth = page.getWidth() - contentStartX - rightMargin;
    const noDataMessage = ['No accessibility data available for this page.'];
    
    addList(page, contentStartY - 50, contentStartX, maxTextWidth, bodyFont, noDataMessage, rgb(0.4, 0.4, 0.4));
    return;
  }

  // Create page with diagonal heading - Pages section
  const { page, width, contentStartX } = addSectionPageHeading(
    doc,
    'Desktop Accessibility Issues',
    rgb(1, 1, 1), // White text
    headingFont,
    pageIndex, // Use matching page index for color consistency
    pageData.url, // Pass the actual page URL
    rgb(0.3, 0.3, 0.3)
  );

  // Colors
  const darkBlue = rgb(0.067, 0.118, 0.294);
  const green = rgb(0.396, 0.639, 0.082);
  const darkGray = rgb(0.4, 0.4, 0.4);
  const red = rgb(0.863, 0.196, 0.161); // Critical
  const orange = rgb(0.918, 0.349, 0.075); // Serious
  const yellow = rgb(0.851, 0.467, 0.039); // Moderate

  // Calculate proper content width using page margins
  const rightMargin = 30;
  const maxWidth = width - contentStartX - rightMargin;

  // Position image to start 50px from the absolute top of the page
  // This will overlay on top of the header if necessary
  const pageHeight = 792;
  const imageTopY = pageHeight + 50; // 50px from absolute top of page
  let yPosition = imageTopY;

  // Large Screenshot Section (if available) - Make this the main focus
  if (pageData.screenshots?.annotatedDesktopUrl) {
    try {
      const response = await fetch(pageData.screenshots.annotatedDesktopUrl);
      if (response.ok) {
        const imageBytes = await response.arrayBuffer();
        
        let image;
        try {
          image = await doc.embedPng(new Uint8Array(imageBytes));
        } catch (pngError) {
          image = await doc.embedJpg(new Uint8Array(imageBytes));
        }

        // Make screenshot bleed to right edge, only avoid diagonal header on left
        const headerWidth = 50; // Width of the diagonal header strip
        const availableWidth = width - headerWidth; // Full width minus only the header (bleed to right edge)
        const targetHeight = 500; // Increase height for better visual impact
        
        const imageAspectRatio = image.width / image.height;
        let imageWidth = availableWidth;
        let imageHeight = imageWidth / imageAspectRatio;
        
        // If calculated height exceeds target, scale by height instead
        if (imageHeight > targetHeight) {
          imageHeight = targetHeight;
          imageWidth = imageHeight * imageAspectRatio;
        }

        // Position image to bleed to right edge
        const imageX = headerWidth; // Start right after diagonal header
        // Position the image so its TOP edge is 50px from top of page
        const imageY = imageTopY - imageHeight; // Bottom-left corner for drawImage

        page.drawImage(image, {
          x: imageX,
          y: imageY,
          width: imageWidth,
          height: imageHeight,
        });

        // Update yPosition to continue content below the image
        yPosition = imageY - 30;
      }
    } catch (error) {
      console.error('Error loading screenshot:', error);
      yPosition -= 20;
    }
  }

  // Issues Section - Show all violations
  const allViolations = accessibilityData.violations || [];
  
  if (allViolations.length > 0) {
    yPosition = addSubHeader(
      page,
      'Accessibility Issues:',
      contentStartX,
      yPosition,
      headingFont,
      12,
      darkBlue,
      maxWidth
    );

    // Format issues for numbered list with colored circles
    const issueTexts: string[] = [];
    const severities: string[] = [];
    
    allViolations.forEach((violation: any) => {
      const issueText = violation.issue || violation.description || 'Accessibility issue';
      const suggestion = violation.suggestion || violation.help || '';
      const severity = violation.severity || violation.impact || 'minor';
      
      let displayText = `${issueText}`;
      
      // Add desktop-specific context if relevant
      if (issueText.toLowerCase().includes('keyboard') || 
          issueText.toLowerCase().includes('focus') ||
          suggestion.toLowerCase().includes('keyboard') ||
          suggestion.toLowerCase().includes('focus')) {
        displayText += ' [KEYBOARD NAVIGATION]';
      } else if (issueText.toLowerCase().includes('contrast') ||
                 issueText.toLowerCase().includes('color')) {
        displayText += ' [VISUAL DISPLAY]';
      } else if (issueText.toLowerCase().includes('heading') ||
                 issueText.toLowerCase().includes('structure')) {
        displayText += ' [CONTENT STRUCTURE]';
      }
      
      // Add suggestion if available
      if (suggestion) {
        displayText += ` • ${suggestion}`;
      }
      
      issueTexts.push(displayText);
      severities.push(severity);
    });
    
    // Color mapping for each severity level
    const severityColors = {
      critical: red,
      serious: orange,
      moderate: yellow,
      minor: green
    };
    
    // Use the new numbered list with colored circles
    yPosition = addNumberedList(
      page, 
      yPosition, 
      contentStartX, 
      maxWidth, 
      bodyFont, 
      issueTexts, 
      severityColors, 
      severities
    );

  } else {
    // No violations found
    page.drawText('No Accessibility Issues Found', {
      x: contentStartX,
      y: yPosition,
      size: 12,
      font: headingFont,
      color: green,
    });

    yPosition -= 25;

    // Use addList for consistent formatting
    const maxTextWidth = maxWidth;
    const explanationText = [
      'This page has no accessibility issues detected.',
      'This indicates excellent accessibility compliance.'
    ];
    
    yPosition = addList(page, yPosition, contentStartX, maxTextWidth, bodyFont, explanationText, darkGray);
  }
  
  // Add section for other issues (from Lighthouse violations)
  yPosition -= 30; // Space before new section
  
  // Add heading for other issues
  yPosition = addSubHeader(
    page,
    'Other desktop issues:',
    contentStartX,
    yPosition,
    headingFont,
    12,
    darkBlue,
    maxWidth
  );
  
  // Get lighthouse violations (prefer desktop, fallback to mobile for desktop overview)
  const lighthouseData = (pageData.lighthouseDesktop as any) || (pageData.lighthouseMobile as any);
  
  if (lighthouseData && lighthouseData.violations) {
    // Take first 5 lighthouse violations
    const firstFiveViolations = lighthouseData.violations.slice(0, 5);
    
    if (firstFiveViolations.length > 0) {
      // Format issues for default list style with severity support
      const issueTexts: string[] = [];
      const severities: string[] = [];
      
      firstFiveViolations.forEach((violation: any) => {
        const issueText = violation.issue || 'Lighthouse Issue';
        const suggestion = violation.suggestion || '';
        const severity = violation.severity || violation.impact || 'minor';
        
        // Create concise issue description with suggestion appended
        let displayText = `${issueText}`;
        
        // Add brief suggestion if available and not too long
        if (suggestion && suggestion.length < 120) {
          // Extract key part of suggestion (before first link or period)
          const shortSuggestion = suggestion.split('[')[0].split('.')[0].trim();
          if (shortSuggestion.length > 0 && shortSuggestion.length < 100) {
            displayText += ` • ${shortSuggestion}`;
          }
        }
        
        issueTexts.push(displayText);
        severities.push(severity);
      });
      
      // Define severity colors
      const severityColors = {
        critical: red,
        serious: orange,
        moderate: yellow,
        minor: green
      };
      
      // Use enhanced addList with severity support
      yPosition = addList(page, yPosition, contentStartX, maxWidth, bodyFont, issueTexts, darkGray, severities, severityColors);
      
    } else {
      // No lighthouse violations found
      const noLighthouseIssues = [
        'No other issues found.',
        'This indicates excellent overall compliance.'
      ];
      
      yPosition = addList(page, yPosition, contentStartX, maxWidth, bodyFont, noLighthouseIssues, green);
    }
  } else {
    // No lighthouse data available
    const noLighthouseData = [
      'Other issues data is unavailable for this page.',
      'Please ensure comprehensive scanning is enabled.'
    ];
    
    yPosition = addList(page, yPosition, contentStartX, maxWidth, bodyFont, noLighthouseData, darkGray);
  }
};
