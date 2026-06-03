/**
 * Type definitions for PDF Challenge generation system
 * Used across all gratitude challenges and PDF templates
 */

export interface CoverContent {
  title: string;
  subtitle: string;
  tagline?: string;
  // Cover design options
  coverImagePath?: string; // Path to cover image (e.g., 'pdf/cover.png')
  coverImageHeightPercent?: number; // 0-1, how much of page height for image (default: 0.6)
  logoPath?: string; // Path to logo (e.g., 'logo-white-50.png')
  logoSize?: number; // Logo height in pixels (default: 50)
  logoPosition?: { x: number; y: number }; // Logo position from top-left (default: { x: 30, y: 30 })
  bottomSectionBgColor?: [number, number, number]; // RGB color for bottom section (default: white)
  textAlignment?: 'left' | 'center' | 'right'; // Text alignment (default: 'left')
}

export interface WelcomeContent {
  heading: string;
  body: string[];
  instructions?: string[];
}

export interface DailyChallenge {
  day: number;
  title: string;
  prompt: string;
  linesNeeded: number;
  whyText: string;
  tip?: string;
  additionalPrompt?: string; // Optional second prompt
  additionalLines?: number; // Lines for additional prompt
}

export interface ClosingSection {
  heading: string;
  body: string[];
}

export interface ClosingContent {
  heading: string;
  sections: ClosingSection[];
  callToActions?: string[];
}

export interface ChallengeDefinition {
  slug: string; // URL slug: "7-day-gratitude-challenge-for-recovery"
  cover: CoverContent;
  welcome: WelcomeContent;
  dailyChallenges: DailyChallenge[];
  closing: ClosingContent;
}

export interface PDFStyleConfig {
  // Cover page defaults (can be overridden in CoverContent)
  coverDefaults?: {
    coverImagePath?: string;
    coverImageHeightPercent?: number;
    logoPath?: string;
    logoSize?: number;
    logoPosition?: { x: number; y: number };
    bottomSectionBgColor?: [number, number, number];
    textAlignment?: 'left' | 'center' | 'right';
  };
  // Colors (RGB format)
  colors: {
    primary: [number, number, number];
    secondary: [number, number, number];
    text: [number, number, number];
    lightText: [number, number, number];
    background: [number, number, number];
  };
  // Font sizes (in points)
  fontSizes: {
    coverTitle: number;
    coverSubtitle: number;
    pageHeading: number;
    sectionHeading: number;
    body: number;
    footer: number;
  };
  // Spacing
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  lineHeight: number; // Multiplier for line spacing
  // Page dimensions (in points, 72 points = 1 inch)
  pageSize: {
    width: number;
    height: number;
  };
}

export interface TextDrawOptions {
  x: number;
  y: number;
  maxWidth: number;
  fontSize: number;
  lineHeight: number;
  color?: [number, number, number];
  align?: 'left' | 'center' | 'right';
}

export interface BlankLinesOptions {
  startY: number;
  numberOfLines: number;
  lineHeight: number;
  style: 'solid' | 'dotted';
}
