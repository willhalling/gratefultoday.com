import { QuestionItem } from '@/types/audit';

// Funnel Flow Questions Test Data
export const funnelFlowQuestions: QuestionItem[] = [
  {
    question: "Do product pages answer key questions and clearly show benefits?",
    assessment: "Product pages provide basic information but may not comprehensively address buyer questions about implementation, results timeline, or specific use cases. Key decision-making information could be more prominent and accessible.",
    recommendation: "Enhance product pages with detailed benefit explanations, implementation timelines, and specific use cases. Add FAQ sections addressing common buyer questions. Include comparison charts and feature explanations that help users understand value."
  },
  {
    question: "Is the checkout process smooth, fast, and functional on all devices?",
    assessment: "The checkout process has some friction points that could cause abandonment. Mobile optimization and loading speed may need improvement to ensure seamless transactions across all devices and connection speeds.",
    recommendation: "Streamline checkout to minimize steps and reduce form fields. Optimize for mobile with large buttons and easy input methods. Ensure fast loading times and implement progress indicators. Consider guest checkout options to reduce friction."
  },
  {
    question: "Is the \"Thank You\" page optimized with next steps, upsells, or referral requests?",
    assessment: "The confirmation page is underutilized as a conversion opportunity. After completing the primary action, users are most engaged and receptive to additional offers or next steps that could increase lifetime value.",
    recommendation: "Optimize thank you pages with clear next steps, relevant upsells, or referral opportunities. Include onboarding instructions, additional resources, or complementary offers. Add social sharing buttons to encourage organic promotion."
  },
  {
    question: "Is there an email follow-up series to help move users closer to a purchase?",
    assessment: "Email nurturing appears limited or may not be strategically designed to guide prospects through the decision-making process. Automated sequences could better educate and build trust with potential customers over time.",
    recommendation: "Develop a comprehensive email nurturing sequence with educational content, case studies, and gentle promotional messages. Include welcome series, abandoned cart recovery, and re-engagement campaigns. Personalize content based on user behavior and interests."
  }
];
