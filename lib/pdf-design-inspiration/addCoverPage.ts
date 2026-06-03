import { PDFDocument, rgb } from 'pdf-lib';
import fetch from 'node-fetch';
import { addSectionHeading } from '../utils/addSectionHeading';
import { format } from 'date-fns';
import { fetchBrandingData } from '../utils/addBrandingBox';
import { PdfSettings } from '@/types/audit';

export const addCoverPage = async (pdfDoc: PDFDocument, auditData: any, host: string, headingFont: any, bodyFont: any, userId?: string, pdfSettings?: PdfSettings) => {
  console.log('🔍 DEBUG: addCoverPage - pdfSettings received:', pdfSettings);
  
  // Fetch branding data if userId is provided and branding is enabled
  const shouldShowBranding = pdfSettings?.showBranding !== false; // Default to true if not specified
  const brandingData = (userId && shouldShowBranding) ? await fetchBrandingData(userId) : {};
  
  // Use custom title if provided, otherwise use default
  const title = pdfSettings?.title || `Simple, Actionable Website Tips for ${host}`;
  console.log('🔍 DEBUG: addCoverPage - title being used:', title);
  
  const { page: coverPage, width: coverWidth, height: coverHeight, contentStartY, headingHeight } = addSectionHeading(
    pdfDoc,
    title,
    rgb(0, 0, 0),
    headingFont,
    false,
    host,
    host ? rgb(0.5, 0.5, 0.5) : rgb(0, 0, 0)
  );

  // Use a fixed minimum height for the heading area to prevent layout shifts
  // This ensures consistent layout regardless of title length
  // Calculated based on 4-line title: "Conversion Rate\nOptimization (CRO)\naudit for\nwillhalling.com"
  // Formula: topMargin(60) + (4 lines × lineHeight(38.4)) + bottomSpacing(30) = ~250px
  const minHeadingHeight = 214; // Fixed height based on 4-line title calculation
  const fixedHeadingHeight = Math.max(headingHeight, minHeadingHeight);
  
  // Also fix the content start position to ensure consistent layout
  const fixedContentStartY = coverHeight - fixedHeadingHeight;

  // If the actual heading is shorter than minimum, we need to vertically center the text
  if (headingHeight < minHeadingHeight) {
    // The headingHeight from addSectionHeading is just the text height, not including margins
    // We need to account for the full layout: topMargin + textHeight + bottomSpacing
    const topMargin = 60;
    const bottomSpacing = 0; // Reduced from 30 to 20 - spacing below text before border
    
    // Calculate the total space used by the original heading
    const totalOriginalSpace = topMargin + headingHeight + bottomSpacing;
    
    // Calculate how much extra space we have in our fixed height
    const extraSpace = minHeadingHeight - totalOriginalSpace;
    
    // Distribute the extra space by adding half to the top margin (centering effect)
    const verticalOffset = extraSpace / 2;
    
    // We need to re-render the title with proper vertical centering
    // Clear the existing title area (draw a white rectangle over it)
    coverPage.drawRectangle({
      x: 0,
      y: coverHeight - minHeadingHeight,
      width: coverWidth,
      height: minHeadingHeight,
      color: rgb(1, 1, 1), // White background
    });
    
    // Re-render the title with vertical centering
    await renderCenteredTitle(coverPage, title, host, coverWidth, coverHeight, headingFont, minHeadingHeight, verticalOffset);
  }

  // Fetch the screenshot image from the first page
  let screenshotImage;
  const firstPageScreenshot = auditData?.pages?.[0]?.screenshots?.desktopUrl;
  if (firstPageScreenshot) {
    try {
      const screenshotResponse = await fetch(firstPageScreenshot);
      if (screenshotResponse.ok) {
        const screenshotBytes = await screenshotResponse.arrayBuffer();
        screenshotImage = await pdfDoc.embedPng(screenshotBytes);
      }
    } catch (error) {
      console.warn('Failed to load screenshot for cover page:', error);
    }
  }

  // Fetch the image
  const imageResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/images/TSLPgHJ3Tz6gZJpVw7Xik_1098fb0be43a4908bf630078ff76b64f.jpg`);
  const imageBytes = await imageResponse.arrayBuffer();
  const image = await pdfDoc.embedJpg(imageBytes);

  // Calculate the available height for the image (below the heading)
  const availableHeight = coverHeight - fixedHeadingHeight;

  // Get the dimensions of the image
  const imageDims = image.scale(1); // Get original dimensions

  // Calculate the scaling factor to fill the available space
  const widthScale = coverWidth / imageDims.width;
  const heightScale = availableHeight / imageDims.height;

  // Use the larger scale to ensure the image fills the space (may crop some parts)
  let scale = Math.max(widthScale, heightScale);

  // Calculate the scaled dimensions
  let scaledWidth = imageDims.width * scale;
  let scaledHeight = imageDims.height * scale;

  // Calculate the total height of the heading and image
  const totalHeight = fixedHeadingHeight + scaledHeight;

  console.log('totalHeight, coverHeight:' + totalHeight + ' ' + coverHeight);

  // If the total height is less than the page height, scale the image more to fill the gap
  if (totalHeight < coverHeight) {
    const gapHeight = coverHeight - totalHeight;
    const additionalScale = (availableHeight + gapHeight) / availableHeight;
    scale *= additionalScale;
    scaledWidth = imageDims.width * scale;
    scaledHeight = imageDims.height * scale;
  }

  // Convert timestamp to JavaScript Date - handle both Firestore timestamps and regular numbers
  const lastUpdatedTimestamp = auditData.lastUpdated || auditData.createdAt || auditData.completedAt;
  let lastUpdatedDate: Date;
  
  if (!lastUpdatedTimestamp) {
    // Fallback to current date if no timestamp available
    lastUpdatedDate = new Date();
  } else if (typeof lastUpdatedTimestamp === 'number') {
    // Regular timestamp (milliseconds)
    lastUpdatedDate = new Date(lastUpdatedTimestamp);
  } else if (lastUpdatedTimestamp._seconds) {
    // Firestore timestamp object
    lastUpdatedDate = new Date(lastUpdatedTimestamp._seconds * 1000 + (lastUpdatedTimestamp._nanoseconds || 0) / 1000000);
  } else {
    // Unknown format, fallback to current date
    lastUpdatedDate = new Date();
  }
  
  if (isNaN(lastUpdatedDate.getTime())) {
    console.warn('Invalid timestamp, using current date');
    lastUpdatedDate = new Date();
  }

  // Format the date
  const formattedDate = format(lastUpdatedDate, "do MMM yyyy, h:mma");

  // Position the image just after the heading and ensure it sits flush at the bottom
  const x = (coverWidth - scaledWidth) / 2; // Center horizontally
  const y = fixedContentStartY - scaledHeight; // Use fixed position for consistent layout

  // Draw the image
  coverPage.drawImage(image, {
    x,
    y,
    width: scaledWidth,
    height: scaledHeight,
  });

  // Dynamic text positioned lower on the page, centered
  const textLine1 = `Audit produced on ${formattedDate}`;
  const textSize = 12; // Font size
  const lineHeight = 16; // Line height

  // Calculate the width of the first line
  const textLine1Width = bodyFont.widthOfTextAtSize(textLine1, textSize);

  // Calculate the x position for the first line to center it
  const textLine1X = (coverWidth - textLine1Width) / 2;

  // Position the text much lower on the page (moved down significantly)
  const textYPosition = y + scaledHeight - 110; // Moved down by 80px (from -40 to -120)
  coverPage.drawText(textLine1, {
    x: textLine1X, // Centered horizontally
    y: textYPosition, // Position lower on the image
    size: textSize,
    font: bodyFont,
    color: rgb(0, 0, 0),
  });

  // Add company name line below the audit text if it exists (no logo)
  if (brandingData.companyName) {
    const textLine2 = `by ${brandingData.companyName}`;
    const textLine2Width = bodyFont.widthOfTextAtSize(textLine2, textSize);
    const textLine2X = (coverWidth - textLine2Width) / 2;

    // Draw the second line of text below the audit text
    coverPage.drawText(textLine2, {
      x: textLine2X, // Centered horizontally
      y: textYPosition - lineHeight - 5, // Position below the audit text with small gap
      size: textSize,
      font: bodyFont,
      color: rgb(0, 0, 0),
    });
  }

  // Add the screenshot image on top of the device image if available
  if (screenshotImage) {
    const screenshotDims = screenshotImage.scale(1); // Get original dimensions
    const screenshotWidth = screenshotDims.width * 0.27;
    const screenshotHeight = (screenshotWidth / screenshotImage.width) * screenshotImage.height;

    coverPage.drawImage(screenshotImage, {
      x: 132,
      y: 125,
      width: screenshotWidth,
      height: screenshotHeight
    });
  }
};

// Helper function to render title with vertical centering
const renderCenteredTitle = async (page: any, title: string, host: string, pageWidth: number, pageHeight: number, headingFont: any, minHeadingHeight: number, verticalOffset: number) => {
  const headingFontSize = 32;
  const topMargin = 60;
  const lineSpacing = 1.2;
  const leftPadding = 50;
  const rightPadding = 100;
  const maxWidth = pageWidth - leftPadding - rightPadding; // Use full width minus padding

  // Split the title into lines without truncating words
  const lines = [];
  let currentLine = '';
  const words = title.split(' ');

  words.forEach(word => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = headingFont.widthOfTextAtSize(testLine, headingFontSize);

    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        // If a single word is too long, still add it (don't truncate)
        lines.push(word);
        currentLine = '';
      }
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  const lineHeight = headingFontSize * lineSpacing;
  
  // Draw each line with vertical centering
  lines.forEach((line, index) => {
    const wordsInLine = line.split(' ');
    let xPosition = leftPadding;

    wordsInLine.forEach(word => {
      const wordWidth = headingFont.widthOfTextAtSize(word, headingFontSize);
      const isHighlighted = word.includes(host);

      page.drawText(word, {
        x: xPosition,
        y: pageHeight - topMargin - verticalOffset - (index * lineHeight) - 20, // Move title down by 10px
        size: headingFontSize,
        font: headingFont,
        color: isHighlighted ? rgb(0.5, 0.5, 0.5) : rgb(0, 0, 0)
      });

      xPosition += wordWidth + headingFont.widthOfTextAtSize(' ', headingFontSize);
    });
  });

  // Draw the border at the bottom of the fixed height area
  const borderY = pageHeight - minHeadingHeight - 10; // Move border down by 10px to match title
  page.drawLine({
    start: { x: 0, y: borderY },
    end: { x: pageWidth, y: borderY },
    thickness: 1,
    color: rgb(0, 0, 0)
  });
};