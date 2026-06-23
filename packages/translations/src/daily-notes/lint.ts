import type { Surface } from '../types';

export interface LintInput {
  surface: Surface;
  phrase: string;
  /** Days from today to the named day in `phrase`. null when not applicable. */
  today_offset_days: number | null;
}

export interface LintResult {
  ok: boolean;
  reasons: string[];
}

/** Locked forbidden words from CLAUDE.md + spec §2.1 test 5 additions. */
const FORBIDDEN_WORDS = [
  // CLAUDE.md locked
  'magic',
  'destiny',
  'fortune',
  'stars align',
  'manifest',
  'vibes',
  'blessed',
  // §2.1 daily-layer additions
  'the universe',
  'luck',
  "you'll feel",
  "you'll have",
  "you'll find",
  "today is your",
  'let yourself',
  // §5 daily-note forbidden horizon phrases (only fail on daily-note surface)
] as const;

/** Phrases forbidden specifically on the daily-note surface (per §5). */
const DAILY_NOTE_FORBIDDEN_HORIZONS = [
  'next week',
  'later this month',
  'after the retrograde station',
  'this season',
  'for the next few days',
] as const;

/**
 * Imperatives about inner state (§2.1 imperative addendum). These verbs
 * directed at the reader hide a "you" subject and fail the subject test.
 */
const FORBIDDEN_INNER_STATE_IMPERATIVES = [
  'embrace ',
  'open yourself',
  'be present',
  'make the most of',
  'trust the process',
  'tap into',
] as const;

/** Day-name words that may trigger the 3-day rule when on daily-note surface. */
const DAY_NAMES = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

/**
 * Lint a single phrase against the five boundary tests + 3-day rule.
 * Respects the §5.3 asymmetry: 3-day rule fires only when surface === 'daily-note'.
 */
export function lintPhrase(input: LintInput): LintResult {
  const reasons: string[] = [];
  const lower = input.phrase.toLowerCase();

  // ─── Test 5 (forbidden words) — applies on both surfaces ───
  for (const word of FORBIDDEN_WORDS) {
    if (lower.includes(word)) {
      reasons.push(`Forbidden word/phrase: "${word}" (§2.1 test 5).`);
    }
  }

  // ─── Test 1 imperative addendum — applies on both surfaces ───
  for (const verb of FORBIDDEN_INNER_STATE_IMPERATIVES) {
    if (lower.includes(verb)) {
      reasons.push(
        `Imperative about inner state: "${verb.trim()}" (§2.1 test 1 imperative addendum).`,
      );
    }
  }

  // ─── §5 daily-note-only checks ───
  if (input.surface === 'daily-note') {
    // Forbidden-horizon phrases
    for (const phrase of DAILY_NOTE_FORBIDDEN_HORIZONS) {
      if (lower.includes(phrase)) {
        reasons.push(
          `Forbidden horizon phrase on daily-note surface: "${phrase}" (§5).`,
        );
      }
    }

    // 3-day rule on named days
    if (input.today_offset_days !== null && input.today_offset_days > 3) {
      const namedDay = DAY_NAMES.find((d) => lower.includes(d));
      if (namedDay) {
        reasons.push(
          `Concrete horizon "${namedDay}" is ${input.today_offset_days} days away (> 3) on daily-note surface; must render vague fallback (§5).`,
        );
      }
    }
  }

  return { ok: reasons.length === 0, reasons };
}
