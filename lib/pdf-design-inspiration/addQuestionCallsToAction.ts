import { PDFDocument, PDFFont } from 'pdf-lib';
import { ScrapedContent, QuestionItem } from '@/types/audit';
import { createQuestionBasedPage } from '../utils/addQuestionBasedPage';
import { callsToActionQuestions } from './data/callsToActionQuestions';

export const addQuestionCallsToAction = async (
  pdfDoc: PDFDocument, 
  pageData: ScrapedContent, 
  headingFont: PDFFont, 
  bodyFont: PDFFont,
  pageIndex: number = 0,
  apiData?: QuestionItem[] // Optional API data
) => {
  // Use API data if available, then pageData.conversionOptimization.callsToAction, otherwise fallback to test data
  const questionsData = apiData || 
    (pageData as any).conversionOptimization?.callsToAction || 
    callsToActionQuestions;
  
  // Configuration with hardcoded titles and dynamic questions
  const config = {
    pageTitle: 'CTA Assessment',
    subtitle: 'Calls to Action (CTAs)',
    questions: questionsData,
    startingQuestionNumber: 5 // Questions 5-8
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
