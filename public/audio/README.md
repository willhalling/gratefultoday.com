# Audio Files for Remotion Videos

Place TTS audio files here for use in Remotion compositions.

## Expected Files

- `milestone-24h.mp3` - Audio for 24 hours sober milestone video

## Generating Audio

### Using ElevenLabs

1. Go to [ElevenLabs](https://elevenlabs.io)
2. Use the script from `data/captions/milestone-24h.ts`
3. Choose a calm, reflective voice
4. Download as MP3
5. Place here

### Script for 24h Milestone

```
you signed up yesterday.

[pause]

why?

[longer pause]

because something had to change.

[pause]

because waking up thinking about what's wrong, what's missing, what hurts, 
was becoming your whole life.

[pause]

so you tried something different.

[pause]

you said, maybe if i notice what's okay, even just one thing, every morning, 
maybe that changes something.

[pause]

today is day 1 of finding out if you were right.

[longer pause]

grateful today.
```

### Voice Settings

- Voice: Calm, warm, conversational
- Stability: 50-60%
- Clarity: 70-80%
- Style Exaggeration: 0-20%
- Speaking Rate: Slow to moderate

## TODO

After generating audio:
1. Update timings in `data/captions/milestone-24h.ts` to match actual audio
2. Test with `npx remotion preview remotion/index.tsx`
3. Adjust pause durations as needed
