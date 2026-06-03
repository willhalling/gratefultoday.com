import { PDFDocument, PDFFont } from 'pdf-lib';
import { ScrapedContent, QuestionItem } from '@/types/audit';
import { createQuestionBasedPage } from '../utils/addQuestionBasedPage';
import { salesCopyMessagingQuestions } from './data/salesCopyMessagingQuestions';

export const addQuestionSalesCopyMessaging = async (
  pdfDoc: PDFDocument, 
  pageData: ScrapedContent, 
  headingFont: PDFFont, 
  bodyFont: PDFFont,
  pageIndex: number = 0,
  apiData?: QuestionItem[] // Optional API data
) => {
  // Use API data if available, then pageData.conversionOptimization.salesCopyMessaging, otherwise fallback to test data
  const questionsData = apiData || 
    (pageData as any).conversionOptimization?.salesCopyMessaging || 
    salesCopyMessagingQuestions;
  
    // Configuration with hardcoded titles and dynamic questions
  const config = {
    pageTitle: 'Copy & Messaging Assessment',
    subtitle: 'Sales Copy & Messaging',
    questions: questionsData,
    startingQuestionNumber: 9 // Questions 9-12
  };

  // Use the reusable utility function with data configuration
  await createQuestionBasedPage(
    pdfDoc,
    pageData,
    headingFont,
    bodyFont,
    pageIndex,
    config
  );
};
