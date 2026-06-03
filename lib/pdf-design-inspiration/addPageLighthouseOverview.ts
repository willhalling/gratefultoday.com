import { PDFDocument, rgb } from 'pdf-lib';
import { ScrapedContent } from '@/types/audit';
import { addSectionPageHeading } from '../utils/addSectionPageHeading';
import { addPieChart } from '../utils/addPieChart';
import { addSubHeader } from '../utils/addSubHeader';

export const addPageLighthouseOverview = async (
  doc: PDFDocument,
  pageData: ScrapedContent,
  headingFont: any,
  bodyFont: any,
  pageIndex: number = 0,
  auditData?: any // Add auditData parameter to access lighthouse data
): Promise<void> => {
  // Get Lighthouse data from page data (based on actual audit structure)
  const lighthouseDesktop = pageData.lighthouseDesktop;
  const lighthouseMobile = pageData.lighthouseMobile;
  
  console.log('🔍 Desktop Lighthouse data in PDF:', !!lighthouseDesktop);
  console.log('🔍 Mobile Lighthouse data in PDF:', !!lighthouseMobile);

  if (!lighthouseDesktop && !lighthouseMobile) {
    // Create page with no data message
    const { page, contentStartY, contentStartX } = addSectionPageHeading(
      doc,
      'Page Lighthouse Overview',
      rgb(1, 1, 1), // White text
      headingFont,
      pageIndex, // Use matching page index for color consistency
      pageData.url, // Pass the actual page URL
      rgb(0.3, 0.3, 0.3)
    );

    page.drawText(`No Lighthouse data available for this page.`, {
      x: contentStartX,
      y: contentStartY - 50,
      size: 14,
      font: bodyFont,
      color: rgb(0.4, 0.4, 0.4),
    });
    return;
  }

  // Create page with diagonal heading - Pages section
  const { page, contentStartY, contentStartX } = addSectionPageHeading(
    doc,
    'Page Lighthouse Overview',
    rgb(1, 1, 1), // White text
    headingFont,
    pageIndex, // Use matching page index for color consistency
    pageData.url, // Pass the actual page URL
    rgb(0.3, 0.3, 0.3)
  );

  let currentY = contentStartY - 20;
  const pageWidth = page.getWidth();
  
  // Content area: Start after diagonal heading, end 20px from right edge
  const leftMargin = contentStartX; // Start after diagonal heading
  const rightMargin = pageWidth - 20; // End 20px from right edge
  const contentWidth = rightMargin - leftMargin;

  // DEBUG: Draw vertical lines to show margins
  // const pageHeight = page.getHeight();
  
  // // Left margin line (red) - after diagonal heading
  // page.drawLine({
  //   start: { x: leftMargin, y: 0 },
  //   end: { x: leftMargin, y: pageHeight },
  //   thickness: 2,
  //   color: rgb(1, 0, 0), // Red
  // });
  
  // // Right margin line (red) - 20px from right edge
  // page.drawLine({
  //   start: { x: rightMargin, y: 0 },
  //   end: { x: rightMargin, y: pageHeight },
  //   thickness: 2,
  //   color: rgb(1, 0, 0), // Red
  // });

  // DEBUG: Add text to show margin values
  // page.drawText(`Left: ${leftMargin}px`, {
  //   x: leftMargin + 5,
  //   y: pageHeight - 50,
  //   size: 10,
  //   font: bodyFont,
  //   color: rgb(1, 0, 0),
  // });
  
  // page.drawText(`Right: ${rightMargin}px`, {
  //   x: rightMargin - 80,
  //   y: pageHeight - 50,
  //   size: 10,
  //   font: bodyFont,
  //   color: rgb(1, 0, 0),
  // });
  
  // page.drawText(`Content Width: ${contentWidth}px`, {
  //   x: leftMargin + (contentWidth - bodyFont.widthOfTextAtSize(`Content Width: ${contentWidth}px`, 10)) / 2,
  //   y: pageHeight - 70,
  //   size: 10,
  //   font: bodyFont,
  //   color: rgb(1, 0, 0),
  // });

  // DEBUG: Show page width for reference
  // page.drawText(`Page Width: ${pageWidth}px`, {
  //   x: leftMargin + (contentWidth - bodyFont.widthOfTextAtSize(`Page Width: ${pageWidth}px`, 10)) / 2,
  //   y: pageHeight - 90,
  //   size: 10,
  //   font: bodyFont,
  //   color: rgb(0, 0.5, 1),
  // });

  // Handle both desktop and mobile data - scores are directly in the lighthouse objects
  const desktopData = lighthouseDesktop;
  const mobileData = lighthouseMobile;
  
  // Enhanced debugging for data structure
  console.log('🔍 LIGHTHOUSE DATA STRUCTURE DEBUG:');
  console.log('🔍 lighthouseDesktop:', lighthouseDesktop);
  console.log('🔍 lighthouseMobile:', lighthouseMobile);
  console.log('🔍 desktopData:', desktopData);
  console.log('🔍 mobileData:', mobileData);
  
  if (desktopData) {
    console.log('🔍 desktopData keys:', Object.keys(desktopData));
    console.log('🔍 desktopData performance:', desktopData.performance);
    console.log('🔍 desktopData accessibility:', desktopData.accessibility);
    console.log('🔍 desktopData bestPractices:', desktopData.bestPractices);
    console.log('🔍 desktopData seo:', desktopData.seo);
  }

  // Main title: Lighthouse Scores - Use subheader utility
  currentY = addSubHeader(
    page,
    'Lighthouse Scores',
    leftMargin,
    currentY,
    headingFont,
    16,
    rgb(0, 0, 0),
    contentWidth  // Pass the full content width for the underline
  );
  
  currentY -= 20;

  // Function to extract score from metrics data
  const extractScore = (metrics: any, key: string, altKey?: string): number => {
    let score = 0;
    
    if (metrics) {
      if (metrics[key] !== undefined) {
        score = metrics[key];
      } else if (altKey && metrics[altKey] !== undefined) {
        score = metrics[altKey];
      }
    }
    
    // Ensure score is a number and within 0-100 range
    score = Number(score) || 0;
    if (score > 1 && score <= 1) {
      score = score * 100; // Convert from 0-1 to 0-100 if needed
    }
    return Math.min(100, Math.max(0, score)); // Clamp between 0-100
  };

  // Draw metrics table with Desktop and Mobile columns
  const drawMetricsTable = async (startY: number) => {
    console.log('🔍 Drawing metrics table');
    
    const metricsArray = [
      { key: 'performance', label: 'Performance', altKey: undefined },
      { key: 'accessibility', label: 'Accessibility', altKey: undefined },
      { key: 'bestPractices', label: 'Best Practices', altKey: 'best-practices' },
      { key: 'seo', label: 'SEO', altKey: undefined },
    ];

    // Table setup
    const tableStartY = startY;
    const rowHeight = 90; // Increased height for larger pie charts
    const pieChartRadius = 28; // Larger pie charts for better readability (was 23)
    
    // Column positions - adjusted for better centering
    const metricCol = leftMargin;
    const desktopColWidth = contentWidth * 0.3; // Column width for desktop
    const mobileColWidth = contentWidth * 0.3; // Column width for mobile
    const desktopCol = leftMargin + contentWidth * 0.35; // Start of desktop column
    const mobileCol = leftMargin + contentWidth * 0.65; // Start of mobile column
    
    // Table headers
    page.drawText('Metric', {
      x: metricCol,
      y: tableStartY,
      size: 12,
      font: headingFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    
    // Center the "Desktop Score" header
    const desktopHeaderText = 'Desktop Score';
    const desktopHeaderWidth = headingFont.widthOfTextAtSize(desktopHeaderText, 12);
    page.drawText(desktopHeaderText, {
      x: desktopCol + desktopColWidth / 2 - desktopHeaderWidth / 2,
      y: tableStartY,
      size: 12,
      font: headingFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    
    // Center the "Mobile Score" header
    const mobileHeaderText = 'Mobile Score';
    const mobileHeaderWidth = headingFont.widthOfTextAtSize(mobileHeaderText, 12);
    page.drawText(mobileHeaderText, {
      x: mobileCol + mobileColWidth / 2 - mobileHeaderWidth / 2,
      y: tableStartY,
      size: 12,
      font: headingFont,
      color: rgb(0.2, 0.2, 0.2),
    });

    let currentRowY = tableStartY - 45; // Increased margin below headers from 35 to 45

    // Draw each metric row
    for (const metric of metricsArray) {
      // Metric name - vertically centered with pie charts
      page.drawText(metric.label, {
        x: metricCol,
        y: currentRowY, // Centered vertically with pie chart center
        size: 11,
        font: bodyFont,
        color: rgb(0, 0, 0),
      });

      // Desktop score
      const desktopScore = extractScore(desktopData, metric.key, metric.altKey);
      console.log(`🔍 Desktop ${metric.key} score:`, desktopScore);
      
      // Center desktop pie chart in its column
      const desktopPieX = desktopCol + desktopColWidth / 2;
      await addPieChart(page, desktopPieX, currentRowY, pieChartRadius, desktopScore);
      
      // Center desktop score text below pie chart (keep original black color)
      const desktopScoreText = `${desktopScore}/100`;
      const desktopScoreWidth = bodyFont.widthOfTextAtSize(desktopScoreText, 9);
      page.drawText(desktopScoreText, {
        x: desktopPieX - desktopScoreWidth / 2,
        y: currentRowY - pieChartRadius - 18,
        size: 9,
        font: headingFont,
        color: rgb(0, 0, 0), // Keep black color for pie chart text
      });

      // Mobile score (if available)
      if (mobileData) {
        const mobileScore = extractScore(mobileData, metric.key, metric.altKey);
        console.log(`🔍 Mobile ${metric.key} score:`, mobileScore);
        
        // Center mobile pie chart in its column
        const mobilePieX = mobileCol + mobileColWidth / 2;
        await addPieChart(page, mobilePieX, currentRowY, pieChartRadius, mobileScore);
        
        // Center mobile score text below pie chart (keep original black color)
        const mobileScoreText = `${mobileScore}/100`;
        const mobileScoreWidth = bodyFont.widthOfTextAtSize(mobileScoreText, 9);
        page.drawText(mobileScoreText, {
          x: mobilePieX - mobileScoreWidth / 2,
          y: currentRowY - pieChartRadius - 18,
          size: 9,
          font: headingFont,
          color: rgb(0, 0, 0), // Keep black color for pie chart text
        });
      } else {
        // Center "N/A" text in mobile column
        const naText = 'N/A';
        const naWidth = bodyFont.widthOfTextAtSize(naText, 11);
        page.drawText(naText, {
          x: mobileCol + mobileColWidth / 2 - naWidth / 2,
          y: currentRowY,
          size: 11,
          font: bodyFont,
          color: rgb(0.5, 0.5, 0.5),
        });
      }

      currentRowY -= rowHeight;
    }

    // Add extra margin below the entire pie chart section
    currentRowY -= 0; // Additional margin below all pie charts

    return currentRowY; // Return the next Y position
  };

  // Draw the metrics table
  currentY = await drawMetricsTable(currentY);

  // Reduced margin below metrics table for tighter layout
  currentY -= 0; // Further reduced from 30 to 20 for tighter spacing
  
  // 1. Lighthouse Scores Legend - Horizontal layout without heading
  const legendItems = [
    { range: '90-100', label: 'Excellent', color: rgb(0.063, 0.725, 0.506) }, // Green: #10B981 (pie chart green)
    { range: '50-89', label: 'Needs Improvement', color: rgb(0.961, 0.620, 0.043) }, // Orange: #F59E0B (pie chart orange)
    { range: '0-49', label: 'Poor', color: rgb(0.937, 0.278, 0.267) }, // Red: #EF4444 (pie chart red)
  ];

  // Calculate total width needed for all legend items
  const legendSpacing = 40; // Space between legend items
  let totalLegendWidth = 0;
  const legendItemWidths: number[] = [];
  
  legendItems.forEach((item) => {
    const itemText = `${item.range}: ${item.label}`;
    const itemTextWidth = bodyFont.widthOfTextAtSize(itemText, 11);
    const itemWidth = 20 + itemTextWidth; // Circle space + text width
    legendItemWidths.push(itemWidth);
    totalLegendWidth += itemWidth;
  });
  
  // Add spacing between items
  totalLegendWidth += legendSpacing * (legendItems.length - 1);
  
  // Start position to center the entire legend
  let legendStartX = leftMargin + (contentWidth - totalLegendWidth) / 2;
  
  // Draw legend items horizontally
  legendItems.forEach((item, index) => {
    const itemText = `${item.range}: ${item.label}`;
    
    // Draw colored circle
    page.drawCircle({
      x: legendStartX + 8,
      y: currentY + 4,
      size: 5,
      color: item.color,
    });

    // Draw legend text
    page.drawText(itemText, {
      x: legendStartX + 20,
      y: currentY,
      size: 11,
      font: bodyFont,
      color: rgb(0.3, 0.3, 0.3),
    });
    
    // Move to next position
    legendStartX += legendItemWidths[index] + legendSpacing;
  });

  currentY -= 60;

  // 2. What Each Category Measures - Use subheader utility
  currentY = addSubHeader(
    page,
    'What Each Lighthouse Category Measures',
    leftMargin,
    currentY,
    headingFont,
    14,
    rgb(0.2, 0.2, 0.2),
    contentWidth  // Pass the full content width for the underline
  );

  currentY -= 10;

  // Center the table within the content area
  const tableWidth = contentWidth * 0.8; // Use 80% of content width
  const tableStartX = leftMargin + (contentWidth - tableWidth) / 2;
  
  // Table headers for categories - centered table with left-aligned text
  const catCol1X = tableStartX;
  const catCol2X = tableStartX + tableWidth * 0.25;
  
  page.drawText('Category', { x: catCol1X, y: currentY, size: 11, font: headingFont, color: rgb(0.2, 0.2, 0.2) });
  page.drawText('What it measures', { x: catCol2X, y: currentY, size: 11, font: headingFont, color: rgb(0.2, 0.2, 0.2) });
  currentY -= 20;

  const categoryData = [
    { category: 'Performance', description: 'How fast your pages load and respond to user interactions' },
    { category: 'Accessibility', description: 'How well your site works for users with disabilities' },
    { category: 'Best Practices', description: 'Security, modern web standards, and code quality' },
    { category: 'SEO', description: 'How well search engines can find and understand your content' },
  ];

  categoryData.forEach((item, index) => {
    const rowY = currentY - (index * 18);
    page.drawText(item.category, { x: catCol1X, y: rowY, size: 10, font: bodyFont, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(item.description, { x: catCol2X, y: rowY, size: 10, font: bodyFont, color: rgb(0.4, 0.4, 0.4) });
  });
};
