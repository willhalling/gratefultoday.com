import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import fontkit from '@pdf-lib/fontkit';
import { addCoverPage } from './addCoverPage';
import { addContactPage } from './addContactPage';
import { addPageDesktopIssues } from './addPageDesktopIssues';
import { addContentAnalysisPage } from './addContentAnalysisPage';
import { addMozAnalysisPage } from './addMozAnalysisPage';
import { addPageMobileIssues } from './addPageMobileIssues';
import { addQuestionLandingPageBasics } from './addQuestionLandingPageBasics';
import { addQuestionCallsToAction } from './addQuestionCallsToAction';
import { addQuestionSalesCopyMessaging } from './addQuestionSalesCopyMessaging';
import { addQuestionTrustCredibility } from './addQuestionTrustCredibility';
import { addQuestionTestingAnalytics } from './addQuestionTestingAnalytics';
import { addQuestionFunnelFlow } from './addQuestionFunnelFlow';
import { addFooter } from '../utils/addFooter'; // Import the new utility function
// import { addGeneralIssuesPage } from './addGeneralIssuesPage'; // Import the general issues page
import { addPageLighthouseOverview } from './addPageLighthouseOverview';
import { addPageLighthouseTables } from './addPageLighthouseTables';
import { Audit, PdfSettings } from '@/types/audit';

export const generateCroPdf = async (auditData: Audit, host: string, id: string, userId?: string, pdfSettings?: PdfSettings) => {
  // Debug: Log auditData structure
  console.log('🔍 DEBUG: PDF Generation - auditData keys:', Object.keys(auditData));
  console.log('🔍 DEBUG: PDF Generation - auditData.pages:', auditData.pages);
  console.log('🔍 DEBUG: PDF Generation - pdfSettings received:', pdfSettings);
  console.log('🔍 DEBUG: PDF Generation - auditData.pdfSettings:', auditData.pdfSettings);
  
  // Validate required data before proceeding
  if (!auditData) {
    throw new Error('auditData is required for PDF generation');
  }
  
  // Map the correct field name from your audit data structure
  const auditPages = auditData.pages || [];
  
  if (!auditPages || !Array.isArray(auditPages)) {
    console.warn('⚠️  auditData.pages is not an array, initializing as empty array');
  }
  
  console.log('🔍 DEBUG: PDF Generation - pages length:', auditPages.length);
  
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  // Load Inter fonts (regular and bold for consistent spacing)
  const interBoldFontBytes = fs.readFileSync(path.resolve('./fonts/Inter_24pt-Bold.ttf'));
  const interRegularFontBytes = fs.readFileSync(path.resolve('./fonts/Inter-Regular.ttf'));

  const headingFont = await pdfDoc.embedFont(new Uint8Array(interBoldFontBytes));
  const bodyFont = await pdfDoc.embedFont(new Uint8Array(interRegularFontBytes));
  
  // Create a proper bold version of the body font for inline formatting
  const bodyBoldFont = await pdfDoc.embedFont(new Uint8Array(interBoldFontBytes));

  // Cover Page
  await addCoverPage(pdfDoc, auditData, host, headingFont, bodyFont, userId, pdfSettings);  

  // Numbers Overview Page (includes word cloud)
  // await addNumbersPage(pdfDoc, auditData, host, headingFont, bodyFont);  

  // Table of Contents Page
  // await addTableOfContentsPage(pdfDoc, auditData, headingFont, bodyFont);

  // Loop through pages and add pages (create 4 pages for each: analysis + issues/suggestions + general issues + accessibility)
  if (auditPages && auditPages.length > 0) {
    console.log(`📄 Processing ${auditPages.length} pages for PDF`);
    
    for (let i = 0; i < auditPages.length; i++) {
      const pageData = auditPages[i];
      
      if (!pageData) {
        console.warn(`⚠️  Skipping undefined page data at index ${i}`);
        continue;
      }
      
      console.log(`📄 Processing page ${i + 1}/${auditPages.length}: ${pageData.url || 'Unknown URL'}`);
      
      try {
        // Page 1: Original analysis page with new heading
        // await addContentPage(pdfDoc, pageData, headingFont, bodyFont, i);
        
        // Page 2: Issues and suggestions page with word cloud
        console.log('📄 Starting Content Analysis Page...');
        await addContentAnalysisPage(pdfDoc, pageData as any, headingFont, bodyFont, i);
        console.log('✅ Content Analysis Page completed');
        
        // Page 3: MOZ SEO Analysis (only if MOZ data exists)
        if ((pageData as any).mozAnalysis) {
          console.log('📄 Starting MOZ Analysis Page...');
          await addMozAnalysisPage(pdfDoc, pageData as any, headingFont, bodyFont, i);
          console.log('✅ MOZ Analysis Page completed');
        } else {
          console.log('⚠️  Skipping MOZ Analysis Page - no mozAnalysis data available');
        }
        
        // Page 4: Landing Page Basics Questions
        console.log('📄 Starting Landing Page Basics Questions...');
        await addQuestionLandingPageBasics(
          pdfDoc, 
          pageData as any, 
          headingFont, 
          bodyFont, 
          i,
          (pageData as any).landingPageBasics // Pass API data if available from page
        );
        console.log('✅ Landing Page Basics Questions completed');
        
        // Page 5: Calls to Action Questions
        console.log('📄 Starting Calls to Action Questions...');
        await addQuestionCallsToAction(
          pdfDoc, 
          pageData as any, 
          headingFont, 
          bodyFont, 
          i,
          (pageData as any).callsToAction // Pass API data if available from page
        );
        console.log('✅ Calls to Action Questions completed');
        
        // Page 6: Sales Copy & Messaging Questions
        console.log('📄 Starting Sales Copy & Messaging Questions...');
        await addQuestionSalesCopyMessaging(
          pdfDoc, 
          pageData as any, 
          headingFont, 
          bodyFont, 
          i,
          (pageData as any).salesCopyMessaging // Pass API data if available from page
        );
        console.log('✅ Sales Copy & Messaging Questions completed');
        
        // Page 7: Trust & Credibility Questions
        console.log('📄 Starting Trust & Credibility Questions...');
        await addQuestionTrustCredibility(
          pdfDoc, 
          pageData as any, 
          headingFont, 
          bodyFont, 
          i,
          (pageData as any).trustCredibility // Pass API data if available from page
        );
        console.log('✅ Trust & Credibility Questions completed');
        
        // Page 8: Testing & Analytics Questions
        console.log('📄 Starting Testing & Analytics Questions...');
        await addQuestionTestingAnalytics(
          pdfDoc, 
          pageData as any, 
          headingFont, 
          bodyFont, 
          i,
          (pageData as any).testingAnalytics // Pass API data if available from page
        );
        console.log('✅ Testing & Analytics Questions completed');
        
        // Page 9: Funnel Flow Questions
        console.log('📄 Starting Funnel Flow Questions...');
        await addQuestionFunnelFlow(
          pdfDoc, 
          pageData as any, 
          headingFont, 
          bodyFont, 
          i,
          (pageData as any).funnelFlow // Pass API data if available from page
        );
        console.log('✅ Funnel Flow Questions completed');
        
        // Page 10: General issues page (currently disabled)
        // console.log('📄 Starting addGeneralIssuesPage...');
        // await addGeneralIssuesPage(pdfDoc, pageData as any, headingFont, bodyFont, i);
        // console.log('✅ addGeneralIssuesPage completed');
        
        // Desktop and Mobile accessibility pages for this specific page
        console.log('📄 Starting addPageDesktopIssues...');
        await addPageDesktopIssues(pdfDoc, pageData as any, headingFont, bodyFont, i, auditData); // Desktop
        console.log('✅ addPageAccessibilityOverview completed');
        
        console.log('📄 Starting addPageMobileIssues...');
        await addPageMobileIssues(pdfDoc, pageData as any, headingFont, bodyFont, i, auditData); // Mobile
        console.log('✅ addPageAccessibilityOverviewMobile completed');
        
        console.log('📄 Starting addPageLighthouseOverview...');
        await addPageLighthouseOverview(pdfDoc, pageData as any, headingFont, bodyFont, i, auditData);
        console.log('✅ addPageLighthouseOverview completed');
        
        console.log('📄 Starting addPageLighthouseTables...');
        await addPageLighthouseTables(pdfDoc, pageData as any, headingFont, bodyFont, i);
        console.log('✅ addPageLighthouseTables completed');
        
        console.log(`✅ Successfully processed page ${i + 1}`);
      } catch (pageError) {
        console.error(`❌ Error processing page ${i + 1}:`, pageError);
        // Continue with other pages even if one fails
      }
    }
  } else {
    console.warn('⚠️  No pages to process - pages array is empty or undefined');
    // Still create a PDF with just the cover page
  }

  // Add contact page before adding footers (only if branding is enabled)
  const shouldShowBranding = pdfSettings?.showBranding !== false; // Default to true if not specified
  if (shouldShowBranding) {
    await addContactPage(pdfDoc, auditData, host, headingFont, bodyFont, userId, bodyBoldFont);
  }

  // Add footers to all pages
  const pages = pdfDoc.getPages();
  pages.forEach((page, index) => {
    if (index !== 0 && index !== pages.length - 1) { // Skip the first page (cover page) and last page
      // All pages now have colored strips (including contact page)
      const hasColoredStrip = true; // All pages except cover have diagonal headers with colored strips
      
      addFooter(page, index + 1, auditData, host, bodyFont, hasColoredStrip);
    }
  });

  // Save and return the PDF
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
};