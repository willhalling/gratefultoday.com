# PDF Challenge Generator

A modular, reusable system for generating printable gratitude challenge PDFs in the Grateful Today app.

## Overview

This system allows you to easily create and serve downloadable PDF workbooks for various gratitude challenges. The architecture is designed to be DRY (Don't Repeat Yourself) and modular, making it simple to add new challenges without duplicating code.

## Architecture

### File Structure

```
apps/gratefultoday/
├── types/
│   └── pdf-challenge.ts              # TypeScript type definitions
├── lib/
│   ├── pdf-utils.ts                  # Reusable PDF utility functions
│   ├── pdf-generator.ts              # Core PDF generation logic
│   └── pdf-client.ts                 # Client-side download utilities
├── content/
│   └── challenges/
│       ├── index.ts                  # Challenge registry
│       └── 7-day-recovery.ts         # Challenge content definition
├── components/
│   └── PDFChallengeButton.tsx        # React components for UI
└── app/
    ├── api/
    │   └── pdf/
    │       └── [slug]/
    │           └── route.ts          # API route handler
    └── (with-nav)/
        └── challenges/
            └── page.tsx              # Example usage page
```

## How to Create a New Challenge

### Step 1: Define Your Challenge Content

Create a new file in `content/challenges/` (e.g., `30-day-challenge.ts`):

```typescript
import type { ChallengeDefinition } from '@/types/pdf-challenge';

export const thirtyDayChallenge: ChallengeDefinition = {
  slug: '30-day-gratitude-challenge',

  cover: {
    title: '30-Day Gratitude Challenge',
    subtitle: 'Transform Your Perspective in One Month',
    tagline: 'One day at a time',
  },

  welcome: {
    heading: 'Welcome to Your 30-Day Journey',
    body: ['First paragraph...', 'Second paragraph...'],
    instructions: ['Instruction 1', 'Instruction 2'],
  },

  dailyChallenges: [
    {
      day: 1,
      title: 'Starting Strong',
      prompt: 'What are you grateful for today?',
      linesNeeded: 5,
      whyText: 'Why this matters...',
      tip: 'Optional tip text',
    },
    // ... add all 30 days
  ],

  closing: {
    heading: 'Congratulations!',
    sections: [
      {
        heading: 'What You Accomplished',
        body: ['Paragraph 1', 'Paragraph 2'],
      },
    ],
    callToActions: ['Visit GratefulToday.com', 'Share your story'],
  },
};
```

### Step 2: Register Your Challenge

Add it to `content/challenges/index.ts`:

```typescript
import { thirtyDayChallenge } from './30-day-challenge';

export const challengeRegistry: Record<string, ChallengeDefinition> = {
  '7-day-gratitude-challenge-for-recovery': recoveryChallenge,
  '30-day-gratitude-challenge': thirtyDayChallenge, // Add this line
};
```

### Step 3: That's It!

Your challenge is now available at:

- URL: `/api/pdf/30-day-gratitude-challenge`
- Component: `<PDFChallengeButton slug="30-day-gratitude-challenge" />`

## Usage Examples

### Direct PDF URL

```
https://gratefultoday.com/api/pdf/7-day-gratitude-challenge-for-recovery
```

### React Component (Download)

```tsx
import { PDFChallengeButton } from '@/components/PDFChallengeButton';

<PDFChallengeButton
  slug="7-day-gratitude-challenge-for-recovery"
  challengeName="7-Day Recovery Challenge"
  variant="download"
/>;
```

### React Component (View in Browser)

```tsx
<PDFChallengeButton
  slug="7-day-gratitude-challenge-for-recovery"
  challengeName="7-Day Recovery Challenge"
  variant="view"
/>
```

### Full Card Component

```tsx
import { PDFChallengeCard } from '@/components/PDFChallengeButton';

<PDFChallengeCard
  slug="7-day-gratitude-challenge-for-recovery"
  title="7-Day Gratitude Challenge for Recovery"
  description="A week-long guided journey..."
  features={['7 daily prompts', 'Writing space', 'Educational content']}
/>;
```

### Programmatic Download

```typescript
import { downloadChallengePDF } from '@/lib/pdf-client';

async function handleDownload() {
  await downloadChallengePDF('7-day-gratitude-challenge-for-recovery');
}
```

### Open in New Tab

```typescript
import { viewChallengePDF } from '@/lib/pdf-client';

async function handleView() {
  await viewChallengePDF('7-day-gratitude-challenge-for-recovery');
}
```

## Customization

### Modify Brand Colors

Edit colors in `lib/pdf-utils.ts`:

```typescript
export const defaultPDFStyle: PDFStyleConfig = {
  colors: {
    primary: [0.133, 0.643, 0.243], // RGB values 0-1
    secondary: [0.851, 0.592, 0.035],
    text: [0.082, 0.325, 0.176],
    lightText: [0.545, 0.588, 0.561],
    background: [0.941, 0.992, 0.957],
  },
  // ... other settings
};
```

### Modify Font Sizes

```typescript
fontSizes: {
  coverTitle: 32,
  coverSubtitle: 18,
  pageHeading: 20,
  sectionHeading: 14,
  body: 11,
  footer: 8,
},
```

### Modify Page Margins

```typescript
margins: {
  top: 72,     // 1 inch = 72 points
  bottom: 72,
  left: 72,
  right: 72,
},
```

### Custom Styling Per Challenge

You can create custom style configs and pass them to the generator:

```typescript
const customStyle: PDFStyleConfig = {
  ...defaultPDFStyle,
  colors: {
    ...defaultPDFStyle.colors,
    primary: [1, 0, 0], // Red instead of green
  },
};

const pdfBlob = await generateChallengePDF(challenge, customStyle);
```

## Technical Details

### PDF Library

- Uses `pdf-lib` for PDF generation
- Standard fonts: Helvetica, Helvetica-Bold, Helvetica-Oblique
- Custom fonts can be embedded (requires font file)

### Page Layout

- Letter size: 8.5" × 11" (612 × 792 points)
- 1-inch margins on all sides
- Automatic text wrapping
- Page numbering (starts page 2)
- Footer watermark: "GratefulToday.com"

### Features

- ✅ Automatic word wrapping
- ✅ Multiple page support
- ✅ Blank writing lines (solid/dotted)
- ✅ Page numbering
- ✅ Brand watermark
- ✅ TypeScript types
- ✅ Error handling
- ✅ Client & server components
- ✅ SEO-friendly URLs

### Performance

- PDFs are generated on-demand (no storage required)
- Caching headers: 1 hour browser cache
- Typical generation time: < 500ms
- File size: ~50-100KB per challenge

## API Reference

### Types

```typescript
interface ChallengeDefinition {
  slug: string;
  cover: CoverContent;
  welcome: WelcomeContent;
  dailyChallenges: DailyChallenge[];
  closing: ClosingContent;
}

interface DailyChallenge {
  day: number;
  title: string;
  prompt: string;
  linesNeeded: number;
  whyText: string;
  tip?: string;
}
```

See [types/pdf-challenge.ts](types/pdf-challenge.ts) for complete definitions.

### Functions

#### PDF Generation

```typescript
generateChallengePDF(
  challenge: ChallengeDefinition,
  style?: PDFStyleConfig
): Promise<Blob>
```

#### Client Utilities

```typescript
downloadChallengePDF(slug: string, filename?: string): Promise<void>
viewChallengePDF(slug: string): Promise<void>
getChallengePDFUrl(slug: string): string
```

#### Registry

```typescript
getChallengeBySlug(slug: string): ChallengeDefinition | undefined
getAllChallengeSlugs(): string[]
challengeExists(slug: string): boolean
```

## Troubleshooting

### PDF Won't Download

- Check browser console for errors
- Verify challenge slug is registered in `content/challenges/index.ts`
- Ensure API route is accessible: `/api/pdf/[slug]`

### Styling Issues

- Check RGB values are between 0 and 1
- Verify font sizes are in points (not pixels)
- Ensure margins don't overlap content

### Content Overflow

- Reduce text length or font size
- Increase `linesNeeded` value
- The system will create additional pages if needed

## Future Enhancements

- [ ] Custom font embedding (Playfair Display)
- [ ] Image/logo support
- [ ] Multiple color themes
- [ ] Localization/i18n
- [ ] Custom page templates
- [ ] PDF preview before download
- [ ] Analytics tracking

## Support

For issues or questions:

1. Check this README
2. Review example challenge: `content/challenges/7-day-recovery.ts`
3. Test with example page: `/challenges`

---

Built with ❤️ for Grateful Today
