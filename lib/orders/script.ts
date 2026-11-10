import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import type { Occasion } from '@/lib/product';
import { EDIT_CHECK_SYSTEM_PROMPT, RECOVERY_SYSTEM_PROMPT, THANKS_SYSTEM_PROMPT } from './prompts';
import { ScriptResult, type RecoveryAnswers, type Script, type ThanksAnswers } from './types';

const MODEL = 'claude-opus-5-5';
// On a policy decline, the API re-runs the request on a fallback model it picks.
const FALLBACK = { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const };

const client = new Anthropic();

export type Season = 'christmas' | 'new_year' | 'none';

/** Christmas until the 27th of December, New Year until mid-January (UK). */
export function currentSeason(now = new Date()): Season {
  const m = now.getUTCMonth() + 1;
  const d = now.getUTCDate();
  if ((m === 11 && d >= 1) || (m === 12 && d <= 27)) return 'christmas';
  if ((m === 12 && d > 27) || (m === 1 && d <= 15)) return 'new_year';
  return 'none';
}

export type ScriptOutcome =
  | { status: 'ok'; script: Script }
  | { status: 'needs_review' | 'declined'; reason: string };

/** The answers as the model sees them: the email address never leaves our server. */
function promptInput(answers: ThanksAnswers | RecoveryAnswers, season: Season, changeRequest?: string) {
  const { email: _email, name_pronunciation: _pronunciation, ...rest } = answers;
  return JSON.stringify({ ...rest, season, ...(changeRequest ? { change_request: changeRequest } : {}) }, null, 2);
}

export async function writeScript(
  occasion: Occasion,
  answers: ThanksAnswers | RecoveryAnswers,
  options: { changeRequest?: string; season?: Season } = {},
): Promise<ScriptOutcome> {
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    ...FALLBACK,
    output_config: { effort: 'medium', format: betaZodOutputFormat(ScriptResult) },
    system: occasion === 'recovery' ? RECOVERY_SYSTEM_PROMPT : THANKS_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: promptInput(answers, options.season ?? currentSeason(), options.changeRequest) }],
  });

  if (response.stop_reason === 'refusal') {
    return { status: 'needs_review', reason: `Model declined (${response.stop_details?.category ?? 'no category'}).` };
  }
  const out = response.parsed_output;
  if (!out) throw new Error(`Script generation returned no parsable output (stop_reason: ${response.stop_reason}).`);

  if (out.status !== 'ok') return { status: out.status, reason: out.reason || 'No reason given.' };

  const lines = out.lines.map((l) => l.trim()).filter(Boolean);
  if (lines.length < 3) return { status: 'needs_review', reason: 'Model returned too few lines.' };

  return {
    status: 'ok',
    script: {
      title: out.title.trim(),
      voiceDirection: out.voice_direction.trim(),
      visualMood: out.visual_mood,
      backgroundSuggestion: out.background_suggestion.trim(),
      lines,
    },
  };
}

const EditCheck = z.object({ status: z.enum(['ok', 'needs_review', 'declined']), reason: z.string() });

/** Checks a script the buyer edited by hand, before it can be narrated. */
export async function checkEditedScript(
  occasion: Occasion,
  recipient: string,
  title: string,
  lines: string[],
): Promise<{ status: 'ok' | 'needs_review' | 'declined'; reason: string }> {
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 4000,
    ...FALLBACK,
    output_config: { effort: 'low', format: betaZodOutputFormat(EditCheck) },
    system: EDIT_CHECK_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: JSON.stringify({ kind: occasion === 'recovery' ? 'recovery milestone' : 'thank-you', recipient, title, lines }),
      },
    ],
  });

  if (response.stop_reason === 'refusal') return { status: 'needs_review', reason: 'Model declined to review.' };
  return response.parsed_output ?? { status: 'needs_review', reason: 'Review returned no result.' };
}
