import { QuestionItem } from '@/types/audit';

// Calls to Action (CTAs) Questions Test Data
export const callsToActionQuestions: QuestionItem[] = [
  {
    question: "Are the CTA buttons action-focused and specific (for example, \"Get My Free Trial\")?",
    assessment: "The main CTA uses generic text like 'Learn More' and 'Submit' rather than action-oriented language. The primary button could be more compelling and specific about the value proposition.",
    recommendation: "Replace generic CTAs with specific, action-focused text like 'Start Your Free 30-Day Trial', 'Get My Custom Quote', or 'Download the Complete Guide'. This creates urgency and clearly communicates the next step."
  },
  {
    question: "Do the CTA buttons stand out visually in terms of size, color, and contrast?",
    assessment: "CTAs have adequate contrast but could be more prominent. The primary button blends somewhat with the overall design and secondary buttons compete for attention.",
    recommendation: "Increase the size and contrast of primary CTAs. Use a bold, contrasting color that stands out from the page design. Ensure secondary buttons are visually subordinate to avoid competing with the main action."
  },
  {
    question: "Do CTAs appear multiple times on longer pages?",
    assessment: "The page has limited CTA placement with only one primary call-to-action above the fold. For longer content, users may lose momentum without reminder prompts.",
    recommendation: "Add strategic CTA placement throughout longer pages - after key benefit sections, testimonials, and at natural decision points. Include a sticky or floating CTA for continuous visibility on mobile devices."
  },
  {
    question: "Does the CTA language clearly explain what happens after clicking?",
    assessment: "Current CTA text is vague about the next steps. Users may hesitate because they're unsure what to expect after clicking, potentially creating friction in the conversion process.",
    recommendation: "Make CTA language explicit about next steps: 'Start Free Trial - No Credit Card Required', 'Get Instant Access to Download', or 'Book Your 15-Minute Demo Call'. Remove uncertainty to increase click-through rates."
  }
];
