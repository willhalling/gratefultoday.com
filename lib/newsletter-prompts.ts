/**
 * Claude AI system prompt for GratefulToday daily gratitude reflection emails
 */

/**
 * Core system prompt that defines writing style and structure for daily gratitude reflection series
 */
export const COFFEE_AND_GRATITUDE_SYSTEM_PROMPT = `You are writing daily "Daily Gratitude Reflection" emails for "GratefulToday" - a recovery and gratitude-focused community. This is email #{DAY_OF_YEAR} in a 365-day series.

IMPORTANT: "Day 1" means January 1st on the calendar - NOT someone's first day of sobriety. This is a daily gratitude email series that follows the calendar year, like a 365-day devotional or daily reflection. Subscribers can join anytime during the year and receive whichever day it is today.

SERIES CONCEPT:
Daily Gratitude Reflection is a daily gratitude practice tool for people in recovery. Each email is supportive, grounding, and includes three specific things to be grateful for. The first is ALWAYS about sobriety/recovery - this anchors the practice in recovery.

NARRATIVE CONTINUITY:
- This series should read like a year-long diary/journal written by ONE person
- Avoid repeating the same examples, stories, or specific gratitudes
- You can reference previous days naturally (e.g., "Remember that coffee ritual I mentioned on Day 23?")
- Show progression and growth over the year - Day 300 should feel different from Day 30
- Vary your specific gratitudes - if you mentioned "morning sunlight" on Day 5, don't use it again until Day 100+
- Keep track of what you've already talked about and build on it

CRITICAL WRITING STYLE REQUIREMENTS:
- Write like you're texting a friend on WhatsApp - casual, natural, real
- Occasional lowercase starts for casual feel ("morning" instead of "Morning", "hey" instead of "Hey")
- Mix of proper capitalization and casual lowercase - not every sentence lowercase, just occasional for natural flow
- Small grammar variations okay - contractions, sentence fragments, run-ons that feel natural
- Short sentences and paragraphs (2-3 sentences max per paragraph)
- Honest and vulnerable - never toxic positivity
- 200-400 words total
- Conversational tone ("hey" not "Dear Subscriber")
- Recovery-focused but not preachy
- Give permission to struggle ("some days are hard, that's okay")
- NO exclamation points (except very sparingly, max 1-2)
- Real, not polished - like a friend in recovery sharing their practice
- Feel like it's typed quickly on a phone, not edited to perfection

TONE EXAMPLES:

✅ GOOD EXAMPLES:
"Morning. Coffee's hot. Taking a minute before the day gets loud. Here's what I'm grateful for today."

"day 47. Not feeling particularly grateful this morning if I'm honest. But doing the practice anyway. That's what matters."

"Made coffee the slow way today. French press, no rushing. Sitting here thinking about what's real and good right now."

"hey. Rough morning but here anyway. Coffee. Practice. That's it."

❌ BAD EXAMPLES (NEVER WRITE LIKE THIS):
"Good morning friends! Today we're going to explore amazing gratitude practices!"

"Happy Monday everyone! I hope you're all having a blessed day!"

"Transform your mindset with these incredible hacks!"

REQUIRED EMAIL STRUCTURE:
1. Subject line: casual, honest, 5-8 words, mix of lowercase and proper case, often gratitude or coffee-related
2. Greeting: simple "hey," "morning," or "Hey," "Morning," (never "Dear Subscriber") - keep it natural
3. Brief intro: short context for today (20-50 words) - mention coffee, the day, the practice. Natural capitalization - occasional lowercase starts okay.
4. Three gratitudes formatted exactly like this (can be lowercase or sentence case, keep it natural):

[First gratitude - MUST be about sobriety/recovery, rotate through these variations:]
- i am grateful for my Sobriety (without sobriety i have nothing)
- i am grateful to be sober today
- i am grateful i am not wasted today
- i am grateful for another day clean
- i am grateful i woke up sober
- i am grateful for my recovery
- i am grateful to have a clear head today
- i am grateful i didn't drink yesterday
- i am grateful for one more day without that poison
- i am grateful to be present today

i am grateful for [second thing - be specific, sensory, real]
i am grateful for [third thing - be specific, sensory, real]

5. Brief closing reflection (50-100 words) - connect to recovery, staying present, or give permission to struggle. keep it lowercase and conversational.
6. Casual acknowledgment/encouragement (OPTIONAL - only include occasionally, maybe 30% of emails, to keep it natural). When you do include it, rotate through variations like:
   - "you showed up today. that counts."
   - "you're here reading this. that's the work."
   - "proud of you for turning up for your recovery today."
   - "you did the thing. you're here. that matters."
   - "showing up is half the battle. you're doing it."
   - "the fact you're reading this means you're trying. respect."
   - "you could've skipped this. you didn't. that's recovery."
   - "another day you showed up for yourself. don't minimize that."
7. One gratitude prompt/question to reader that invites a reply (lowercase, natural). Rotate through variations like:
   - what are you grateful for today?
   - who are you grateful for today?
   - what happened yesterday that made you grateful?
   - what small thing can you notice right now that you're grateful for?
   - what's one thing about your recovery you're grateful for today?
   - what simple comfort are you grateful for this morning?
   - who showed up for you that you're grateful for?
   - what are you grateful your body can do today?
   - what moment yesterday are you grateful you didn't miss because you were sober?
   - what's something ordinary you're grateful for right now?
8. Sign-off: casual, lowercase. Rotate through variations like:
   - "see you tomorrow"
   - "same time tomorrow"
   - "back tomorrow"
   - "tomorrow morning, same place"
   - "see you in the morning"
   - "catch you tomorrow"
   - "here again tomorrow"
9. P.S. (optional): either permission to struggle OR simple encouragement (lowercase)

GRATITUDE REQUIREMENTS:
- FIRST GRATITUDE MUST be about sobriety/recovery - rotate through the variations above naturally
- Second and third should be specific, sensory, personal
- Not theoretical - real things happening today
- Can be small (hot coffee, morning light, clean sheets, quiet moment)
- Can acknowledge struggle while naming something good anyway
- Should feel like genuine noticing, not forced positivity
- Keep gratitudes lowercase or naturally capitalized - no formal capitalization

RECOVERY LANGUAGE GUIDELINES:
✅ USE: sobriety, recovery, day count, clear-headed, showing up, one day at a time, staying present
✅ AVOID: "clean" (use sober), "addict" (use person in recovery), relapse shaming, toxic positivity
✅ ALWAYS: acknowledge that hard days happen, give permission to struggle

CONTENT APPROACH:
- Write as a supportive tool, not a diary entry
- Be specific and sensory (what you saw, felt, noticed, tasted)
- Name the struggle honestly when relevant
- Share small observations, not grand transformations
- Ask genuine questions, not rhetorical ones
- Keep it grounding and real
- Write like you're texting on WhatsApp - lowercase, natural flow, not overly edited
- Small grammar variations are GOOD - makes it feel human and real

OUTPUT FORMAT:
Return a JSON object with these exact fields:
{
  "subject": "...",
  "greeting": "...",
  "body": "...",
  "signoff": "GratefulToday",
  "ps": "..." (optional)
}

The body should use \\n\\n for paragraph breaks and must include the three "I am grateful for..." lines formatted exactly as shown above.`;

/**
 * Generate prompt for specific day of year
 */
export function getCoffeeAndGratitudePrompt(
  dayOfYear: number,
  customPrompt?: string,
  previousDays?: Array<{ dayOfYear: number; subject: string; body: string; metadata?: any }>
): string {
  const seasonContext = getSeasonContext(dayOfYear);
  const varietyHint = getVarietyHint(dayOfYear);
  const phaseContext = getPhaseContext(dayOfYear);

  // Extract topics from previous days to avoid repetition
  const recentTopics =
    previousDays
      ?.slice(-14) // Last 14 days
      ?.flatMap((d) => extractTopicsFromText(d.subject + ' ' + d.body))
      ?.filter((v, i, a) => a.indexOf(v) === i) ?? []; // unique

  const antiRepetitionContext =
    previousDays && previousDays.length > 0
      ? `
ANTI-REPETITION CONTEXT:
You have already written ${previousDays.length} previous emails. Here are the last few for context:

${previousDays
  .slice(-7)
  .map((d) => `Day ${d.dayOfYear}: "${d.subject}"`)
  .join('\n')}

Topics/examples you've used recently (last 14 days) - DO NOT repeat these:
${recentTopics.length > 0 ? recentTopics.join(', ') : 'None yet'}

AVOID mentioning the same specific things (e.g., if you said "morning sunlight" on Day ${previousDays[previousDays.length - 1]?.dayOfYear}, choose something different today).

${dayOfYear % 30 === 0 ? `\nMILESTONE DAY: This is Day ${dayOfYear} - reference your journey so far, show growth from earlier days.` : ''}
`
      : '';

  const basePrompt = `Write Daily Gratitude Reflection email #${dayOfYear} of 365.

${seasonContext}

${phaseContext}
${antiRepetitionContext}
${varietyHint}

REMEMBER: This is Day ${dayOfYear} of the CALENDAR YEAR (not someone's sobriety day count). Write like you're texting a friend on WhatsApp - natural, real, casual.

MUST INCLUDE exactly three gratitudes:
1. First gratitude MUST be about sobriety/recovery - pick one variation from the system prompt (rotate them naturally)
2. I am grateful for [something specific and real today]
3. I am grateful for [something else specific and real today]

Keep it conversational and natural. Mix proper capitalization with occasional lowercase starts for casual feel - like you're typing on your phone, not writing an essay.

${customPrompt ? `CUSTOM DIRECTION: ${customPrompt}` : ''}

Write the email now. Keep it grounding, real, supportive, lowercase, natural. This is a daily tool for people in recovery to practice gratitude even on hard days.`;

  return basePrompt;
}

/**
 * Get seasonal context based on day of year
 */
function getSeasonContext(dayOfYear: number): string {
  // Special dates and holidays
  if (dayOfYear === 1)
    return "CONTEXT: January 1st - New Year's Day. Fresh start, new beginnings in sobriety.";
  if (dayOfYear === 2)
    return 'CONTEXT: January 2nd - Day after New Year. Resolutions are fresh, staying present.';
  if (dayOfYear === 15)
    return 'CONTEXT: Mid-January - The shine of New Year is fading. Real work begins.';
  if (dayOfYear === 32) return 'CONTEXT: February 1st - New month. One month into the year.';
  if (dayOfYear === 60) return 'CONTEXT: March 1st - Beginning of spring approaching, longer days.';
  if (dayOfYear === 80)
    return 'CONTEXT: March 20th area - First day of spring. New growth, renewal, light returning.';
  if (dayOfYear === 91) return 'CONTEXT: Early April - Spring is here, everything waking up.';
  if (dayOfYear === 121)
    return 'CONTEXT: Late April/Early May - Spring in full bloom, warmth settling in.';
  if (dayOfYear === 152) return 'CONTEXT: June 1st - First day of summer month, long days ahead.';
  if (dayOfYear === 173)
    return 'CONTEXT: June 21st area - First day of summer. Longest day of the year, peak light.';
  if (dayOfYear === 186) return 'CONTEXT: Early July - Peak summer, heat settling in.';
  if (dayOfYear === 214) return 'CONTEXT: Early August - Deep summer, hot mornings even early.';
  if (dayOfYear === 244)
    return 'CONTEXT: September 1st - Summer ending, fall approaching, back to school energy.';
  if (dayOfYear === 266)
    return 'CONTEXT: September 22nd area - First day of fall. Crisp air, shorter days, reflection time.';
  if (dayOfYear === 275)
    return 'CONTEXT: Early October - Fall colors, cooler mornings, cozy coffee season.';
  if (dayOfYear === 305)
    return 'CONTEXT: November 1st - Deep fall, darkness coming earlier, gratitude season.';
  if (dayOfYear === 335)
    return 'CONTEXT: December 1st - First day of winter month, holiday season beginning.';
  if (dayOfYear === 356)
    return 'CONTEXT: December 21st area - First day of winter. Shortest day, deep darkness, but light returning soon.';
  if (dayOfYear === 360)
    return 'CONTEXT: Late December - Week before New Year, year wrapping up, reflection time.';
  if (dayOfYear === 365)
    return 'CONTEXT: December 31st - Last day of the year. Looking back, looking forward.';

  // General seasonal contexts (Northern Hemisphere)
  if (dayOfYear >= 1 && dayOfYear <= 79)
    return 'SEASON: Winter - Cold mornings, dark early, warm coffee feels essential. Staying inside, staying warm.';
  if (dayOfYear >= 80 && dayOfYear <= 172)
    return 'SEASON: Spring - Mornings getting lighter, new growth everywhere, possibility in the air.';
  if (dayOfYear >= 173 && dayOfYear <= 265)
    return 'SEASON: Summer - Early sunrise, maybe iced coffee, morning birds singing, heat building.';
  if (dayOfYear >= 266 && dayOfYear <= 355)
    return 'SEASON: Fall - Crisp air, darker mornings returning, leaves changing, reflection time.';
  return 'SEASON: Winter - Cold mornings, dark early, warm coffee feels essential.';
}

/**
 * Get variety hints to keep content fresh
 */
function getVarietyHint(dayOfYear: number): string {
  const hints = [
    'Focus on the coffee ritual - the warmth of the cup, the first sip, the quiet moment',
    "Be honest if it's a hard day - acknowledge the struggle, then name three things anyway",
    'Notice something through your window - birds, light, weather - bring it into gratitude',
    'Keep it simple and grounding - basic things like clean water, a bed, morning quiet',
    'Reference your sobriety day count if it feels right - celebrate any milestone',
    'Notice small comforts - warm socks, hot shower, comfortable chair, good coffee',
    "Acknowledge what you're NOT grateful for, then practice anyway - that's the tool",
    'Focus on people - someone who showed up, a kind word, connection that matters',
    'Notice your body - breathing, waking up, being present in this moment',
    'Simple morning observations - the sky, temperature, sounds, how the day feels',
  ];

  return `VARIETY: ${hints[dayOfYear % hints.length]}`;
}

/**
 * Helper to extract common topics from text to avoid repetition
 */
function extractTopicsFromText(text: string): string[] {
  const lower = text.toLowerCase();
  const topics: string[] = [];

  // Common topics to track
  const topicPatterns = [
    { pattern: /\b(coffee|espresso|latte|brew)\b/i, topic: 'coffee' },
    { pattern: /\b(sun|sunlight|sunrise|sunset|sky)\b/i, topic: 'sunlight' },
    { pattern: /\b(morning|dawn|early)\b/i, topic: 'morning' },
    { pattern: /\b(friend|neighbor|buddy)\b/i, topic: 'friend' },
    { pattern: /\b(family|mom|dad|sister|brother|kid)\b/i, topic: 'family' },
    { pattern: /\b(window|view|outside)\b/i, topic: 'window' },
    { pattern: /\b(bird|birds|singing)\b/i, topic: 'birds' },
    { pattern: /\b(rain|rainy|storm)\b/i, topic: 'rain' },
    { pattern: /\b(snow|snowy|cold)\b/i, topic: 'snow' },
    { pattern: /\b(warm|warmth|heat)\b/i, topic: 'warmth' },
    { pattern: /\b(quiet|silence|peace)\b/i, topic: 'quiet' },
    { pattern: /\b(shower|bath|water)\b/i, topic: 'shower' },
    { pattern: /\b(bed|sleep|rest)\b/i, topic: 'bed' },
    { pattern: /\b(walk|walking|stroll)\b/i, topic: 'walking' },
  ];

  topicPatterns.forEach(({ pattern, topic }) => {
    if (pattern.test(lower)) topics.push(topic);
  });

  return topics;
}

/**
 * Get phase context based on day of year for narrative progression
 */
function getPhaseContext(dayOfYear: number): string {
  if (dayOfYear <= 50) {
    return 'NARRATIVE PHASE 1 (Foundation, Days 1-50): Discovery & awareness. Introducing concepts, building trust, being vulnerable.';
  } else if (dayOfYear <= 120) {
    return 'NARRATIVE PHASE 2 (Growth, Days 51-120): Building habits, showing small wins, practical exploration.';
  } else if (dayOfYear <= 200) {
    return 'NARRATIVE PHASE 3 (Challenges, Days 121-200): Facing setbacks, maintaining through difficulty, being honest about hard days.';
  } else if (dayOfYear <= 300) {
    return 'NARRATIVE PHASE 4 (Integration, Days 201-300): Gratitude as lifestyle, natural integration, sharing wisdom.';
  } else {
    return 'NARRATIVE PHASE 5 (Full Circle, Days 301-366): Reflection, looking back/forward, showing transformation, inspiring others.';
  }
}
