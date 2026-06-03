import { QuestionItem } from '@/types/audit';

// Sales Copy & Messaging Questions Test Data
export const salesCopyMessagingQuestions: QuestionItem[] = [
  {
    question: "Does the copy focus on benefits and outcomes for the user, rather than just features?",
    assessment: "The content leans heavily on feature descriptions without clearly connecting to user benefits. While technical capabilities are mentioned, the emotional and practical outcomes for users could be more prominent.",
    recommendation: "Reframe feature descriptions to highlight user benefits. Instead of 'Advanced Analytics Dashboard', use 'See exactly which marketing campaigns drive the most revenue'. Focus on what users achieve, not what the product has."
  },
  {
    question: "Are common objections (such as pricing, trust, or usability) addressed?",
    assessment: "The page doesn't proactively address typical buyer concerns about implementation complexity, time investment, or ROI uncertainty. Common objections remain unresolved, potentially causing hesitation.",
    recommendation: "Add sections addressing key objections: 'Quick 5-minute setup', 'See results in your first week', 'No long-term contracts', or include an FAQ addressing common concerns about pricing, support, and implementation."
  },
  {
    question: "Is the copy clear and simple, avoiding jargon?",
    assessment: "Some technical terminology and industry jargon may confuse non-expert visitors. The language assumes familiarity with certain concepts that might not be universal among the target audience.",
    recommendation: "Simplify technical language and define necessary jargon. Use conversational tone and explain complex concepts in plain language. Consider adding brief explanations or tooltips for technical terms that can't be avoided."
  },
  {
    question: "Is there social proof present, such as testimonials, reviews, or success stories?",
    assessment: "Limited social proof is present on the page. While there may be some credibility indicators, more prominent testimonials and success stories would strengthen trust and demonstrate real-world value.",
    recommendation: "Add specific customer testimonials with names, photos, and measurable results. Include success metrics, case studies, or customer logos. Consider video testimonials or detailed before/after stories to build stronger credibility."
  }
];
