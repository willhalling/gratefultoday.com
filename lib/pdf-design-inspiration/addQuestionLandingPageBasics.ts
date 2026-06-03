import { PDFDocument, PDFFont } from 'pdf-lib';
import { ScrapedContent, QuestionItem } from '@/types/audit';
import { createQuestionBasedPage } from '../utils/addQuestionBasedPage';
import { landingPageBasicsQuestions } from './data/landingPageBasicsQuestions';

export const addQuestionLandingPageBasics = async (
  pdfDoc: PDFDocument, 
  pageData: ScrapedContent, 
  headingFont: PDFFont, 
  bodyFont: PDFFont,
  pageIndex: number = 0,
  apiData?: QuestionItem[] // Optional API data
) => {
  // Use API data if available, then pageData.conversionOptimization.landingPageBasics, otherwise fallback to test data
  const questionsData = apiData || 
    (pageData as any).conversionOptimization?.landingPageBasics || 
    landingPageBasicsQuestions;
  
  // Configuration with hardcoded titles and dynamic questions
  const config = {
    pageTitle: 'Landing Page Assessment',
    subtitle: 'Landing Page Basics',
    questions: questionsData,
    startingQuestionNumber: 1 // Questions 1-4
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
