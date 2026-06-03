import { PDFDocument, PDFFont } from 'pdf-lib';
import { ScrapedContent, QuestionItem } from '@/types/audit';
import { createQuestionBasedPage } from '../utils/addQuestionBasedPage';
import { trustCredibilityQuestions } from './data/trustCredibilityQuestions';

export const addQuestionTrustCredibility = async (
  pdfDoc: PDFDocument, 
  pageData: ScrapedContent, 
  headingFont: PDFFont, 
  bodyFont: PDFFont,
  pageIndex: number = 0,
  apiData?: QuestionItem[] // Optional API data
) => {
  // Use API data if available, then pageData.conversionOptimization.trustCredibility, otherwise fallback to test data
  const questionsData = apiData || 
    (pageData as any).conversionOptimization?.trustCredibility || 
    trustCredibilityQuestions;
  
  // Configuration with hardcoded titles and dynamic questions
  const config = {
    pageTitle: 'Trust & Credibility Assessment',
    subtitle: 'Trust & Credibility',
    questions: questionsData,
    startingQuestionNumber: 13 // Questions 13-16
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
