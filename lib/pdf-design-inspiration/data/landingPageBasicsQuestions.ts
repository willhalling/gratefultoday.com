import { QuestionItem } from '@/types/audit';

// Test data that matches the API structure (questions only)
export const landingPageBasicsQuestions: QuestionItem[] = [
  {
    question: "Does the page have one clear, primary goal (such as purchase, sign-up, or booking)?",
    assessment: "The page demonstrates strong focus with a prominent 'Get Started' button above the fold. However, secondary navigation links in the header may create minor distractions from the primary conversion goal.",
    recommendation: "Consider reducing navigation options or making the primary CTA more visually dominant through increased size, contrasting colors, or strategic white space."
  },
  {
    question: "Does the headline directly address a pain point or desire of the visitor?",
    assessment: "The current headline 'Transform Your Business Today' is somewhat generic. While it implies positive change, it doesn't address specific pain points or clearly articulate what transformation means for the visitor.",
    recommendation: "Strengthen the headline by addressing specific pain points like 'Struggling with Low Conversion Rates?' or highlighting concrete benefits like 'Increase Sales by 40% in 30 Days'."
  },
  {
    question: "Is the page structure logical and easy to scan?",
    assessment: "The page follows a generally logical structure with clear sections and adequate white space. However, some content blocks could benefit from better visual hierarchy and more scannable formatting.",
    recommendation: "Implement more bullet points for key benefits, add more descriptive subheadings, and ensure consistent spacing between sections to improve scannability and information hierarchy."
  },
  {
    question: "Is the mobile version fast, clean, and fully functional?",
    assessment: "Mobile version loads reasonably well with core functionality intact. Navigation menu collapses appropriately, and forms are touch-friendly. Loading speed is acceptable at 2.8 seconds but could be improved.",
    recommendation: "Optimize images for mobile, implement lazy loading for below-fold content, and consider reducing form fields on mobile to minimize typing requirements and improve conversion rates."
  }
];
