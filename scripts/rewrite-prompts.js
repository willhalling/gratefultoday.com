#!/usr/bin/env node

/**
 * Script to rewrite daily prompts using Claude AI
 * Rewrites prompts in casual, conversational style
 * Run with: node scripts/rewrite-prompts.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

// Check for API key
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('\n❌ missing ANTHROPIC_API_KEY environment variable\n');
  console.log('set it by running:');
  console.log('export ANTHROPIC_API_KEY="your-api-key-here"\n');
  console.log('or create a .env file with:');
  console.log('ANTHROPIC_API_KEY=your-api-key-here\n');
  process.exit(1);
}

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `you're helping rewrite gratitude journal prompts.

writing style:
- lowercase throughout (except I)
- casual, like texting a friend
- warm but real, not cheesy
- short and simple
- no formal words like "honor" "celebrate" "acknowledge"
- no recovery jargon or therapy speak
- no emojis
- sounds like a real person checking in
- gentle but not precious
- honest, maybe slightly vulnerable
- present-moment focused

tone: like a supportive friend sending you a quick text. real. grounded. calm.

output format must be valid JSON only:
{
  "subject": "short subject line for email, casual",
  "intro": "2-3 sentences. conversational intro that sets up the prompt. real talk.",
  "prompt": "the actual gratitude question. simple. direct.",
  "tags": ["relevant", "tags"]
}

examples of the vibe:
- instead of "What strength have you discovered?" → "what part of you turned out to be stronger than you thought?"
- instead of "Honor your progress" → "what's actually gotten easier for you?"
- instead of "Acknowledge your journey" → "when you look back, what's different now?"

keep it simple. keep it real. no performance. just checking in.`;

async function rewritePrompt(originalPrompt, monthTheme) {
  console.log(`\nrewriting: ${originalPrompt.substring(0, 50)}...`);

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `rewrite this gratitude prompt in the casual style described. month theme: ${monthTheme}

original prompt: "${originalPrompt}"

return only valid JSON, nothing else.`,
        },
      ],
    });

    const content = message.content[0].text;
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.error('no JSON found in response');
      return null;
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('error rewriting prompt:', error.message);
    return null;
  }
}

async function rewriteAllPrompts() {
  console.log('🔄 rewriting daily prompts with claude...\n');

  // Read current prompts file
  const promptsPath = path.join(__dirname, '../constants/dailyPrompts.ts');
  const promptsContent = fs.readFileSync(promptsPath, 'utf8');

  // Extract all old string prompts (the ones we haven't converted yet)
  const stringPromptRegex = /"([^"]+)",/g;
  const oldPrompts = [];
  let match;

  while ((match = stringPromptRegex.exec(promptsContent)) !== null) {
    oldPrompts.push(match[1]);
  }

  console.log(`found ${oldPrompts.length} prompts to rewrite\n`);

  // Monthly themes for context
  const themes = {
    march: 'growth & renewal',
    april: 'presence & mindfulness',
    may: 'joy & appreciation',
    june: 'nature & outdoors',
    july: 'freedom & independence',
    august: 'abundance & harvest',
    september: 'reflection & transition',
    october: 'comfort & coziness',
    november: 'gratitude & thanksgiving',
    december: 'wonder, hope & completion',
  };

  const rewrittenPrompts = [];

  // Process in batches to avoid rate limits
  for (let i = 0; i < oldPrompts.length; i++) {
    const prompt = oldPrompts[i];

    // Determine theme based on position
    let theme = 'general';
    if (i < 31) theme = themes.march;
    else if (i < 61) theme = themes.april;
    else if (i < 92) theme = themes.may;
    else if (i < 122) theme = themes.june;
    else if (i < 153) theme = themes.july;
    else if (i < 184) theme = themes.august;
    else if (i < 214) theme = themes.september;
    else if (i < 245) theme = themes.october;
    else if (i < 275) theme = themes.november;
    else theme = themes.december;

    const rewritten = await rewritePrompt(prompt, theme);

    if (rewritten) {
      rewrittenPrompts.push(rewritten);
      console.log('✓ done');
    } else {
      // Keep original if rewrite fails
      rewrittenPrompts.push({
        subject: 'daily gratitude',
        intro: '',
        prompt: prompt,
        tags: ['general'],
      });
      console.log('⚠ keeping original');
    }

    // Rate limiting - wait 1 second between requests
    if (i < oldPrompts.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Progress update every 10 prompts
    if ((i + 1) % 10 === 0) {
      console.log(`\nprogress: ${i + 1}/${oldPrompts.length} prompts processed\n`);
    }
  }

  // Save results
  const outputPath = path.join(__dirname, '../constants/rewritten-prompts.json');
  fs.writeFileSync(outputPath, JSON.stringify(rewrittenPrompts, null, 2), 'utf8');

  console.log('\n✨ all done!');
  console.log(`rewritten prompts saved to: ${outputPath}`);
  console.log('\nnext steps:');
  console.log('1. review the rewritten prompts');
  console.log('2. manually update dailyPrompts.ts with the new content');
}

// Run it
if (require.main === module) {
  rewriteAllPrompts().catch(console.error);
}

module.exports = { rewritePrompt };
