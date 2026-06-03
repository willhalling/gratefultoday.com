import { PDFDocument, rgb } from 'pdf-lib';
import { addSectionPageHeading } from '../utils/addSectionPageHeading';
import { addSubHeader } from '../utils/addSubHeader';
import { fetchBrandingData } from '../utils/addBrandingBox';
import fetch from 'node-fetch';

// Function to add a standard contact form layout using consistent PDF margins
const addContactForm = async (page: any, brandingData: any, pageWidth: number, bodyFont: any, headingFont: any, contentStartY: number, contentStartX: number) => {
  const leftMargin = contentStartX;
  const rightMargin = pageWidth - 20;
  const contentWidth = rightMargin - leftMargin;
  
  let currentY = contentStartY;
  
  // Add subheading using company name or fallback
  const headerText = brandingData.companyName || 'Contact Information';
  currentY = addSubHeader(
    page,
    headerText,
    leftMargin,
    currentY - 20,
    headingFont,
    14,
    rgb(0.2, 0.2, 0.2),
    contentWidth
  );
  
  currentY -= 10; // Extra spacing after subheader
  
  // Add company logo if available (standard left alignment)
  if (brandingData.logoUrl) {
    try {
      const logoResponse = await fetch(brandingData.logoUrl);
      if (logoResponse.ok) {
        const logoBytes = await logoResponse.arrayBuffer();
        
        let logoImage;
        const contentType = logoResponse.headers.get('content-type');
        const isPNG = brandingData.logoUrl.toLowerCase().includes('.png') || 
                     brandingData.logoUrl.toLowerCase().includes('png') ||
                     contentType?.includes('png');
        
        if (isPNG) {
          logoImage = await page.doc.embedPng(logoBytes);
        } else {
          logoImage = await page.doc.embedJpg(logoBytes);
        }
        
        const logoHeight = 40; // Reduced from 60
        const logoWidth = Math.min((logoImage.width / logoImage.height) * logoHeight, 120); // Max width of 120px
        
        page.drawImage(logoImage, {
          x: leftMargin,
          y: currentY - logoHeight,
          width: logoWidth,
          height: logoHeight,
        });
        
        currentY -= logoHeight + 25;
      }
    } catch (error) {
      console.error('Error embedding logo in contact form:', error);
    }
  }
  
  // Contact details in a structured format using standard layout
  const contactDetails = [];
  if (brandingData.email) contactDetails.push({ label: 'Email', value: brandingData.email });
  if (brandingData.telephone) contactDetails.push({ label: 'Phone', value: brandingData.telephone });
  if (brandingData.websiteUrl) contactDetails.push({ label: 'Website', value: brandingData.websiteUrl });
  
  contactDetails.forEach((detail, index) => {
    // Label
    const labelText = `${detail.label}:`;
    page.drawText(labelText, {
      x: leftMargin,
      y: currentY,
      size: 12,
      font: bodyFont,
      color: rgb(0.4, 0.4, 0.4),
    });
    
    // Value
    page.drawText(detail.value, {
      x: leftMargin + 80,
      y: currentY,
      size: 12,
      font: bodyFont,
      color: rgb(0, 0, 0),
    });
    
    currentY -= 20;
  });
  
  // Team photo (portrait) if available
  if (brandingData.portraitUrl) {
    try {
      currentY -= 15; // Extra spacing before team photo
      
      console.log('Fetching team photo from:', brandingData.portraitUrl);
      const portraitResponse = await fetch(brandingData.portraitUrl);
      
      if (portraitResponse.ok) {
        const portraitBytes = await portraitResponse.arrayBuffer();
        console.log('Team photo fetched, size:', portraitBytes.byteLength, 'bytes');
        
        let portraitImage;
        const contentType = portraitResponse.headers.get('content-type');
        const isPNG = brandingData.portraitUrl.toLowerCase().includes('.png') || 
                     brandingData.portraitUrl.toLowerCase().includes('png') ||
                     contentType?.includes('png');
        
        if (isPNG) {
          portraitImage = await page.doc.embedPng(portraitBytes);
        } else {
          portraitImage = await page.doc.embedJpg(portraitBytes);
        }
        
        console.log('Team photo embedded successfully');
        
        // Size the team photo appropriately (120px height - larger than logo)
        const portraitHeight = 120;
        const portraitWidth = Math.min((portraitImage.width / portraitImage.height) * portraitHeight, contentWidth - 40);
        
        console.log('Drawing team photo at position:', leftMargin, currentY - portraitHeight, 'size:', portraitWidth, 'x', portraitHeight);
        
        page.drawImage(portraitImage, {
          x: leftMargin,
          y: currentY - portraitHeight,
          width: portraitWidth,
          height: portraitHeight,
        });
        
        currentY -= portraitHeight + 20;
      } else {
        console.error('Failed to fetch team photo:', portraitResponse.status, portraitResponse.statusText);
      }
    } catch (error) {
      console.error('Error embedding team photo in contact form:', error);
    }
  } else {
    console.log('No team photo URL provided in branding data');
  }

};

export const addContactPage = async (pdfDoc: PDFDocument, auditData: any, host: string, headingFont: any, bodyFont: any, userId?: string, bodyBoldFont?: any) => {
  // Fetch branding data if userId is provided
  const brandingData = userId ? await fetchBrandingData(userId) : {};
  
  const { page: coverPage, width: coverWidth, contentStartY, contentStartX } = addSectionPageHeading(
    pdfDoc,
    `Contact Us`,
    rgb(1, 1, 1), // White text
    headingFont,
    99, // High pageIndex for unique color (different from other pages)
    undefined, // No URL needed
    undefined, // No URL color needed
    'CONTACT' // Custom diagonal text
  );

  // Check if we should use banner image instead of contact form
  const shouldUseBanner = brandingData.useContactBanner !== false;
  
  if (shouldUseBanner) {
    // Determine which banner to use - custom or default
    let bannerUrl = brandingData.bannerImageUrl;
    let bannerType = 'custom';
    
    // If no custom banner but useContactBanner is true, use default banner
    if (!bannerUrl) {
      bannerType = 'default';
      // Construct URL for default banner with environment-aware host
      const baseUrl = 'https://auditwidget.com';
      bannerUrl = `${baseUrl}/images/default-banner.png`;
    }
    
    try {
      console.log(`📄 PDF: Using ${bannerType} banner image for contact page`);
      // Add full-bleed banner image (595 × 842 px - A4 at 72dpi)
      const bannerResponse = await fetch(bannerUrl);
      if (bannerResponse.ok) {
        const bannerBytes = await bannerResponse.arrayBuffer();
        
        // Determine image type and embed accordingly
        let bannerImage;
        const contentType = bannerResponse.headers.get('content-type');
        const isPNG = bannerUrl.toLowerCase().includes('.png') || 
                     bannerUrl.toLowerCase().includes('png') ||
                     contentType?.includes('png');
        
        if (isPNG) {
          bannerImage = await pdfDoc.embedPng(bannerBytes);
        } else {
          bannerImage = await pdfDoc.embedJpg(bannerBytes);
        }
        
        // Draw the banner image to fill the entire page (full-bleed)
        // PDF coordinates start at bottom-left, so Y=0 is bottom
        // Add slight margin to ensure complete coverage and avoid edge artifacts
        coverPage.drawImage(bannerImage, {
          x: -1,   // Start 1px before left edge
          y: -1,   // Start 1px before bottom edge
          width: coverWidth + 2,  // Extend 2px beyond right edge
          height: 844, // Extend 2px beyond top edge (842 + 2)
        });
        
        // Add team photo (portrait) overlay on banner if available
        if (brandingData.portraitUrl) {
          try {
            const portraitResponse = await fetch(brandingData.portraitUrl);
            if (portraitResponse.ok) {
              const portraitBytes = await portraitResponse.arrayBuffer();
              
              let portraitImage;
              const portraitContentType = portraitResponse.headers.get('content-type');
              const portraitIsPNG = brandingData.portraitUrl.toLowerCase().includes('.png') || 
                           brandingData.portraitUrl.toLowerCase().includes('png') ||
                           portraitContentType?.includes('png');
              
              if (portraitIsPNG) {
                portraitImage = await pdfDoc.embedPng(portraitBytes);
              } else {
                portraitImage = await pdfDoc.embedJpg(portraitBytes);
              }
              
              // Position team photo in bottom right corner of banner
              const portraitSize = 120; // Increased from 80 to match contact form size
              const margin = 20;
              
              coverPage.drawImage(portraitImage, {
                x: 595 - portraitSize - margin,
                y: margin,
                width: portraitSize,
                height: portraitSize,
              });
            }
          } catch (error) {
            console.error('Error embedding team photo on banner:', error);
          }
        }
        
        // The diagonal header will be drawn on top since addSectionPageHeading is called before this
        console.log(`✅ Contact ${bannerType} banner image successfully embedded`);
        return; // Exit early, no need for contact form
      } else {
        console.error('Failed to fetch banner image:', bannerResponse.status);
      }
    } catch (error) {
      console.error('Error embedding banner image:', error);
      // Fall through to contact form if banner fails
    }
  }
  
  // Fallback: Show improved contact form
  await addContactForm(coverPage, brandingData, coverWidth, bodyFont, headingFont, contentStartY, contentStartX);
};