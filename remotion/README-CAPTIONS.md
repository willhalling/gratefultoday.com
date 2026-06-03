# Remotion Caption System

A modular, reusable caption/subtitle system for Remotion videos in Grateful Today.

## Features

- ✅ **Reusable Components**: Caption system works across milestone videos, video editor, and future compositions
- ✅ **Type-Safe**: Full TypeScript support with shared types
- ✅ **Flexible Styling**: Customizable fonts, colors, positioning, and animations
- ✅ **Easy Integration**: Drop-in component with simple props
- ✅ **TTS Ready**: Designed to work with ElevenLabs or other TTS services

## File Structure

```
lib/remotion/
├── caption-types.ts      # Shared TypeScript types
└── caption-utils.ts      # Utility functions for caption handling

remotion/components/
└── CaptionRenderer.tsx   # Reusable caption component

data/captions/
└── milestone-24h.ts      # Caption data for 24h milestone
```

## Usage

### 1. Create Caption Data

Define your script with timing in `data/captions/`:

```typescript
import type { CaptionData } from '../../lib/remotion/caption-types';

export const myCaptions: CaptionData = {
  totalDuration: 30,
  audioUrl: '/audio/my-audio.mp3',
  segments: [
    {
      id: 'segment-1',
      text: 'First line\nSecond line',
      startTime: 0,
      endTime: 3.5,
      pauseAfter: 0.5,
    },
    // ... more segments
  ],
};
```

### 2. Use in Remotion Composition

```typescript
import { CaptionRenderer } from './components/CaptionRenderer';
import { myCaptions } from '../data/captions/my-captions';

export const MyComposition = () => {
  return (
    <AbsoluteFill>
      {/* Your video content */}
      
      <CaptionRenderer
        captionData={myCaptions}
        style={{
          fontSize: 56,
          color: '#F2F2EF',
          position: 'center',
        }}
      />
    </AbsoluteFill>
  );
};
```

### 3. Customize Styling

Available style options:

```typescript
const captionStyle: CaptionStyle = {
  fontSize: 52,
  fontFamily: 'Inter, sans-serif',
  color: '#FFFFFF',
  backgroundColor: '#000000',
  backgroundOpacity: 0.7,
  padding: 40,
  maxWidth: 900,
  position: 'top' | 'center' | 'bottom',
  textAlign: 'left' | 'center' | 'right',
  lineHeight: 1.4,
  letterSpacing: '-0.01em',
  textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)',
  borderRadius: 8,
};
```

## Generating TTS Audio

### Option 1: ElevenLabs API (Recommended)

```bash
# Call the TTS API endpoint (create this endpoint similar to eulogywriter)
curl -X POST http://localhost:3000/api/tts \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Your caption script here...",
    "voice": "your-voice-id"
  }'
```

### Option 2: Manual Upload

1. Generate audio using ElevenLabs website
2. Save as `public/audio/milestone-24h.mp3`
3. Update `audioUrl` in caption data

## Using in Video Editor (Future)

The caption system is designed to be reusable in the admin video editor:

```typescript
// In video editor component
import { CaptionRenderer } from '@/remotion/components/CaptionRenderer';

// Pass user-generated caption data
<CaptionRenderer
  captionData={userCaptionData}
  style={userSelectedStyle}
/>
```

## Utility Functions

### Get Active Caption

```typescript
import { getActiveCaptionSegment, framesToSeconds } from '@/lib/remotion/caption-utils';

const currentTime = framesToSeconds(frame, fps);
const activeSegment = getActiveCaptionSegment(segments, currentTime);
```

### Calculate Opacity (Fade Effects)

```typescript
import { calculateCaptionOpacity } from '@/lib/remotion/caption-utils';

const opacity = calculateCaptionOpacity(segment, currentTime, 0.3, 0.3);
```

### Parse Simple Script Format

```typescript
import { parseSimpleCaptionScript } from '@/lib/remotion/caption-utils';

const script = `
[0.0-2.5] First caption
[2.5-5.0] Second caption
[pause 1.0]
[5.0-8.0] Third caption
`;

const segments = parseSimpleCaptionScript(script);
```

## Example: Milestone 24 Hours

See `MilestoneComposition.tsx` for a complete example:

```typescript
// Simple version without captions
<Composition
  id="Milestone24Hours"
  component={MilestoneComposition}
  durationInFrames={180}
  defaultProps={{
    hours: 24,
    showCaptions: false,
  }}
/>

// Full version with narrated captions
<Composition
  id="Milestone24HoursWithCaptions"
  component={MilestoneComposition}
  durationInFrames={1350}
  defaultProps={{
    hours: 24,
    showCaptions: true,
    audioUrl: '/audio/milestone-24h.mp3',
  }}
/>
```

## Next Steps

1. **Generate TTS Audio**: Use ElevenLabs to generate audio for the script in `data/captions/milestone-24h.ts`
2. **Fine-tune Timings**: Adjust `startTime` and `endTime` to match actual audio
3. **Create More Milestones**: Add 7 days, 30 days, 90 days, 1 year, etc.
4. **Video Editor Integration**: Add caption editor UI in admin panel
5. **Word-Level Timings**: Add word-by-word highlighting using Whisper API (like eulogywriter)

## Tips

- Use `\n` in caption text for line breaks
- `pauseAfter` adds breathing room between segments
- Test with `npx remotion preview remotion/index.tsx`
- Caption data is separate from component logic for easy editing
- All utilities are pure functions for easy testing
