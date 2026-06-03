import { PDFDocument, PDFFont } from 'pdf-lib';
import { ScrapedContent, QuestionItem } from '@/types/audit';
import { createQuestionBasedPage } from '../utils/addQuestionBasedPage';
import { funnelFlowQuestions } from './data/funnelFlowQuestions';

export const addQuestionFunnelFlow = async (
  pdfDoc: PDFDocument, 
  pageData: ScrapedContent, 
  headingFont: PDFFont, 
  bodyFont: PDFFont,
  pageIndex: number = 0,
  apiData?: QuestionItem[] // Optional API data
) => {
  // Use API data if available, then pageData.conversionOptimization.funnelFlow, otherwise fallback to test data
  const questionsData = apiData || 
    (pageData as any).conversionOptimization?.funnelFlow || 
    funnelFlowQuestions;
  
  // Configuration with hardcoded titles and dynamic questions
  const config = {
    pageTitle: 'Funnel Flow Assessment',
    subtitle: 'Funnel Flow',
    questions: questionsData,
    startingQuestionNumber: 21 // Questions 21-24
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
