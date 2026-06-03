import { QuestionItem } from '@/types/audit';

// Testing & Analytics Questions Test Data
export const testingAnalyticsQuestions: QuestionItem[] = [
  {
    question: "Is Google Analytics and/or Hotjar installed on the site?",
    assessment: "Basic analytics tracking appears to be implemented, but advanced user behavior tracking tools may not be fully configured. Comprehensive data collection is essential for optimization insights.",
    recommendation: "Ensure Google Analytics 4 is properly configured with goal tracking and conversions. Install behavior analytics tools like Hotjar, Microsoft Clarity, or FullStory to understand user interactions and identify optimization opportunities."
  },
  {
    question: "Is A/B testing planned or running (for example, on headlines, CTAs, or form layouts)?",
    assessment: "No evidence of systematic A/B testing strategy or tools in place. Without testing, optimization decisions are based on assumptions rather than data-driven insights about what actually improves conversions.",
    recommendation: "Implement A/B testing tools like Google Optimize, VWO, or Optimizely. Start with high-impact tests on headlines, CTAs, and form layouts. Establish a testing schedule and process for continuous optimization based on statistical significance."
  },
  {
    question: "Are heatmaps or session recordings reviewed regularly?",
    assessment: "User behavior analysis through heatmaps and session recordings doesn't appear to be part of the regular optimization process. This valuable insight into user interactions and pain points is being missed.",
    recommendation: "Set up regular review cycles for heatmap and session recording data. Schedule monthly analysis sessions to identify usability issues, scroll patterns, and interaction problems. Use insights to prioritize optimization efforts."
  },
  {
    question: "Is the conversion rate tracked for key actions (such as sign-ups, sales, or clicks)?",
    assessment: "Conversion tracking may be basic or incomplete. Without comprehensive tracking of key actions throughout the funnel, it's difficult to identify bottlenecks and measure the impact of optimization efforts.",
    recommendation: "Implement detailed conversion tracking for all key actions: form submissions, button clicks, page views, and micro-conversions. Set up goal tracking in Google Analytics and create dashboards for regular monitoring of conversion metrics."
  }
];
