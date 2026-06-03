import { PDFDocument, rgb } from 'pdf-lib';
import { ScrapedContent } from '@/types/audit';
import { addSectionPageHeading } from '../utils/addSectionPageHeading';
import { addSubHeader } from '../utils/addSubHeader';

export const addPageLighthouseTables = async (
  doc: PDFDocument,
  pageData: ScrapedContent,
  headingFont: any,
  bodyFont: any,
  pageIndex: number = 0
): Promise<void> => {
  const lighthouseDesktop = pageData.lighthouseDesktop;
  const lighthouseMobile = pageData.lighthouseMobile;

  // Function to extract vital values from lighthouse data
  const extractVitalValue = (data: any, key: string) => {
    if (!data) return 'N/A';
    
    switch(key) {
      case 'first-contentful-paint':
        return data?.firstContentfulPaint ? `${data.firstContentfulPaint}ms` : 'N/A';
      case 'largest-contentful-paint':
        return data?.largestContentfulPaint ? `${data.largestContentfulPaint}ms` : 'N/A';
      case 'cumulative-layout-shift':
        return data?.cumulativeLayoutShift !== undefined ? data.cumulativeLayoutShift.toFixed(4) : 'N/A';
      case 'total-blocking-time':
        return data?.totalBlockingTime !== undefined ? `${data.totalBlockingTime}ms` : 'N/A';
      case 'speed-index':
        return data?.speedIndex ? `${data.speedIndex}ms` : 'N/A';
      case 'interaction-to-next-paint':
        return data?.interactionToNextPaint ? `${data.interactionToNextPaint}ms` : 'N/A';
      default:
        return 'N/A';
    }
  };

  // Function to get "What it means" text based on score
  const getWhatItMeans = (key: string, value: string) => {
    if (value === 'N/A') return 'No data available';
    
    const numericValue = parseFloat(value.replace(/ms|s/g, ''));
    
    switch(key) {
      case 'first-contentful-paint':
        if (numericValue <= 1800) return 'First thing appears on screen very fast';
        if (numericValue <= 3000) return 'First content appears at moderate speed';
        return 'First content appears slowly';
        
      case 'largest-contentful-paint':
        if (numericValue <= 2500) return 'Main content shows up quickly';
        if (numericValue <= 4000) return 'Main content shows up at moderate speed';
        return 'Main content shows up slowly';
        
      case 'cumulative-layout-shift':
        if (numericValue <= 0.1) return 'No shifting/jumping content';
        if (numericValue <= 0.25) return 'Some content shifting occurs';
        return 'Significant content shifting occurs';
        
      case 'total-blocking-time':
        if (numericValue <= 200) return 'Page stays responsive';
        if (numericValue <= 600) return 'Page has some responsiveness delays';
        return 'Page has significant responsiveness issues';
        
      case 'speed-index':
        if (numericValue <= 3400) return 'Overall speed feel is fast';
        if (numericValue <= 5800) return 'Overall speed feel is moderate';
        return 'Overall speed feel is slow';
        
      case 'interaction-to-next-paint':
        if (numericValue <= 200) return 'Page responds to clicks instantly';
        if (numericValue <= 500) return 'Page responds to clicks with slight delay';
        return 'Page responds to clicks slowly';
        
      default:
        return 'Performance metric';
    }
  };

  // Function to get CRO insights based on score
  const getCROInsight = (key: string, value: string) => {
    if (value === 'N/A') return 'No data available for optimization';
    
    const numericValue = parseFloat(value.replace(/ms|s/g, ''));
    
    switch(key) {
      case 'first-contentful-paint':
        if (numericValue <= 1800) return 'Fast perception = good first impression';
        if (numericValue <= 3000) return 'Good first impression, room for improvement';
        return 'Slow loading may cause visitors to leave';
        
      case 'largest-contentful-paint':
        if (numericValue <= 2500) return 'Excellent — keeps people from bouncing';
        if (numericValue <= 4000) return 'Acceptable — some bounce risk';
        return 'High bounce risk — visitors may leave';
        
      case 'cumulative-layout-shift':
        if (numericValue <= 0.1) return 'Very user-friendly — prevents accidental clicks';
        if (numericValue <= 0.25) return 'Some user frustration possible';
        return 'High frustration risk — may cause accidental clicks';
        
      case 'total-blocking-time':
        if (numericValue <= 200) return 'Low delay — great for interaction';
        if (numericValue <= 600) return 'Moderate delay — affects user experience';
        return 'High delay — frustrating for users';
        
      case 'speed-index':
        if (numericValue <= 3400) return 'Excellent — visitors see content very quickly';
        if (numericValue <= 5800) return 'Good — reasonable content visibility';
        return 'Poor — slow content visibility may increase bounce';
        
      case 'interaction-to-next-paint':
        if (numericValue <= 200) return 'Instant response — excellent user experience';
        if (numericValue <= 500) return 'Acceptable, but can improve for snappier feel';
        return 'Slow response — may frustrate users';
        
      default:
        return 'Performance impacts user experience';
    }
  };

  // Function to get color based on Core Web Vitals performance
  const getVitalColor = (key: string, value: string) => {
    if (value === 'N/A') return rgb(0.5, 0.5, 0.5); // Gray for N/A
    
    const numericValue = parseFloat(value.replace(/ms|s/g, ''));
    
    switch(key) {
      case 'first-contentful-paint':
        if (numericValue <= 1800) return rgb(0.063, 0.725, 0.506); // Green
        if (numericValue <= 3000) return rgb(0.961, 0.620, 0.043); // Orange
        return rgb(0.937, 0.278, 0.267); // Red
        
      case 'largest-contentful-paint':
        if (numericValue <= 2500) return rgb(0.063, 0.725, 0.506); // Green
        if (numericValue <= 4000) return rgb(0.961, 0.620, 0.043); // Orange
        return rgb(0.937, 0.278, 0.267); // Red
        
      case 'cumulative-layout-shift':
        if (numericValue <= 0.1) return rgb(0.063, 0.725, 0.506); // Green
        if (numericValue <= 0.25) return rgb(0.961, 0.620, 0.043); // Orange
        return rgb(0.937, 0.278, 0.267); // Red
        
      case 'total-blocking-time':
        if (numericValue <= 200) return rgb(0.063, 0.725, 0.506); // Green
        if (numericValue <= 600) return rgb(0.961, 0.620, 0.043); // Orange
        return rgb(0.937, 0.278, 0.267); // Red
        
      case 'speed-index':
        if (numericValue <= 3400) return rgb(0.063, 0.725, 0.506); // Green
        if (numericValue <= 5800) return rgb(0.961, 0.620, 0.043); // Orange
        return rgb(0.937, 0.278, 0.267); // Red
        
      case 'interaction-to-next-paint':
        if (numericValue <= 200) return rgb(0.063, 0.725, 0.506); // Green
        if (numericValue <= 500) return rgb(0.961, 0.620, 0.043); // Orange
        return rgb(0.937, 0.278, 0.267); // Red
        
      default:
        return rgb(0.5, 0.5, 0.5); // Gray for unknown
    }
  };

  // Helper function to wrap text
  const wrapText = (text: string, font: any, fontSize: number, maxWidth: number): string[] => {
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
  };

  // Only create the page if we have at least one set of data
  if (!lighthouseDesktop && !lighthouseMobile) {
    return;
  }

  // Create a single page for both tables
  const { page, contentStartY, contentStartX } = addSectionPageHeading(
    doc,
    'Performance Metrics',
    rgb(1, 1, 1), // White text
    headingFont,
    pageIndex,
    pageData.url, // Pass the actual page URL
    rgb(0.3, 0.3, 0.3)
  );

  const pageWidth = page.getWidth();
  const leftMargin = contentStartX;
  const rightMargin = pageWidth - 20;
  const contentWidth = rightMargin - leftMargin;

  // Add subheading
  let currentY = contentStartY;
  currentY = addSubHeader(
    page,
    'Key Performance Metrics (All are in milliseconds, lower = better)',
    leftMargin,
    currentY - 20,
    headingFont,
    14,
    rgb(0.2, 0.2, 0.2),
    contentWidth  // Pass the full content width for the underline
  );

  currentY -= 20;

  // Table setup - properly calculated column widths with padding that respect page margins
  const columnPadding = 8; // Padding between columns
  const availableWidth = contentWidth - (columnPadding * 3); // Total available width minus padding
  
  const columnWidths = {
    metric: availableWidth * 0.25,
    score: availableWidth * 0.15,
    meaning: availableWidth * 0.30,
    insight: availableWidth * 0.30
  };

  const col1X = leftMargin;
  const col2X = col1X + columnWidths.metric + columnPadding;
  const col3X = col2X + columnWidths.score + columnPadding;
  const col4X = col3X + columnWidths.meaning + columnPadding;

  // Function to add a table for desktop or mobile
  const addTable = (data: any, title: string, startY: number) => {
    let tableY = startY;

    // Table title
    page.drawText(title, {
      x: leftMargin,
      y: tableY,
      size: 13,
      font: headingFont,
      color: rgb(0.2, 0.2, 0.2)
    });

    tableY -= 40;

    // Table headers
    const headerColor = rgb(0.2, 0.2, 0.2);
    page.drawText('Metric', { x: col1X, y: tableY, size: 10, font: headingFont, color: headerColor });
    page.drawText('Score', { x: col2X, y: tableY, size: 10, font: headingFont, color: headerColor });
    page.drawText('What it means', { x: col3X, y: tableY, size: 10, font: headingFont, color: headerColor });
    page.drawText('CRO Insight', { x: col4X, y: tableY, size: 10, font: headingFont, color: headerColor });

    // Header underline
    tableY -= 10;
    page.drawLine({
      start: { x: leftMargin, y: tableY },
      end: { x: leftMargin + contentWidth, y: tableY },
      thickness: 1,
      color: rgb(0.9, 0.9, 0.9)
    });

    tableY -= 20;

    // Add table rows
    const addTableRow = (displayName: string, scoreKey: string) => {
      const scoreValue = extractVitalValue(data, scoreKey);
      const whatItMeans = getWhatItMeans(scoreKey, scoreValue);
      const croInsight = getCROInsight(scoreKey, scoreValue);
      const scoreColor = getVitalColor(scoreKey, scoreValue);

      // Metric name - wrap if necessary
      const metricLines = wrapText(displayName, headingFont, 10, columnWidths.metric - 5);
      let metricY = tableY;
      metricLines.forEach((line: string) => {
        page.drawText(line, {
          x: col1X,
          y: metricY,
          size: 10,
          font: headingFont,
          color: rgb(0, 0, 0)
        });
        metricY -= 12;
      });

      // Score with color - wrap if necessary
      const scoreLines = wrapText(scoreValue, headingFont, 10, columnWidths.score - 5);
      let scoreY = tableY;
      scoreLines.forEach((line: string) => {
        page.drawText(line, {
          x: col2X,
          y: scoreY,
          size: 10,
          font: headingFont,
          color: scoreColor
        });
        scoreY -= 12;
      });

      // What it means (wrapped with proper column width)
      const meaningLines = wrapText(whatItMeans, bodyFont, 10, columnWidths.meaning - 5);
      let meaningY = tableY;
      meaningLines.forEach((line: string) => {
        page.drawText(line, {
          x: col3X,
          y: meaningY,
          size: 10,
          font: bodyFont,
          color: rgb(0.4, 0.4, 0.4)
        });
        meaningY -= 12;
      });

      // CRO Insight (wrapped with proper column width)
      const insightLines = wrapText(croInsight, bodyFont, 10, columnWidths.insight - 5);
      let insightY = tableY;
      insightLines.forEach((line: string) => {
        page.drawText(line, {
          x: col4X,
          y: insightY,
          size: 10,
          font: bodyFont,
          color: rgb(0, 0, 0)
        });
        insightY -= 12;
      });

      // Calculate row height based on the maximum lines across all columns
      const maxLines = Math.max(
        metricLines.length,
        scoreLines.length,
        meaningLines.length,
        insightLines.length,
        1
      );
      tableY -= (maxLines * 12) + 20; // Proper spacing between rows
    };

    // Add all metrics
    addTableRow('First Contentful Paint', 'first-contentful-paint');
    addTableRow('Largest Contentful Paint', 'largest-contentful-paint');
    addTableRow('Cumulative Layout Shift', 'cumulative-layout-shift');
    addTableRow('Total Blocking Time', 'total-blocking-time');
    addTableRow('Speed Index', 'speed-index');
    addTableRow('Interaction to Next Paint', 'interaction-to-next-paint');

    return tableY;
  };

  // Add Desktop table if data exists
  if (lighthouseDesktop) {
    currentY = addTable(lighthouseDesktop, 'Desktop Performance', currentY);
    currentY -= 20; // Space between tables
  }

  // Add Mobile table if data exists
  if (lighthouseMobile) {
    currentY = addTable(lighthouseMobile, 'Mobile Performance', currentY);
  }
};
