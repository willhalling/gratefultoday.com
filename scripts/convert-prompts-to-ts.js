const fs = require('fs');
const path = require('path');

// Read the JSON file
const jsonPath = path.join(__dirname, '../constants/rewritten-prompts.json');
const prompts = require(jsonPath);

console.log(`Found ${prompts.length} prompts in JSON file`);

// Generate TypeScript code
const tsCode = `/**
 * Daily Gratitude Prompts - 366 prompts (one for each day of the year including leap years)
 * Organized by month with seasonal themes
 */

export interface DailyPrompt {
  subject: string;
  intro: string;
  prompt: string;
  tags: string[];
}

export const DAILY_PROMPTS: DailyPrompt[] = [
${prompts.slice(0, 366).map((p, i) => {
  const tags = p.tags.map(t => `"${t}"`).join(', ');
  return `  {
    subject: "${p.subject.replace(/"/g, '\\"')}",
    intro: "${p.intro.replace(/"/g, '\\"')}",
    prompt: "${p.prompt.replace(/"/g, '\\"')}",
    tags: [${tags}]
  }${i < 365 ? ',' : ''}`;
}).join('\n')}
];

/**
 * Get the prompt for a specific day of the year (1-366)
 */
export function getPromptForDay(dayOfYear: number): DailyPrompt {
  // Ensure day is within valid range
  const day = Math.max(1, Math.min(366, dayOfYear));
  return DAILY_PROMPTS[day - 1]; // Array is 0-indexed, days are 1-indexed
}

/**
 * Get the current day of the year (1-366)
 */
export function getCurrentDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

/**
 * Get day of year for a specific date
 */
export function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

/**
 * Get today's prompt
 */
export function getTodaysPrompt(): DailyPrompt {
  return getPromptForDay(getCurrentDayOfYear());
}
`;

// Write to functions/src/constants/dailyPrompts.ts
const outputPath = path.join(__dirname, '../functions/src/constants/dailyPrompts.ts');
fs.writeFileSync(outputPath, tsCode, 'utf8');

console.log(`✅ Successfully converted ${prompts.length} prompts to TypeScript`);
console.log(`   Output: ${outputPath}`);
