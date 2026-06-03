import { PDFDocument, PDFFont, rgb } from 'pdf-lib';
import { PageData, MozAnalysis } from '@/types/audit';
import { addSectionPageHeading } from '../utils/addSectionPageHeading';
import { addSubHeader } from '../utils/addSubHeader';
import { wrapTextAdvanced } from '../utils/wrapTextAdvanced';
import fs from 'fs';
import path from 'path';

export const addMozAnalysisPage = async (
  pdfDoc: PDFDocument, 
  pageData: PageData, 
  headingFont: PDFFont, 
  bodyFont: PDFFont,
  pageIndex: number = 0
) => {
  // Create page with heading
  const { page, width, contentStartY, contentStartX } = addSectionPageHeading(
    pdfDoc,
    'SEO & Authority Analysis',
    rgb(1, 1, 1), // White text on colored background
    headingFont,
    pageIndex,
    pageData.url,
    rgb(0.3, 0.3, 0.3) // Gray color for URL
  );

  let currentY = contentStartY - 20;
  const leftMargin = contentStartX;
  const tableWidth = width - leftMargin - 40;

  // Add MOZ logo PNG where the header would be
  const logoX = leftMargin; // Position from left margin
  const logoY = currentY + 10; // Position slightly higher
  
  // Embed PNG logo
  try {
    const pngPath = path.resolve('./public/images/moz-logo-dark.png');
    const pngImageBytes = fs.readFileSync(pngPath);
    const pngImage = await pdfDoc.embedPng(new Uint8Array(pngImageBytes));
    
    // Calculate dimensions (scale to reasonable size)
    const logoWidth = 120; // Slightly larger since it's replacing the header
    const pngDims = pngImage.scale(logoWidth / pngImage.width);
    
    page.drawImage(pngImage, {
      x: logoX,
      y: logoY - pngDims.height, // Adjust Y to account for image height
      width: pngDims.width,
      height: pngDims.height,
    });
    
    // Adjust currentY to account for logo space
    currentY -= pngDims.height + 20;
  } catch (error) {
    console.warn('Could not load MOZ PNG logo:', error);
    // Fallback: just add some space
    currentY -= 40;
  }

  // Colors
  const headerColor = rgb(0.2, 0.2, 0.2);
  const textColor = rgb(0.4, 0.4, 0.4);
  const excellentColor = rgb(0.2, 0.6, 0.2); // Green for excellent scores
  const goodColor = rgb(0.5, 0.7, 0.2); // Light green for good scores
  const warningColor = rgb(0.9, 0.6, 0.1); // Orange for warning
  const poorColor = rgb(0.8, 0.2, 0.2); // Red for poor scores

  // Helper function to get color based on score type and value
  const getScoreColor = (scoreType: string, value: number) => {
    switch (scoreType) {
      case 'domainAuthority':
      case 'pageAuthority':
        if (value >= 70) return excellentColor;
        if (value >= 50) return goodColor;
        if (value >= 30) return warningColor;
        return poorColor;
      case 'spamScore':
        if (value <= 5) return excellentColor;
        if (value <= 15) return goodColor;
        if (value <= 30) return warningColor;
        return poorColor;
      case 'linkingDomains':
      case 'totalLinks':
        if (value >= 1000) return excellentColor;
        if (value >= 100) return goodColor;
        if (value >= 10) return warningColor;
        return poorColor;
      case 'mozRank':
      case 'mozTrust':
        if (value >= 6) return excellentColor;
        if (value >= 4) return goodColor;
        if (value >= 2) return warningColor;
        return poorColor;
      default:
        return textColor;
    }
  };

  // Check if MOZ data exists
  if (!pageData.mozAnalysis) {
    // No MOZ data available
    currentY = addSubHeader(
      page,
      'MOZ Analysis Data',
      leftMargin,
      currentY,
      headingFont,
      14,
      headerColor
    );
    currentY -= 10;

    const noDataText = 'MOZ analysis data is not available for this page. This could be because:\n\n• The page is not indexed by MOZ\n• The domain is too new\n• MOZ data collection is in progress\n\nConsider running a fresh audit after some time or checking if the page is publicly accessible.';
    
    const wrappedText = wrapTextAdvanced(noDataText, bodyFont, 10, tableWidth);
    wrappedText.forEach(line => {
      page.drawText(line, {
        x: leftMargin,
        y: currentY,
        size: 10,
        font: bodyFont,
        color: textColor
      });
      currentY -= 15;
    });

    return;
  }

  const mozData: MozAnalysis = pageData.mozAnalysis;

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

  // Helper function to get "What it means" text based on MOZ metrics
  const getWhatItMeans = (metric: string, value: number) => {
    switch (metric) {
      case 'domainAuthority':
        if (value >= 70) return 'Excellent authority - strong SEO foundation';
        if (value >= 50) return 'Good authority - competitive position';
        if (value >= 30) return 'Average authority - room for improvement';
        return 'Low authority - needs significant SEO work';
      
      case 'pageAuthority':
        if (value >= 60) return 'High page strength - likely to rank well';
        if (value >= 40) return 'Good page strength - competitive potential';
        if (value >= 20) return 'Moderate page strength - optimization needed';
        return 'Low page strength - requires content/link building';
      
      case 'spamScore':
        if (value <= 5) return 'Very clean - search engines trust this domain';
        if (value <= 15) return 'Clean profile - good search engine standing';
        if (value <= 30) return 'Some spam signals - monitor link quality';
        return 'High spam risk - immediate cleanup needed';
      
      case 'linkingDomains':
        if (value >= 1000) return 'Excellent link diversity - strong authority signal';
        if (value >= 100) return 'Good link diversity - healthy link profile';
        if (value >= 10) return 'Limited diversity - focus on earning more links';
        return 'Very limited links - prioritize link building';
      
      case 'totalLinks':
        if (value >= 10000) return 'High link volume - strong popularity signal';
        if (value >= 1000) return 'Good link volume - decent online presence';
        if (value >= 100) return 'Moderate links - opportunity for growth';
        return 'Few links - needs link acquisition strategy';
      
      case 'mozRank':
        if (value >= 6) return 'High MozRank - strong link equity';
        if (value >= 4) return 'Good MozRank - decent link authority';
        if (value >= 2) return 'Average MozRank - room for link building';
        return 'Low MozRank - needs significant link development';
      
      case 'mozTrust':
        if (value >= 6) return 'High trust - very trustworthy link sources';
        if (value >= 4) return 'Good trust - quality link sources';
        if (value >= 2) return 'Average trust - mixed link quality';
        return 'Low trust - questionable link sources';
      
      default:
        return 'MOZ metric for SEO analysis';
    }
  };

  // Add main subheader - removed, logo takes its place
  // currentY = addSubHeader(
  //   page,
  //   'SEO & MOZ Metrics',
  //   leftMargin,
  //   currentY,
  //   headingFont,
  //   14,
  //   headerColor,
  //   tableWidth
  // );
  // currentY -= 20;

  // Table setup - similar to Lighthouse tables
  const columnPadding = 8;
  const availableWidth = tableWidth - (columnPadding * 2);
  
  const columnWidths = {
    metric: availableWidth * 0.30,
    score: availableWidth * 0.20,
    meaning: availableWidth * 0.50
  };

  const col1X = leftMargin;
  const col2X = col1X + columnWidths.metric + columnPadding;
  const col3X = col2X + columnWidths.score + columnPadding;

  // Authority Metrics Table
  currentY -= 10;
  
  // Full-width heading without underline
  page.drawText('Authority Metrics', {
    x: leftMargin,
    y: currentY,
    size: 13,
    font: headingFont,
    color: rgb(0.2, 0.2, 0.2)
  });

  currentY -= 30;

  // Table headers
  page.drawText('Metric', { x: col1X, y: currentY, size: 10, font: headingFont, color: headerColor });
  
  // Center-align "Score" header
  const scoreHeaderWidth = headingFont.widthOfTextAtSize('Score', 10);
  const scoreHeaderCenterX = col2X + (columnWidths.score - scoreHeaderWidth) / 2;
  page.drawText('Score', { x: scoreHeaderCenterX, y: currentY, size: 10, font: headingFont, color: headerColor });
  
  page.drawText('What it means', { x: col3X, y: currentY, size: 10, font: headingFont, color: headerColor });

  // Header underline
  currentY -= 10;
  page.drawLine({
    start: { x: leftMargin, y: currentY },
    end: { x: leftMargin + tableWidth, y: currentY },
    thickness: 1,
    color: rgb(0.9, 0.9, 0.9)
  });

  currentY -= 20;

  // Function to add a table row similar to Lighthouse
  const addTableRow = (metricName: string, value: string, metricKey: string, numValue: number) => {
    const whatItMeans = getWhatItMeans(metricKey, numValue);
    const scoreColor = getScoreColor(metricKey, numValue);

    // Metric name
    const metricLines = wrapText(metricName, headingFont, 10, columnWidths.metric - 5);
    let metricY = currentY;
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

    // Score with color coding (center-aligned)
    const scoreLines = wrapText(value, headingFont, 10, columnWidths.score - 5);
    let scoreY = currentY;
    scoreLines.forEach((line: string) => {
      const textWidth = headingFont.widthOfTextAtSize(line, 10);
      const centerX = col2X + (columnWidths.score - textWidth) / 2;
      page.drawText(line, {
        x: centerX,
        y: scoreY,
        size: 10,
        font: headingFont,
        color: scoreColor
      });
      scoreY -= 12;
    });

    // What it means
    const meaningLines = wrapText(whatItMeans, bodyFont, 10, columnWidths.meaning - 5);
    let meaningY = currentY;
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

    // Calculate row height based on maximum lines
    const maxLines = Math.max(metricLines.length, scoreLines.length, meaningLines.length, 1);
    currentY -= (maxLines * 12) + 15; // Proper spacing between rows
  };

  // Add authority metrics rows
  addTableRow('Domain Authority', mozData.domainAuthority.toString(), 'domainAuthority', mozData.domainAuthority);
  addTableRow('Page Authority', mozData.pageAuthority.toString(), 'pageAuthority', mozData.pageAuthority);
  addTableRow('Spam Score', `${mozData.spamScore}%`, 'spamScore', mozData.spamScore);
  addTableRow('Linking Domains', mozData.linkingDomains.toLocaleString(), 'linkingDomains', mozData.linkingDomains);
  addTableRow('Total Links', mozData.totalLinks.toLocaleString(), 'totalLinks', mozData.totalLinks);
  addTableRow('MozRank', mozData.mozRank.toString(), 'mozRank', mozData.mozRank);
  addTableRow('MozTrust', mozData.mozTrust.toString(), 'mozTrust', mozData.mozTrust);

  currentY -= 30;

  // Add Keywords section if data exists
  if (mozData.keywords && mozData.keywords.length > 0) {
    currentY = addSubHeader(
      page,
      `Keyword Analysis (${mozData.keywordCount} total)`,
      leftMargin,
      currentY,
      headingFont,
      14,
      headerColor,
      tableWidth
    );
    currentY -= 15;

    // Show top keywords (limit to first 5 to fit on page)
    const topKeywords = mozData.keywords.slice(0, 5);
    
    // Keyword table with proper column widths
    const keywordColumnWidths = {
      keyword: availableWidth * 0.25,
      volume: availableWidth * 0.15,
      difficulty: availableWidth * 0.15,
      priority: availableWidth * 0.15,
      relevance: availableWidth * 0.15,
      potential: availableWidth * 0.15
    };

    // Table headers
    const colHeaders = ['Keyword', 'Volume', 'Difficulty', 'Priority', 'Relevance', 'Potential'];
    const keywordCols = [
      leftMargin,
      leftMargin + keywordColumnWidths.keyword,
      leftMargin + keywordColumnWidths.keyword + keywordColumnWidths.volume,
      leftMargin + keywordColumnWidths.keyword + keywordColumnWidths.volume + keywordColumnWidths.difficulty,
      leftMargin + keywordColumnWidths.keyword + keywordColumnWidths.volume + keywordColumnWidths.difficulty + keywordColumnWidths.priority,
      leftMargin + keywordColumnWidths.keyword + keywordColumnWidths.volume + keywordColumnWidths.difficulty + keywordColumnWidths.priority + keywordColumnWidths.relevance
    ];

    // Draw headers with center alignment for numeric columns
    colHeaders.forEach((header, i) => {
      if (i === 0) {
        // Left-align "Keyword"
        page.drawText(header, {
          x: keywordCols[i],
          y: currentY,
          size: 10,
          font: headingFont,
          color: headerColor
        });
      } else {
        // Center-align numeric headers
        const headerWidth = headingFont.widthOfTextAtSize(header, 10);
        const columnWidth = Object.values(keywordColumnWidths)[i];
        const centerX = keywordCols[i] + (columnWidth - headerWidth) / 2;
        page.drawText(header, {
          x: centerX,
          y: currentY,
          size: 10,
          font: headingFont,
          color: headerColor
        });
      }
    });

    // Header underline
    currentY -= 10;
    page.drawLine({
      start: { x: leftMargin, y: currentY },
      end: { x: leftMargin + tableWidth, y: currentY },
      thickness: 1,
      color: rgb(0.9, 0.9, 0.9)
    });

    currentY -= 15;

    // Draw keyword rows
    topKeywords.forEach(keyword => {
      // Keyword name
      const keywordLines = wrapText(keyword.keyword, bodyFont, 9, keywordColumnWidths.keyword - 5);
      let keywordY = currentY;
      keywordLines.forEach((line: string) => {
        page.drawText(line, {
          x: keywordCols[0],
          y: keywordY,
          size: 9,
          font: bodyFont,
          color: textColor
        });
        keywordY -= 12;
      });

      // Volume (center-aligned)
      const volumeText = keyword.volume.toString();
      const volumeWidth = bodyFont.widthOfTextAtSize(volumeText, 9);
      const volumeCenterX = keywordCols[1] + (keywordColumnWidths.volume - volumeWidth) / 2;
      page.drawText(volumeText, {
        x: volumeCenterX,
        y: currentY,
        size: 9,
        font: bodyFont,
        color: textColor
      });

      // Difficulty (color coded, center-aligned)
      const difficultyColor = keyword.difficulty >= 80 ? poorColor :
                            keyword.difficulty >= 60 ? warningColor :
                            keyword.difficulty >= 40 ? goodColor : excellentColor;
      
      const difficultyText = keyword.difficulty.toString();
      const difficultyWidth = bodyFont.widthOfTextAtSize(difficultyText, 9);
      const difficultyCenterX = keywordCols[2] + (keywordColumnWidths.difficulty - difficultyWidth) / 2;
      page.drawText(difficultyText, {
        x: difficultyCenterX,
        y: currentY,
        size: 9,
        font: bodyFont,
        color: difficultyColor
      });

      // Priority (color coded - higher is better, center-aligned)
      const priorityColor = keyword.priority >= 80 ? excellentColor :
                           keyword.priority >= 60 ? goodColor :
                           keyword.priority >= 40 ? warningColor : poorColor;
      
      const priorityText = keyword.priority.toString();
      const priorityWidth = bodyFont.widthOfTextAtSize(priorityText, 9);
      const priorityCenterX = keywordCols[3] + (keywordColumnWidths.priority - priorityWidth) / 2;
      page.drawText(priorityText, {
        x: priorityCenterX,
        y: currentY,
        size: 9,
        font: bodyFont,
        color: priorityColor
      });

      // Relevance (color coded, center-aligned)
      const relevanceColor = keyword.relevance >= 80 ? excellentColor :
                           keyword.relevance >= 60 ? goodColor :
                           keyword.relevance >= 40 ? warningColor : poorColor;
      
      const relevanceText = `${keyword.relevance}%`;
      const relevanceWidth = bodyFont.widthOfTextAtSize(relevanceText, 9);
      const relevanceCenterX = keywordCols[4] + (keywordColumnWidths.relevance - relevanceWidth) / 2;
      page.drawText(relevanceText, {
        x: relevanceCenterX,
        y: currentY,
        size: 9,
        font: bodyFont,
        color: relevanceColor
      });

      // Potential (color coded - higher is better, center-aligned)
      const potentialColor = keyword.potential >= 80 ? excellentColor :
                            keyword.potential >= 60 ? goodColor :
                            keyword.potential >= 40 ? warningColor : poorColor;
      
      const potentialText = keyword.potential.toString();
      const potentialWidth = bodyFont.widthOfTextAtSize(potentialText, 9);
      const potentialCenterX = keywordCols[5] + (keywordColumnWidths.potential - potentialWidth) / 2;
      page.drawText(potentialText, {
        x: potentialCenterX,
        y: currentY,
        size: 9,
        font: bodyFont,
        color: potentialColor
      });

      currentY -= Math.max(keywordLines.length * 12, 15);
    });

    if (mozData.keywordCount > 5) {
      currentY -= 5;
      page.drawText(`... and ${mozData.keywordCount - 5} more keywords`, {
        x: leftMargin,
        y: currentY,
        size: 9,
        font: bodyFont,
        color: rgb(0.6, 0.6, 0.6)
      });
      currentY -= 15;
    }
  }

  // Add Competitors section if data exists (optional in new format)
  if (mozData.competitors && mozData.competitors.length > 0) {
    currentY -= 10;
    currentY = addSubHeader(
      page,
      `Top Competitors (${mozData.competitorCount || mozData.competitors.length} total)`,
      leftMargin,
      currentY,
      headingFont,
      14,
      headerColor,
      tableWidth
    );
    currentY -= 15;

    // Show top competitors (limit to first 3) in table format
    const topCompetitors = mozData.competitors.slice(0, 3);

    // Competitors table headers
    page.drawText('Competitor', { x: col1X, y: currentY, size: 10, font: headingFont, color: headerColor });
    
    // Center-align "DA Score" header
    const daHeaderWidth = headingFont.widthOfTextAtSize('DA Score', 10);
    const daHeaderCenterX = col2X + (columnWidths.score - daHeaderWidth) / 2;
    page.drawText('DA Score', { x: daHeaderCenterX, y: currentY, size: 10, font: headingFont, color: headerColor });
    
    page.drawText('Competition Level & Analysis', { x: col3X, y: currentY, size: 10, font: headingFont, color: headerColor });

    // Header underline
    currentY -= 10;
    page.drawLine({
      start: { x: leftMargin, y: currentY },
      end: { x: leftMargin + tableWidth, y: currentY },
      thickness: 1,
      color: rgb(0.9, 0.9, 0.9)
    });

    currentY -= 20;

    topCompetitors.forEach(competitor => {
      // Competitor URL (truncate if too long)
      const urlText = competitor.url.length > 30 ? competitor.url.substring(0, 27) + '...' : competitor.url;
      const urlLines = wrapText(urlText, bodyFont, 10, columnWidths.metric - 5);
      let urlY = currentY;
      urlLines.forEach((line: string) => {
        page.drawText(line, {
          x: col1X,
          y: urlY,
          size: 10,
          font: bodyFont,
          color: headerColor
        });
        urlY -= 12;
      });

      // Domain Authority score with color coding (center-aligned)
      const daColor = getScoreColor('domainAuthority', competitor.domainAuthority);
      const daText = competitor.domainAuthority.toString();
      const daWidth = headingFont.widthOfTextAtSize(daText, 10);
      const daCenterX = col2X + (columnWidths.score - daWidth) / 2;
      page.drawText(daText, {
        x: daCenterX,
        y: currentY,
        size: 10,
        font: headingFont,
        color: daColor
      });

      // Competition level with analysis
      const competitionColor = competitor.competitionLevel === 'high' ? poorColor :
                              competitor.competitionLevel === 'medium' ? warningColor : goodColor;
      
      const analysisText = competitor.competitionLevel === 'high' ? 
        `${competitor.competitionLevel} - Strong competitor, difficult to outrank` :
        competitor.competitionLevel === 'medium' ? 
        `${competitor.competitionLevel} - Moderate competitor, winnable with effort` :
        `${competitor.competitionLevel} - Weak competitor, good opportunity`;

      const analysisLines = wrapText(analysisText, bodyFont, 10, columnWidths.meaning - 5);
      let analysisY = currentY;
      analysisLines.forEach((line: string) => {
        page.drawText(line, {
          x: col3X,
          y: analysisY,
          size: 10,
          font: bodyFont,
          color: competitionColor
        });
        analysisY -= 12;
      });

      // Calculate row height
      const maxLines = Math.max(urlLines.length, 1, analysisLines.length);
      currentY -= (maxLines * 12) + 15;
    });

    const competitorTotal = mozData.competitorCount || mozData.competitors.length;
    if (competitorTotal > 3) {
      page.drawText(`... and ${competitorTotal - 3} more competitors`, {
        x: leftMargin,
        y: currentY,
        size: 9,
        font: bodyFont,
        color: rgb(0.6, 0.6, 0.6)
      });
    }
  }

  // Add analysis summary at the bottom if there's space
  if (currentY > 100) {
    currentY -= 20;
    currentY = addSubHeader(
      page,
      'Key Insights',
      leftMargin,
      currentY,
      headingFont,
      14,
      headerColor,
      tableWidth
    );
    currentY -= 10;

    const insights: string[] = [];

    // Authority insights
    if (mozData.domainAuthority >= 50) {
      insights.push('✓ Strong domain authority provides good SEO foundation');
    } else if (mozData.domainAuthority >= 30) {
      insights.push('• Moderate domain authority - opportunity for improvement');
    } else {
      insights.push('⚠ Low domain authority may limit organic visibility');
    }

    // Spam score insights
    if (mozData.spamScore <= 5) {
      insights.push('✓ Clean spam profile builds search engine trust');
    } else if (mozData.spamScore > 15) {
      insights.push('⚠ Elevated spam score may hurt search rankings');
    }

    // Link profile insights
    if (mozData.linkingDomains >= 100) {
      insights.push('✓ Diverse link profile from multiple domains');
    } else if (mozData.linkingDomains < 10) {
      insights.push('• Limited linking domains - focus on link building');
    }

    // MozTrust insights
    if (mozData.mozTrust >= 4) {
      insights.push('✓ High trust score indicates quality link sources');
    } else if (mozData.mozTrust < 2) {
      insights.push('⚠ Low trust score suggests link quality issues');
    }

    // Keyword insights
    if (mozData.keywords && mozData.keywords.length > 0) {
      const highPriorityKeywords = mozData.keywords.filter(k => k.priority >= 50).length;
      if (highPriorityKeywords > 0) {
        insights.push(`✓ ${highPriorityKeywords} high-priority keyword opportunities identified`);
      }
    }

    insights.forEach(insight => {
      const wrappedText = wrapTextAdvanced(insight, bodyFont, 9, tableWidth);
      wrappedText.forEach(line => {
        const color = insight.startsWith('✓') ? excellentColor :
                     insight.startsWith('⚠') ? warningColor : textColor;
        
        page.drawText(line, {
          x: leftMargin,
          y: currentY,
          size: 9,
          font: bodyFont,
          color: color
        });
        currentY -= 13;
      });
      currentY -= 3;
    });
  }
};
