import { PDFDocument, rgb, PageSizes } from 'pdf-lib';
import { ScrapedContent } from '@/types/audit';
import fetch from 'node-fetch';
import { addList } from '../utils/addList';
import { addNumberedList } from '../utils/addNumberedList';
import { addSubHeader } from '../utils/addSubHeader';

// Color palette from addNumbersPage
const PAGE_COLORS = [
  rgb(0.2, 0.4, 0.8),  // Blue
  rgb(0.2, 0.7, 0.4),  // Green
  rgb(0.9, 0.5, 0.2),  // Orange
  rgb(0.6, 0.2, 0.8),  // Purple
  rgb(0.2, 0.8, 0.7),  // Teal
  rgb(0.9, 0.2, 0.3),  // Red
];

export const addPageMobileIssues = async (
  doc: PDFDocument,
  pageData: ScrapedContent,
  headingFont: any,
  bodyFont: any,
  pageIndex: number = 0,
  auditData?: any // Add auditData parameter to access accessibility data
): Promise<void> => {
  
  // Create a completely new page without using addSectionPageHeading
  const page = doc.addPage(PageSizes.A4);
  const { width, height } = page.getSize();
  
  // Define header height and footer height
  const headerHeight = 50; // Height of the horizontal header
  const footerHeight = 50; // Assuming footer is 50px tall
  
  // Get color for this page (cycle through colors)
  const pageColor = PAGE_COLORS[pageIndex % PAGE_COLORS.length];
  
  // Draw horizontal header across the top of the page
  page.drawRectangle({
    x: 0, // Left edge
    y: height - headerHeight, // Start from top, going down headerHeight
    width: width, // Full width
    height: headerHeight, // Header height
    color: pageColor, // Use color based on page index
  });
  
  // Get page name based on index or URL
  let pageName = 'HOMEPAGE';
  if (pageIndex > 0 && pageData.url) {
    try {
      // Extract pathname from URL
      const urlObj = new URL(pageData.url.startsWith('http') ? pageData.url : `https://${pageData.url}`);
      const pathname = urlObj.pathname;
      
      if (pathname !== '/' && pathname !== '') {
        pageName = pathname;
      }
    } catch (error) {
      // If URL parsing fails, fallback to default
      console.error('Error parsing URL:', error);
    }
  }
  
  // Add page name with letter spacing on the left side
  const letterSpacing = 2; // Additional spacing between characters
  const fontSize = 16;
  const leftMargin = 20; // Left margin
  
  let currentX = leftMargin;
  
  // Draw each character separately with spacing
  for (let i = 0; i < pageName.length; i++) {
    const char = pageName[i];
    
    page.drawText(char, {
      x: currentX,
      y: height - (headerHeight / 2) - 6, // Centered in header height
      size: fontSize,
      font: headingFont,
      color: rgb(1, 1, 1), // White text
    });
    
    // Move to next character position
    currentX += headingFont.widthOfTextAtSize(char, fontSize) + letterSpacing;
  }
  
  // Calculate available height for the content area
  const availableHeight = height - headerHeight - footerHeight;
  
  // Calculate exact dimensions for the mobile screenshot area (left half)
  const screenshotWidth = width / 2; // 50% of available width
  const screenshotHeight = availableHeight; // Height from below header to above footer
  const screenshotX = 0; // Left edge
  const screenshotY = footerHeight; // Bottom edge (just above footer)
  
  // Calculate aspect ratio for the mobile screenshot area
  const aspectRatio = screenshotWidth / screenshotHeight;
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('MOBILE SCREENSHOT DIMENSIONS FOR FIRESTORE CROPPING:');
  console.log(`Width: ${screenshotWidth.toFixed(2)}px`);
  console.log(`Height: ${screenshotHeight.toFixed(2)}px`);
  console.log(`Aspect Ratio (width/height): ${aspectRatio.toFixed(4)}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Try to get the mobile screenshot if available
  // Get mobile accessibility data from page data (based on actual audit structure)
  const mobileAccessibilityData = pageData.accessibilityMobile;
  const desktopAccessibilityData = pageData.accessibilityDesktop;
  
  let mobileScreenshotDisplayed = false;
  
  console.log('🔍 Mobile accessibility data available:', !!mobileAccessibilityData);
  console.log('🔍 Desktop accessibility data available:', !!desktopAccessibilityData);
  
  if (mobileAccessibilityData || desktopAccessibilityData) {
    // Look for mobile screenshot URL in the correct location
    const mobileScreenshotUrl = pageData.screenshots?.annotatedMobileUrl;
    
    console.log('📱 Mobile Screenshot URL:', mobileScreenshotUrl || 'No mobile screenshot found');
    
    if (mobileScreenshotUrl) {
      try {
        console.log('📱 Fetching mobile screenshot from:', mobileScreenshotUrl);
        const response = await fetch(mobileScreenshotUrl);
        
        if (response.ok) {
          const imageBytes = await response.arrayBuffer();
          console.log('📱 Mobile screenshot fetched successfully, size:', imageBytes.byteLength, 'bytes');
          
          let image;
          try {
            image = await doc.embedPng(new Uint8Array(imageBytes));
          } catch (pngError) {
            console.log('📱 Not a PNG, trying JPG format');
            image = await doc.embedJpg(new Uint8Array(imageBytes));
          }
          
          // Draw the mobile screenshot in the left half area
          page.drawImage(image, {
            x: screenshotX,
            y: screenshotY,
            width: screenshotWidth,
            height: screenshotHeight,
          });
          
          console.log('✅ Mobile screenshot embedded in PDF successfully');
          mobileScreenshotDisplayed = true;
        } else {
          console.error('❌ Error fetching mobile screenshot:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('❌ Error loading mobile screenshot:', error);
      }
    } else {
      console.log('⚠️ No mobile screenshot URL found - will show red fallback box');
    }
  }
  
  // If we couldn't display the mobile screenshot, show red box as fallback
  if (!mobileScreenshotDisplayed) {
    console.log('📱 Displaying red box as fallback for missing mobile screenshot');
    page.drawRectangle({
      x: screenshotX,
      y: screenshotY,
      width: screenshotWidth,
      height: screenshotHeight,
      color: rgb(1, 0, 0), // Pure red
    });
  }
  
  // White box on right side 
  page.drawRectangle({
    x: width / 2, // Right half
    y: footerHeight, // Start just above footer
    width: width / 2, // Half page width
    height: availableHeight, // Fill all the way to the header
    color: rgb(1, 1, 1), // White background
  });
  
  // Add Mobile Accessibility Issues Snapshot text in white box with optimized margins
  let rightSideX = width / 2 + 15; // Left side of white box + 15px margin
  let rightSideWidth = (width / 2) - 30; // Width of white box - 30px (15px on each side)
  
  console.log('White box content area width:', rightSideWidth);
  console.log('White box start X position:', rightSideX);
  console.log('Available text width for addList:', rightSideWidth - 15); // Subtract text indent
  
  // Ensure we have at least 180px of width to work with for better space utilization
  if (rightSideWidth < 180) {
    console.warn('Warning: White box content area is too narrow, reducing margins');
    rightSideX = width / 2 + 8; // Reduce left margin to 8px
    rightSideWidth = (width / 2) - 16; // Reduce total margins to 16px (8px on each side)
    console.log('Adjusted white box content area width:', rightSideWidth);
    console.log('Adjusted white box start X position:', rightSideX);
  }
  let rightSideY = height - headerHeight - 15; // Top of content area - 15px margin (use more space)
  
  // Colors for text and issues with better contrast and severity indication
  const darkBlue = rgb(0.067, 0.118, 0.294);
  const green = rgb(0.196, 0.588, 0.196); // Slightly darker green for better visibility
  const darkGray = rgb(0.4, 0.4, 0.4);
  const red = rgb(0.863, 0.196, 0.161); // Critical - Red
  const orange = rgb(0.918, 0.349, 0.075); // Serious - Orange  
  const amber = rgb(0.851, 0.467, 0.039); // Moderate - Amber
  const teal = rgb(0.196, 0.588, 0.588); // Minor - Teal (better contrast than green)
  
  // Display mobile accessibility issues in the white box
  // Use mobile accessibility data if available, otherwise fall back to desktop data
  const violationsData = mobileAccessibilityData || desktopAccessibilityData;
  
  if (violationsData && violationsData.violations) {
    // Show all violations
    const allViolations = violationsData.violations;
    
    if (allViolations.length > 0) {
      // Add 20px margin above Mobile Accessibility Issues
      rightSideY -= 20;
      
      // Section heading
      rightSideY = addSubHeader(
        page,
        'Mobile Accessibility Issues:',
        rightSideX,
        rightSideY,
        headingFont,
        12,
        darkBlue,
        rightSideWidth
      );
      
      // Format issues for numbered list with colored circles
      const issueTexts: string[] = [];
      const severities: string[] = [];
      
      allViolations.forEach((violation: any) => {
        const issueText = violation.issue || violation.description || 'Accessibility issue';
        const suggestion = violation.suggestion || violation.help || '';
        const severity = violation.severity || violation.impact || 'minor';
        
        let displayText = `${issueText}`;
        
        // Add mobile-specific context tags more compactly based on issue content
        if (issueText.toLowerCase().includes('touch') || 
            suggestion.toLowerCase().includes('touch')) {
          displayText += ' [TOUCH]';
        } else if (issueText.toLowerCase().includes('size') ||
                   issueText.toLowerCase().includes('target')) {
          displayText += ' [SIZE]';
        } else if (issueText.toLowerCase().includes('contrast') ||
                   issueText.toLowerCase().includes('color')) {
          displayText += ' [CONTRAST]';
        } else if (issueText.toLowerCase().includes('heading') ||
                   issueText.toLowerCase().includes('structure')) {
          displayText += ' [STRUCTURE]';
        } else if (issueText.toLowerCase().includes('focus') ||
                   issueText.toLowerCase().includes('keyboard')) {
          displayText += ' [FOCUS]';
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
        moderate: amber,
        minor: teal
      };
      
      // Use the new numbered list with colored circles
      rightSideY = addNumberedList(
        page, 
        rightSideY, 
        rightSideX, 
        rightSideWidth, 
        bodyFont, 
        issueTexts, 
        severityColors, 
        severities
      );
      
    } else {
      // No violations found
      page.drawText('✓ No Mobile Accessibility Issues', {
        x: rightSideX,
        y: rightSideY,
        size: 12,
        font: headingFont,
        color: green,
      });
      
      rightSideY -= 18;
      
      // Use addList for consistent formatting even for explanatory text
      const explanationList = [
        'This page has no mobile accessibility issues detected.',
        'This indicates excellent mobile accessibility compliance.'
      ];
      
      rightSideY = addList(page, rightSideY, rightSideX, rightSideWidth, bodyFont, explanationList, green);
    }
    
  } else {
    // No accessibility data available
    page.drawText('⚠ No Mobile Accessibility Data', {
      x: rightSideX,
      y: rightSideY,
      size: 12,
      font: headingFont,
      color: darkBlue,
    });
    
    rightSideY -= 18;
    
    // Use addList for consistent formatting
    const noDataExplanation = [
      'Mobile accessibility data is unavailable for this page.',
      'Please ensure mobile accessibility scanning is enabled.'
    ];
    
    addList(page, rightSideY, rightSideX, rightSideWidth, bodyFont, noDataExplanation, darkGray);
  }
  
  // Add section for other issues (from Lighthouse violations)
  rightSideY -= 25; // Space before new section
  
  // Add heading for other issues
  rightSideY = addSubHeader(
    page,
    'Other mobile issues:',
    rightSideX,
    rightSideY,
    headingFont,
    12,
    darkBlue,
    rightSideWidth
  );
  
  // Get lighthouse violations (prefer mobile, fallback to desktop)
  const lighthouseData = (pageData.lighthouseMobile as any) || (pageData.lighthouseDesktop as any);
  
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
        if (suggestion && suggestion.length < 100) {
          // Extract key part of suggestion (before first link or period)
          const shortSuggestion = suggestion.split('[')[0].split('.')[0].trim();
          if (shortSuggestion.length > 0 && shortSuggestion.length < 80) {
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
        moderate: amber,
        minor: teal
      };
      
      // Use enhanced addList with severity support
      rightSideY = addList(page, rightSideY, rightSideX, rightSideWidth, bodyFont, issueTexts, darkGray, severities, severityColors);
      
    } else {
      // No lighthouse violations found
      const noLighthouseIssues = [
        'No other issues found.',
        'This indicates excellent overall compliance.'
      ];
      
      rightSideY = addList(page, rightSideY, rightSideX, rightSideWidth, bodyFont, noLighthouseIssues, green);
    }
  } else {
    // No lighthouse data available
    const noLighthouseData = [
      'Other issues data is unavailable for this page.',
      'Please ensure comprehensive scanning is enabled.'
    ];
    
    rightSideY = addList(page, rightSideY, rightSideX, rightSideWidth, bodyFont, noLighthouseData, darkGray);
  }
};
