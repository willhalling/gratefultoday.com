/**
 * Core PDF Challenge Generator
 * Generates complete challenge PDFs from challenge definitions
 */

import * as fs from 'fs';
import * as path from 'path';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, PDFPage, PDFFont, rgb } from 'pdf-lib';
import {
  defaultPDFStyle,
  loadFonts,
  drawWrappedText,
  drawBlankLines,
  addPageFooter,
  createStyledPage,
  getContentWidth,
  getContentStartY,
} from './pdf-utils';
import type {
  ChallengeDefinition,
  PDFStyleConfig,
  DailyChallenge,
  CoverContent,
  WelcomeContent,
  ClosingContent,
} from '@/types/pdf-challenge';

/**
 * Generate a complete challenge PDF
 * Returns bytes array that can be converted to Blob on client or Buffer on server
 */
export async function generateChallengePDF(
  challenge: ChallengeDefinition,
  style: PDFStyleConfig = defaultPDFStyle
): Promise<Uint8Array> {
  try {
    // Create PDF document
    const pdfDoc = await PDFDocument.create();

    // Register fontkit for custom font support
    pdfDoc.registerFontkit(fontkit);

    const fonts = await loadFonts(pdfDoc);

    let pageNumber = 1;

    // 1. COVER PAGE
    const coverPage = createStyledPage(pdfDoc, style);
    await drawCoverPage(coverPage, challenge.cover, fonts, style, pdfDoc);
    // No page number on cover
    pageNumber++;

    // 2. WELCOME PAGE
    const welcomePage = createStyledPage(pdfDoc, style);
    await drawWelcomePage(welcomePage, challenge.welcome, fonts, style);
    addPageFooter(welcomePage, pageNumber, fonts.bodyFont, style, challenge.cover.title);
    pageNumber++;

    // 3. DAILY CHALLENGE PAGES
    for (const dailyChallenge of challenge.dailyChallenges) {
      const challengePage = createStyledPage(pdfDoc, style);
      await drawDailyChallengePage(challengePage, dailyChallenge, fonts, style);
      addPageFooter(challengePage, pageNumber, fonts.bodyFont, style, challenge.cover.title);
      pageNumber++;
    }

    // 4. CLOSING PAGE(S)
    const closingPages = await drawClosingPages(
      pdfDoc,
      challenge.closing,
      fonts,
      style,
      pageNumber,
      challenge.cover.title
    );
    pageNumber += closingPages;

    // Save PDF as bytes
    const pdfBytes = await pdfDoc.save();

    // Return as Uint8Array (can be converted to Blob on client)
    return pdfBytes;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error(
      `Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Draw the cover page
 */
async function drawCoverPage(
  page: PDFPage,
  cover: CoverContent,
  fonts: { headingFont: PDFFont; bodyFont: PDFFont; italicFont: PDFFont },
  style: PDFStyleConfig,
  pdfDoc: PDFDocument
): Promise<void> {
  const pageWidth = style.pageSize.width;
  const pageHeight = style.pageSize.height;

  // Get cover config from cover content or style defaults
  const coverImagePath =
    cover.coverImagePath ||
    style.coverDefaults?.coverImagePath ||
    'pdf/7-day-gratitude-challenge-for-recovery-cover.png';
  const coverImageHeightPercent =
    cover.coverImageHeightPercent ?? style.coverDefaults?.coverImageHeightPercent ?? 0.6;
  const logoPath = cover.logoPath || style.coverDefaults?.logoPath || 'logo-white-50.png';
  const logoSize = cover.logoSize ?? style.coverDefaults?.logoSize ?? 50;
  const logoPosition = cover.logoPosition || style.coverDefaults?.logoPosition || { x: 30, y: 30 };
  const bottomSectionBgColor = cover.bottomSectionBgColor ||
    style.coverDefaults?.bottomSectionBgColor || [1, 1, 1]; // White default
  const textAlignment = cover.textAlignment || style.coverDefaults?.textAlignment || 'left';

  // Load cover image
  const coverImageFullPath = path.join(process.cwd(), 'public', coverImagePath);
  const coverImageBytes = fs.readFileSync(coverImageFullPath);
  const coverImage = await pdfDoc.embedPng(coverImageBytes);

  // Image should fill 100% width and configurable height from top
  const imageHeight = pageHeight * coverImageHeightPercent;
  const imageWidth = pageWidth;

  // Get original image dimensions to maintain aspect ratio
  const originalImageDims = coverImage.scale(1);
  const targetAspectRatio = imageWidth / imageHeight;
  const originalAspectRatio = originalImageDims.width / originalImageDims.height;

  // Calculate scaling to fill the space while maintaining aspect ratio
  let scale: number;
  let drawWidth: number;
  let drawHeight: number;
  let offsetX = 0;
  let offsetY = 0;

  if (originalAspectRatio > targetAspectRatio) {
    // Image is wider - scale by height and center horizontally
    scale = imageHeight / originalImageDims.height;
    drawWidth = originalImageDims.width * scale;
    drawHeight = imageHeight;
    offsetX = -(drawWidth - imageWidth) / 2; // Center crop
  } else {
    // Image is taller - scale by width and center vertically
    scale = imageWidth / originalImageDims.width;
    drawWidth = imageWidth;
    drawHeight = originalImageDims.height * scale;
    offsetY = -(drawHeight - imageHeight) / 2; // Center crop
  }

  // Draw the cover image - centered crop
  page.drawImage(coverImage, {
    x: offsetX,
    y: pageHeight - imageHeight + offsetY,
    width: drawWidth,
    height: drawHeight,
  });

  // Draw logo overlaid on image
  const logoFullPath = path.join(process.cwd(), 'public', logoPath);
  const logoBytes = fs.readFileSync(logoFullPath);
  const logoImage = await pdfDoc.embedPng(logoBytes);

  const logoHeight = logoSize;
  const logoWidth = (logoImage.width / logoImage.height) * logoHeight;
  const logoX = logoPosition.x;
  const logoY = pageHeight - logoPosition.y;

  page.drawImage(logoImage, {
    x: logoX,
    y: logoY - logoHeight,
    width: logoWidth,
    height: logoHeight,
  });

  // Bottom section for title and subtitle
  const bottomSectionHeight = pageHeight * (1 - coverImageHeightPercent);
  const bottomSectionY = pageHeight - imageHeight;

  // Draw background for bottom section
  page.drawRectangle({
    x: 0,
    y: 0,
    width: pageWidth,
    height: bottomSectionHeight,
    color: rgb(...bottomSectionBgColor),
  });

  // Center the text vertically in the bottom space
  let currentY = bottomSectionY - bottomSectionHeight * 0.3; // Start from center area

  // Title - configurable alignment, larger font
  const leftMargin = style.margins.left;
  const contentWidth = pageWidth - style.margins.left * 2;

  const titleLines = cover.title.split('\n');
  for (let i = 0; i < titleLines.length; i++) {
    const cleanLine = titleLines[i].replace(/[\r\n]/g, '').trim();
    if (!cleanLine) continue;
    currentY = drawWrappedText(page, cleanLine, fonts.headingFont, {
      x: leftMargin,
      y: currentY,
      maxWidth: contentWidth,
      fontSize: style.fontSizes.coverTitle, // Larger font
      lineHeight: 1.2,
      color: style.colors.text,
      align: textAlignment,
    });
    // Only add spacing between title lines, not after the last one
    if (i < titleLines.length - 1) {
      currentY -= 8;
    }
  }

  currentY -= 3; // Minimal spacing between title and subtitle

  // Subtitle - configurable alignment, larger font
  const subtitleLines = cover.subtitle.split('\n');
  for (const line of subtitleLines) {
    const cleanLine = line.replace(/[\r\n]/g, '').trim();
    if (!cleanLine) continue;
    currentY = drawWrappedText(page, cleanLine, fonts.bodyFont, {
      x: leftMargin,
      y: currentY,
      maxWidth: contentWidth,
      fontSize: style.fontSizes.sectionHeading, // Larger font
      lineHeight: 1.4,
      color: style.colors.text,
      align: textAlignment,
    });
    currentY -= 5;
  }

  // Tagline removed - not displaying gratefultoday.com on cover
}

/**
 * Draw the welcome page
 */
async function drawWelcomePage(
  page: PDFPage,
  welcome: WelcomeContent,
  fonts: { headingFont: PDFFont; bodyFont: PDFFont; italicFont: PDFFont },
  style: PDFStyleConfig
): Promise<void> {
  const contentWidth = getContentWidth(style);
  const startX = style.margins.left;
  let currentY = getContentStartY(style);

  // Heading
  currentY = drawWrappedText(page, welcome.heading, fonts.headingFont, {
    x: startX,
    y: currentY,
    maxWidth: contentWidth,
    fontSize: style.fontSizes.pageHeading,
    lineHeight: 1.3,
    color: style.colors.primary,
  });

  currentY -= 30;

  // Body paragraphs
  for (const paragraph of welcome.body) {
    currentY = drawWrappedText(page, paragraph, fonts.bodyFont, {
      x: startX,
      y: currentY,
      maxWidth: contentWidth,
      fontSize: style.fontSizes.body,
      lineHeight: style.lineHeight,
      color: style.colors.text,
    });
    currentY -= 15; // Space between paragraphs
  }

  // Instructions (if provided)
  if (welcome.instructions && welcome.instructions.length > 0) {
    currentY -= 20;
    currentY = drawWrappedText(page, 'How to Use This', fonts.headingFont, {
      x: startX,
      y: currentY,
      maxWidth: contentWidth,
      fontSize: style.fontSizes.sectionHeading + 2,
      lineHeight: 1.3,
      color: style.colors.text,
    });

    currentY -= 15;

    for (const instruction of welcome.instructions) {
      const bulletPoint = `• ${instruction}`;
      currentY = drawWrappedText(page, bulletPoint, fonts.bodyFont, {
        x: startX,
        y: currentY,
        maxWidth: contentWidth,
        fontSize: style.fontSizes.body,
        lineHeight: style.lineHeight,
        color: style.colors.text,
      });
      currentY -= 10;
    }
  }

  // Add "Let's begin" at the bottom
  currentY -= 30;
  drawWrappedText(page, "Let's begin.", fonts.italicFont, {
    x: startX,
    y: currentY,
    maxWidth: contentWidth,
    fontSize: style.fontSizes.body,
    lineHeight: style.lineHeight,
    color: style.colors.lightText,
  });
}

/**
 * Draw a daily challenge page
 */
async function drawDailyChallengePage(
  page: PDFPage,
  challenge: DailyChallenge,
  fonts: { headingFont: PDFFont; bodyFont: PDFFont; italicFont: PDFFont },
  style: PDFStyleConfig
): Promise<void> {
  const contentWidth = getContentWidth(style);
  const startX = style.margins.left;
  let currentY = getContentStartY(style);

  // Day header
  const dayHeader = `Day ${challenge.day}: ${challenge.title}`;
  currentY = drawWrappedText(page, dayHeader, fonts.headingFont, {
    x: startX,
    y: currentY,
    maxWidth: contentWidth,
    fontSize: style.fontSizes.pageHeading,
    lineHeight: 1.3,
    color: style.colors.primary,
  });

  currentY -= 30;

  // Prompt
  currentY = drawWrappedText(page, challenge.prompt, fonts.bodyFont, {
    x: startX,
    y: currentY,
    maxWidth: contentWidth,
    fontSize: style.fontSizes.body,
    lineHeight: style.lineHeight,
    color: style.colors.text,
  });

  currentY -= 30;

  // Blank lines for writing
  const lineSpacing = style.fontSizes.body * style.lineHeight + 5;
  currentY = drawBlankLines(
    page,
    startX,
    contentWidth,
    {
      startY: currentY,
      numberOfLines: challenge.linesNeeded,
      lineHeight: lineSpacing,
      style: 'solid',
    },
    style
  );

  // Additional prompt and lines (if provided)
  if (challenge.additionalPrompt) {
    currentY -= 30;
    currentY = drawWrappedText(page, challenge.additionalPrompt, fonts.bodyFont, {
      x: startX,
      y: currentY,
      maxWidth: contentWidth,
      fontSize: style.fontSizes.body,
      lineHeight: style.lineHeight,
      color: style.colors.text,
    });

    currentY -= 20;
    currentY = drawBlankLines(
      page,
      startX,
      contentWidth,
      {
        startY: currentY,
        numberOfLines: challenge.additionalLines || 3,
        lineHeight: lineSpacing,
        style: 'solid',
      },
      style
    );
  }

  // Optional tip
  if (challenge.tip) {
    currentY -= 20;
    const tipText = `Tip: ${challenge.tip}`;
    currentY = drawWrappedText(page, tipText, fonts.italicFont, {
      x: startX,
      y: currentY,
      maxWidth: contentWidth,
      fontSize: style.fontSizes.body - 1,
      lineHeight: style.lineHeight,
      color: style.colors.secondary,
    });
  }

  // "Why this matters" section at bottom
  currentY = Math.max(currentY - 30, style.margins.bottom + 150); // Ensure it fits

  currentY = drawWrappedText(page, 'Why This Matters:', fonts.headingFont, {
    x: startX,
    y: currentY,
    maxWidth: contentWidth,
    fontSize: style.fontSizes.sectionHeading,
    lineHeight: 1.3,
    color: style.colors.primary,
  });

  currentY -= 10;

  drawWrappedText(page, challenge.whyText, fonts.bodyFont, {
    x: startX,
    y: currentY,
    maxWidth: contentWidth,
    fontSize: style.fontSizes.body - 1,
    lineHeight: style.lineHeight,
    color: style.colors.text,
  });
}

/**
 * Draw closing pages
 * Returns number of pages created
 */
async function drawClosingPages(
  pdfDoc: PDFDocument,
  closing: ClosingContent,
  fonts: { headingFont: PDFFont; bodyFont: PDFFont; italicFont: PDFFont },
  style: PDFStyleConfig,
  startPageNumber: number,
  challengeTitle?: string
): Promise<number> {
  const contentWidth = getContentWidth(style);
  const startX = style.margins.left;
  let pageCount = 0;

  // Create first closing page
  let page = createStyledPage(pdfDoc, style);
  let currentY = getContentStartY(style);
  let currentPageNumber = startPageNumber;

  // Main heading
  currentY = drawWrappedText(page, closing.heading, fonts.headingFont, {
    x: startX,
    y: currentY,
    maxWidth: contentWidth,
    fontSize: style.fontSizes.pageHeading,
    lineHeight: 1.3,
    color: style.colors.primary,
  });

  currentY -= 30;

  // Sections
  for (const section of closing.sections) {
    // Check if we need a new page (basic check)
    if (currentY < style.margins.bottom + 200) {
      addPageFooter(page, currentPageNumber, fonts.bodyFont, style, challengeTitle);
      page = createStyledPage(pdfDoc, style);
      currentY = getContentStartY(style);
      currentPageNumber++;
      pageCount++;
    }

    // Section heading
    currentY = drawWrappedText(page, section.heading, fonts.headingFont, {
      x: startX,
      y: currentY,
      maxWidth: contentWidth,
      fontSize: style.fontSizes.sectionHeading,
      lineHeight: 1.3,
      color: style.colors.primary,
    });

    currentY -= 15;

    // Section body
    for (const paragraph of section.body) {
      currentY = drawWrappedText(page, paragraph, fonts.bodyFont, {
        x: startX,
        y: currentY,
        maxWidth: contentWidth,
        fontSize: style.fontSizes.body,
        lineHeight: style.lineHeight,
        color: style.colors.text,
      });
      currentY -= 15;
    }

    currentY -= 10; // Extra space between sections
  }

  // Call to actions
  if (closing.callToActions && closing.callToActions.length > 0) {
    currentY -= 20;

    for (const cta of closing.callToActions) {
      currentY = drawWrappedText(page, cta, fonts.bodyFont, {
        x: startX,
        y: currentY,
        maxWidth: contentWidth,
        fontSize: style.fontSizes.body,
        lineHeight: style.lineHeight,
        color: style.colors.lightText,
      });
      currentY -= 10;
    }
  }

  addPageFooter(page, currentPageNumber, fonts.bodyFont, style, challengeTitle);
  pageCount++;

  return pageCount;
}
