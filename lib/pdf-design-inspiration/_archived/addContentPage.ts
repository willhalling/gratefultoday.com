import { PDFDocument, PDFFont, rgb } from 'pdf-lib';
import { ScrapedContent } from '@/types/audit';
import { addSectionPageHeading } from '../utils/addSectionPageHeading';
import { drawTextWithWrapping } from '../utils/drawTextWithWrapping';
import { addWordCloud, WordCloudData } from '../utils/addWordCloud'; // Import word cloud utility

// Page colors from addSectionPageHeading
const PAGE_COLORS = [
  { r: 0.2, g: 0.4, b: 0.8 },  // Blue
  { r: 0.2, g: 0.7, b: 0.4 },  // Green
  { r: 0.9, g: 0.5, b: 0.2 },  // Orange
  { r: 0.6, g: 0.2, b: 0.8 },  // Purple
  { r: 0.2, g: 0.8, b: 0.7 },  // Teal
  { r: 0.9, g: 0.2, b: 0.3 },  // Red
];
import { addList } from '../utils/addList';

interface MetaDataEntry {
  label: string;
  value: string;
  color?: string;
  issue?: string;
  suggestion?: string;
}

export const addContentPage = async (pdfDoc: PDFDocument, pageData: ScrapedContent, headingFont: PDFFont, bodyFont: PDFFont, pageIndex: number = 0) => {
  const { page, width, contentStartY, contentStartX } = addSectionPageHeading(
    pdfDoc,
    'Page Analysis',
    rgb(1, 1, 1), // White text on colored background
    headingFont,
    pageIndex,
    pageData.url,
    rgb(0.3, 0.3, 0.3) // Gray color for URL
  );

  // Build headers display string with line breaks
  const headersDisplay = [
    (pageData as any).headings?.h1?.[0] && `H1: ${(pageData as any).headings.h1[0]}`,
    ...((pageData as any).headings?.h2?.length > 0 ? (pageData as any).headings.h2.map((h: string) => `H2: ${h}`) : []),
    ...((pageData as any).headings?.h3?.length > 0 ? (pageData as any).headings.h3.map((h: string) => `H3: ${h}`) : []),
    ...((pageData as any).headings?.h4?.length > 0 ? (pageData as any).headings.h4.map((h: string) => `H4: ${h}`) : []),
    ...((pageData as any).headings?.h5?.length > 0 ? (pageData as any).headings.h5.map((h: string) => `H5: ${h}`) : []),
    ...((pageData as any).headings?.h6?.length > 0 ? (pageData as any).headings.h6.map((h: string) => `H6: ${h}`) : [])
  ].filter(Boolean).join('\n') || 'No headers found';

  // Build CTAs display string with line breaks
  const ctasDisplay = pageData.ctas && pageData.ctas.length > 0 
    ? pageData.ctas.slice(0, 5).join('\n') 
    : 'No CTAs found';

  // Check if meta description is missing
  const hasMetaDescription = pageData.metaDescription && pageData.metaDescription.trim().length > 0;
  const metaDescriptionDisplay = hasMetaDescription 
    ? pageData.metaDescription 
    : 'No meta description found';

  // Create enhanced metadata
  const metaDataEntries: MetaDataEntry[] = [
    {
      label: 'URL',
      value: pageData.url
    },
    {
      label: 'Meta Title',
      value: pageData.metaTitle
    },
    {
      label: 'Meta Description',
      value: metaDescriptionDisplay,
      color: hasMetaDescription ? undefined : 'red',
      issue: hasMetaDescription ? undefined : 'Missing meta description',
      suggestion: hasMetaDescription ? undefined : 'Add a compelling meta description (150-160 characters) that summarizes the page content and includes relevant keywords to improve search engine visibility and click-through rates.'
    },
    {
      label: 'Word Count',
      value: pageData.wordCount.toString(),
      ...(pageData.wordCount >= 300 ? {} : {
        color: 'orange',
        issue: 'Low word count',
        suggestion: `Current word count is ${pageData.wordCount}. Consider adding more valuable content to reach at least 300 words for better SEO performance and user engagement.`
      })
    },
    {
      label: 'Headers',
      value: headersDisplay,
      ...(pageData.isHeaderOrderValid ? {} : {
        color: 'red',
        issue: 'Invalid header hierarchy',
        suggestion: 'Ensure headers follow proper hierarchy (H1 → H2 → H3, etc.) to improve accessibility and SEO structure.'
      })
    },
    {
      label: 'Top 5 CTAs',
      value: ctasDisplay,
      ...(pageData.ctas && pageData.ctas.length > 0 ? {} : {
        issue: 'No CTAs found',
        suggestion: 'Add clear call-to-action buttons or links to guide users toward desired actions (e.g., "Contact Us", "Learn More", "Get Started").'
      })
    }
  ];

  // Add Content Analysis Insights if available
  if (pageData.contentAnalysis) {
    const additionalEntries: MetaDataEntry[] = [
      {
        label: 'Content Tone',
        value: pageData.contentAnalysis.toneAnalysis || 'Not analyzed'
      },
      {
        label: 'Writing Style',
        value: pageData.contentAnalysis.writingStyle || 'Not analyzed'
      },
      {
        label: 'Target Audience',
        value: pageData.contentAnalysis.targetAudience || 'Not analyzed'
      },
      {
        label: 'Reading Difficulty',
        value: pageData.contentAnalysis.readabilityLevel || 'Not analyzed'
      },
      {
        label: 'Top Keywords',
        value: pageData.contentAnalysis.topKeywords?.slice(0, 3).join(', ') || 'Not analyzed'
      }
    ];
    metaDataEntries.push(...additionalEntries);
  }

  // Convert to the format expected by drawTextWithWrapping without numbers
  const metaData: [string, string, string?][] = metaDataEntries.map(entry => [
    entry.label,
    entry.value,
    entry.color
  ]);

  // Display metadata using the original column layout
  let currentY = contentStartY;
  const leftColumnX = contentStartX;
  const rightColumnX = contentStartX + (width - contentStartX) / 3;
  
  currentY = drawTextWithWrapping(page, currentY, leftColumnX, rightColumnX, headingFont, bodyFont, metaData);

  // Add word cloud if available (positioned higher and smaller)
  if (pageData.contentAnalysis?.wordCloudData && pageData.contentAnalysis.wordCloudData.length > 0) {
    const wordCloudData: WordCloudData[] = pageData.contentAnalysis.wordCloudData;
    
    // Account for diagonal bar margin (50px strip + 20px spacing = 70px)
    const leftMargin = 70; // Start after diagonal bar
    const availableWidth = width - leftMargin - 20; // Account for right margin too
    
    // Position word cloud below the metadata, accounting for left margin
    const wordCloudX = leftMargin + availableWidth / 2; // Center in available space
    const wordCloudY = currentY - 100; // Position higher, closer to metadata
    const wordCloudWidth = Math.min(availableWidth - 60, 400); // Smaller width
    const wordCloudHeight = 200; // Smaller height for more compact display
    
    // Get page color for word cloud
    const pageColor = PAGE_COLORS[pageIndex % PAGE_COLORS.length];
    
    // Draw white background for word cloud (smaller area)
    page.drawRectangle({
      x: leftMargin,
      y: currentY - 250,
      width: availableWidth,
      height: 200,
      color: rgb(1, 1, 1), // White background
    });
    
    try {
      await addWordCloud(
        page, 
        wordCloudX, 
        wordCloudY, 
        wordCloudWidth, 
        wordCloudHeight, 
        wordCloudData,
        pageColor
      );
    } catch (error) {
      console.error('Error adding word cloud to analysis page:', error);
      
      // Fallback: show "no data" message
      const noDataText = `No keyword data available for ${pageData.pagePath || 'this page'}`;
      const textWidth = bodyFont.widthOfTextAtSize(noDataText, 14);
      page.drawText(noDataText, {
        x: leftMargin + (availableWidth - textWidth) / 2,
        y: wordCloudY,
        size: 14,
        font: bodyFont,
        color: rgb(0.3, 0.3, 0.3), // Darker text for white background
      });
    }
  } else {
    // No word cloud data available - show a message
    const leftMargin = 70;
    const availableWidth = width - leftMargin - 50;
    const noDataText = `No keyword data available for ${pageData.pagePath || 'this page'}`;
    const textWidth = bodyFont.widthOfTextAtSize(noDataText, 14);
    
    // Draw white background
    page.drawRectangle({
      x: leftMargin,
      y: currentY - 170,
      width: availableWidth,
      height: 120,
      color: rgb(1, 1, 1), // White background
    });
    
    page.drawText(noDataText, {
      x: leftMargin + (availableWidth - textWidth) / 2,
      y: currentY - 110,
      size: 14,
      font: bodyFont,
      color: rgb(0.3, 0.3, 0.3), // Darker text for white background
    });
  }
};
