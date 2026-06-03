import { PDFDocument, PDFFont } from 'pdf-lib';
import { ScrapedContent, QuestionItem } from '@/types/audit';
import { createQuestionBasedPage } from '../utils/addQuestionBasedPage';
import { testingAnalyticsQuestions } from './data/testingAnalyticsQuestions';

export const addQuestionTestingAnalytics = async (
  pdfDoc: PDFDocument, 
  pageData: ScrapedContent, 
  headingFont: PDFFont, 
  bodyFont: PDFFont,
  pageIndex: number = 0,
  apiData?: QuestionItem[] // Optional API data
) => {
  // Use API data if available, then pageData.conversionOptimization.testingAnalytics, otherwise fallback to test data
  const questionsData = apiData || 
    (pageData as any).conversionOptimization?.testingAnalytics || 
    testingAnalyticsQuestions;
  
  // Configuration with hardcoded titles and dynamic questions
  const config = {
    pageTitle: 'Testing & Analytics Assessment',
    subtitle: 'Testing & Analytics',
    questions: questionsData,
    startingQuestionNumber: 17 // Questions 17-20
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
