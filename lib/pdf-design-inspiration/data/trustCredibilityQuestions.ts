import { QuestionItem } from '@/types/audit';

// Trust and Credibility Questions Test Data
export const trustCredibilityQuestions: QuestionItem[] = [
  {
    question: "Are trust symbols (like SSL, payment logos, or security badges) displayed?",
    assessment: "Basic security indicators are present but not prominently displayed. Trust symbols exist but may not be immediately visible to users, potentially missing opportunities to build confidence at crucial decision points.",
    recommendation: "Display security badges, SSL certificates, and payment logos more prominently near CTAs and forms. Add recognizable trust symbols like 'Secured by' badges, industry certifications, or compliance indicators (GDPR, SOC2, etc.)."
  },
  {
    question: "Are customer testimonials or case studies included?",
    assessment: "Customer testimonials are limited and lack specific details that would make them more credible and persuasive. Case studies with concrete results and measurable outcomes would strengthen the value proposition.",
    recommendation: "Include detailed testimonials with customer names, photos, company names, and specific results achieved. Add case studies showing before/after scenarios with measurable improvements in key metrics relevant to your target audience."
  },
  {
    question: "Are the privacy policy and refund guarantee easy to find?",
    assessment: "Privacy policy and guarantee information may be buried in footer links or not prominently featured. Users need easy access to understand their rights and protections before committing to a purchase or signup.",
    recommendation: "Make privacy policy and refund/guarantee information easily accessible. Add prominent links near forms and purchase buttons. Consider a brief guarantee statement directly on the main page with a link to full terms."
  },
  {
    question: "Do forms only ask for essential information, keeping friction low?",
    assessment: "Forms may be requesting more information than necessary for the initial conversion, potentially creating unnecessary friction that discourages completion. Each additional field reduces conversion rates.",
    recommendation: "Minimize form fields to only essential information needed for the immediate next step. Consider progressive profiling - collect basic info first, then gather additional details later in the relationship. Remove optional fields that aren't critical."
  }
];
