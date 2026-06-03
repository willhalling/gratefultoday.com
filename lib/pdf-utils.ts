/**
 * PDF Generation Utilities for Gratitude Challenges
 * Modular, reusable helper functions for creating challenge PDFs
 */

import * as fs from 'fs';
import * as path from 'path';
import { PDFDocument, PDFPage, PDFFont, rgb, StandardFonts } from 'pdf-lib';
import type { PDFStyleConfig, TextDrawOptions, BlankLinesOptions } from '@/types/pdf-challenge';

/**
 * Default brand style configuration for Grateful Today PDFs
 * Based on brand colors from tailwind.config.js
 */
export const defaultPDFStyle: PDFStyleConfig = {
  colors: {
    primary: [0.082, 0.502, 0.239], // Forest Green: #15803d
    secondary: [0.706, 0.325, 0.035], // Warm Amber: #b45309
    text: [0.322, 0.322, 0.322], // Stone Gray: #525252
    lightText: [0.694, 0.592, 0.486], // Warm Taupe: #B1977C
    background: [0.98, 0.98, 0.976], // Off White: #fafaf9
  },
  fontSizes: {
    coverTitle: 32,
    coverSubtitle: 18,
    pageHeading: 20,
    sectionHeading: 14,
    body: 11,
    footer: 8,
  },
  margins: {
    top: 72, // 1 inch = 72 points
    bottom: 72,
    left: 72,
    right: 72,
  },
  lineHeight: 1.5,
  pageSize: {
    width: 612, // 8.5 inches
    height: 792, // 11 inches (Letter size)
  },
};

/**
 * Load and cache fonts for PDF generation
 */
export async function loadFonts(pdfDoc: PDFDocument) {
  // Load Playfair Display Bold for headings
  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'PlayfairDisplay-Bold.ttf');
  const fontBytes = new Uint8Array(fs.readFileSync(fontPath));
  const headingFont = await pdfDoc.embedFont(fontBytes);

  // Standard fonts for body text
  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  return { headingFont, bodyFont, italicFont };
}

/**
 * Draw text with automatic word wrapping
 * Returns the Y position after the text (for stacking content)
 */
export function drawWrappedText(
  page: PDFPage,
  text: string,
  font: PDFFont,
  options: TextDrawOptions
): number {
  const {
    x,
    y,
    maxWidth,
    fontSize,
    lineHeight,
    color = defaultPDFStyle.colors.text,
    align = 'left',
  } = options;

  // Remove any newline characters that WinAnsi cannot encode
  const cleanText = text.replace(/[\r\n]/g, ' ').trim();

  const words = cleanText.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  // Word wrapping algorithm
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const textWidth = font.widthOfTextAtSize(testLine, fontSize);

    if (textWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }

  // Draw each line
  let currentY = y;
  const lineSpacing = fontSize * lineHeight;

  for (const line of lines) {
    let drawX = x;

    if (align === 'center') {
      const textWidth = font.widthOfTextAtSize(line, fontSize);
      drawX = x + (maxWidth - textWidth) / 2;
    } else if (align === 'right') {
      const textWidth = font.widthOfTextAtSize(line, fontSize);
      drawX = x + maxWidth - textWidth;
    }

    page.drawText(line, {
      x: drawX,
      y: currentY,
      size: fontSize,
      font,
      color: rgb(...color),
    });

    currentY -= lineSpacing;
  }

  return currentY;
}

/**
 * Draw blank lines for user input
 * Returns the Y position after the lines
 */
export function drawBlankLines(
  page: PDFPage,
  x: number,
  width: number,
  options: BlankLinesOptions,
  style: PDFStyleConfig = defaultPDFStyle
): number {
  const { startY, numberOfLines, lineHeight, style: lineStyle } = options;
  let currentY = startY;

  for (let i = 0; i < numberOfLines; i++) {
    if (lineStyle === 'dotted') {
      // Draw dotted line
      const dotSpacing = 8;
      for (let dotX = x; dotX < x + width; dotX += dotSpacing) {
        page.drawRectangle({
          x: dotX,
          y: currentY,
          width: 2,
          height: 0.5,
          color: rgb(...style.colors.lightText),
        });
      }
    } else {
      // Draw solid line
      page.drawLine({
        start: { x, y: currentY },
        end: { x: x + width, y: currentY },
        thickness: 0.5,
        color: rgb(...style.colors.lightText),
      });
    }

    currentY -= lineHeight;
  }

  return currentY;
}

/**
 * Add page number and footer watermark
 */
export function addPageFooter(
  page: PDFPage,
  pageNumber: number,
  font: PDFFont,
  style: PDFStyleConfig = defaultPDFStyle,
  challengeTitle?: string
): void {
  const { width } = style.pageSize;
  const footerY = style.margins.bottom / 2;

  // Challenge title (left side)
  if (challengeTitle) {
    // Clean the title - remove newlines and keep it concise
    const cleanTitle = challengeTitle.replace(/[\r\n]/g, ' ').trim();
    page.drawText(cleanTitle, {
      x: style.margins.left,
      y: footerY,
      size: style.fontSizes.footer,
      font,
      color: rgb(...style.colors.lightText),
      opacity: 0.6,
    });
  }

  // Page number (center) - "Page X" format
  const pageText = `Page ${pageNumber}`;
  const textWidth = font.widthOfTextAtSize(pageText, style.fontSizes.footer);
  page.drawText(pageText, {
    x: (width - textWidth) / 2,
    y: footerY,
    size: style.fontSizes.footer,
    font,
    color: rgb(...style.colors.text), // Changed from lightText to text for better visibility
  });

  // Watermark (bottom right)
  const watermark = 'GratefulToday.com';
  const watermarkWidth = font.widthOfTextAtSize(watermark, style.fontSizes.footer);
  page.drawText(watermark, {
    x: width - style.margins.right - watermarkWidth,
    y: footerY,
    size: style.fontSizes.footer,
    font,
    color: rgb(...style.colors.lightText),
    opacity: 0.6,
  });
}

/**
 * Create a new page with default background
 */
export function createStyledPage(
  pdfDoc: PDFDocument,
  style: PDFStyleConfig = defaultPDFStyle
): PDFPage {
  const page = pdfDoc.addPage([style.pageSize.width, style.pageSize.height]);

  // Optional: Add subtle background color
  // page.drawRectangle({
  //   x: 0,
  //   y: 0,
  //   width: style.pageSize.width,
  //   height: style.pageSize.height,
  //   color: rgb(...style.colors.background),
  // });

  return page;
}

/**
 * Calculate available content width based on margins
 */
export function getContentWidth(style: PDFStyleConfig = defaultPDFStyle): number {
  return style.pageSize.width - style.margins.left - style.margins.right;
}

/**
 * Get starting Y position for content (from top of page)
 */
export function getContentStartY(style: PDFStyleConfig = defaultPDFStyle): number {
  return style.pageSize.height - style.margins.top;
}
