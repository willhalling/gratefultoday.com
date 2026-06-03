import { PDFDocument, rgb } from 'pdf-lib';
import { Audit } from '@/types/audit';
import { addSectionPageHeading } from '../utils/addSectionPageHeading';
import fetch from 'node-fetch';

export const addAccessibilityDetailsPage = async (
  doc: PDFDocument,
  auditData: Audit,
  host: string,
  headingFont: any,
  bodyFont: any
): Promise<void> => {
  
  // Get accessibility data
  const accessibilityData = auditData.accessibility;
  
  if (!accessibilityData) {
    return; // Skip if no data
  }

  // Create page with diagonal heading
  const { page, width, contentStartY, contentStartX } = addSectionPageHeading(
    doc,
    'Accessibility Details',
    rgb(1, 1, 1), // White text
    headingFont,
    101, // Use a different page index for unique color
    'ACCESSIBILITY DETAILS',
    rgb(0.3, 0.3, 0.3)
  );

  // Colors
  const darkBlue = rgb(0.067, 0.118, 0.294); // #112B4B
  const lightGray = rgb(0.98, 0.98, 0.98); // #FAFAFA
  const red = rgb(0.863, 0.196, 0.161); // #DC3426
  const orange = rgb(0.918, 0.349, 0.075); // #EA5913
  const yellow = rgb(0.851, 0.467, 0.039); // #D9770A
  const green = rgb(0.396, 0.639, 0.082); // #65A315
  const darkGray = rgb(0.4, 0.4, 0.4); // #666666

  let yPosition = contentStartY - 20;

  // Add Annotated Screenshot Section (if available)
  if (accessibilityData.annotatedScreenshotUrl) {
    try {
      page.drawText('Accessibility Issues Visualization', {
        x: contentStartX,
        y: yPosition,
        size: 16,
        font: headingFont,
        color: darkBlue,
      });

      yPosition -= 25;

      // Fetch the annotated screenshot
      const response = await fetch(accessibilityData.annotatedScreenshotUrl);
      if (response.ok) {
        const imageBytes = await response.arrayBuffer();
        
        // Try to embed as PNG first, fallback to JPEG
        let image;
        try {
          image = await doc.embedPng(new Uint8Array(imageBytes));
        } catch (pngError) {
          try {
            image = await doc.embedJpg(new Uint8Array(imageBytes));
          } catch (jpgError) {
            throw new Error('Unable to embed image - unsupported format');
          }
        }
        
        // Calculate image dimensions to fit within available space
        const maxImageWidth = width - contentStartX - 50; // Available width
        const maxImageHeight = 250; // Reserve space for content below
        
        const imageDims = image.scale(1);
        const aspectRatio = imageDims.width / imageDims.height;
        
        let imageWidth = Math.min(maxImageWidth, imageDims.width);
        let imageHeight = imageWidth / aspectRatio;
        
        // If height is too large, scale by height instead
        if (imageHeight > maxImageHeight) {
          imageHeight = maxImageHeight;
          imageWidth = imageHeight * aspectRatio;
        }
        
        // Center the image horizontally
        const imageX = contentStartX + (maxImageWidth - imageWidth) / 2;
        
        // Draw the annotated screenshot
        page.drawImage(image, {
          x: imageX,
          y: yPosition - imageHeight,
          width: imageWidth,
          height: imageHeight,
        });
        
        yPosition -= imageHeight + 30;
      }
    } catch (error) {
      console.error('Error loading accessibility screenshot:', error);
      page.drawText('Accessibility visualization not available', {
        x: contentStartX,
        y: yPosition,
        size: 12,
        font: bodyFont,
        color: darkGray,
      });
      yPosition -= 20;
    }
  }

  // Violations Details Section
  if (accessibilityData.violations && accessibilityData.violations.length > 0) {
    page.drawText('Accessibility Violations', {
      x: contentStartX,
      y: yPosition,
      size: 16,
      font: headingFont,
      color: darkBlue,
    });

    yPosition -= 25;

    // Group violations by impact
    const violationsByImpact = {
      critical: accessibilityData.violations.filter(v => v.impact === 'critical'),
      serious: accessibilityData.violations.filter(v => v.impact === 'serious'),
      moderate: accessibilityData.violations.filter(v => v.impact === 'moderate'),
      minor: accessibilityData.violations.filter(v => v.impact === 'minor')
    };

    const impactOrder = ['critical', 'serious', 'moderate', 'minor'];
    const impactColors = {
      critical: red,
      serious: orange,
      moderate: yellow,
      minor: green
    };

    impactOrder.forEach((impact) => {
      const violations = violationsByImpact[impact as keyof typeof violationsByImpact];
      
      if (violations.length > 0 && yPosition > 100) { // Check if we have space
        // Impact heading
        page.drawText(`${impact.charAt(0).toUpperCase() + impact.slice(1)} (${violations.length})`, {
          x: contentStartX,
          y: yPosition,
          size: 14,
          font: headingFont,
          color: impactColors[impact as keyof typeof impactColors],
        });

        yPosition -= 20;

        // Show up to 3 violations per impact level
        const violationsToShow = violations.slice(0, 3);
        
        violationsToShow.forEach((violation, index) => {
          if (yPosition < 80) return; // Stop if we're running out of space

          // Violation box
          const boxHeight = 50;
          page.drawRectangle({
            x: contentStartX,
            y: yPosition - boxHeight,
            width: width - contentStartX - 50,
            height: boxHeight,
            color: lightGray,
          });

          // Violation description (truncated if too long)
          let description = violation.description;
          if (description.length > 80) {
            description = description.substring(0, 77) + '...';
          }

          page.drawText(description, {
            x: contentStartX + 10,
            y: yPosition - 15,
            size: 11,
            font: headingFont,
            color: darkBlue,
          });

          // Help text (truncated if too long)
          let help = violation.help;
          if (help.length > 90) {
            help = help.substring(0, 87) + '...';
          }

          page.drawText(help, {
            x: contentStartX + 10,
            y: yPosition - 30,
            size: 10,
            font: bodyFont,
            color: darkGray,
          });

          // Number of affected elements
          const elementCount = violation.nodes.length;
          page.drawText(`${elementCount} element${elementCount !== 1 ? 's' : ''} affected`, {
            x: width - 150,
            y: yPosition - 25,
            size: 10,
            font: bodyFont,
            color: darkGray,
          });

          yPosition -= boxHeight + 10;
        });

        // Show "and X more" if there are more violations
        if (violations.length > 3) {
          const remaining = violations.length - 3;
          page.drawText(`... and ${remaining} more ${impact} violation${remaining !== 1 ? 's' : ''}`, {
            x: contentStartX + 10,
            y: yPosition,
            size: 10,
            font: bodyFont,
            color: darkGray,
          });
          yPosition -= 20;
        }

        yPosition -= 10; // Extra spacing between impact groups
      }
    });

  } else {
    // No violations found
    page.drawText('No accessibility violations detected!', {
      x: contentStartX,
      y: yPosition,
      size: 16,
      font: headingFont,
      color: green,
    });

    yPosition -= 25;

    page.drawText('Your website appears to meet the tested accessibility standards.', {
      x: contentStartX,
      y: yPosition,
      size: 12,
      font: bodyFont,
      color: darkGray,
    });
  }

  // Footer note
  if (yPosition > 60) {
    yPosition = Math.max(60, yPosition - 20);
    
    page.drawText('Note: This automated scan checks for common accessibility issues. Manual testing', {
      x: contentStartX,
      y: yPosition,
      size: 9,
      font: bodyFont,
      color: darkGray,
    });

    page.drawText('with assistive technologies is recommended for comprehensive accessibility assessment.', {
      x: contentStartX,
      y: yPosition - 12,
      size: 9,
      font: bodyFont,
      color: darkGray,
    });
  }
};
