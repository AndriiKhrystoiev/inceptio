import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, relative } from 'node:path';

// No-hardcoded-literal lint (Task C1). A NET, not a compiler: it scans screens
// and components for user-facing string literals that look like they should be
// behind t(). Heuristic by design — it flags JSX text nodes and common
// user-facing string-literal props. Known-non-translatable literals are
// allowlisted explicitly; everything else must be empty or the test fails and
// names the offenders.

const ROOT = resolve('src');
const SCAN_DIRS = [resolve(ROOT, 'screens'), resolve(ROOT, 'components')];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === '__tests__' || entry === '__mocks__') continue;
    const full = resolve(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(jsx?|tsx)$/.test(full)) out.push(full);
  }
  return out;
}

// A literal is "user-facing-shaped" if it has a space and >=2 letters. This
// skips single tokens (icons, keys, enum values, glyphs), numbers, and emoji.
function looksUserFacing(s: string): boolean {
  const trimmed = s.trim();
  if (!/\s/.test(trimmed)) return false;
  const letters = (trimmed.match(/[A-Za-zÀ-ſ]/g) ?? []).length;
  return letters >= 2;
}

// Explicit allowlist of known non-translatable literals. Keep this small and
// documented; an entry here is a deliberate "this string is not chrome".
// Matching is case-insensitive substring on the trimmed literal.
const ALLOWLIST: Array<{ match: string; why: string }> = [
  // Brand watermark / wordmark — same in every locale.
  { match: 'Inceptio', why: 'brand wordmark, not translated' },
  // __DEV__-only StatePicker state labels (developer tooling, never shipped UI).
  { match: 'viable caution', why: '__DEV__ StatePicker dev labels' },
  { match: 'fully blocked', why: '__DEV__ StatePicker dev labels' },
  // __DEV__-only YouScreen rating Debug rows (compiled out of prod via LG9).
  { match: 'Force rating eval', why: '__DEV__ rating Debug row label' },
  { match: 'Force requestReview()', why: '__DEV__ rating Debug row label' },
  { match: 'Reset rating state', why: '__DEV__ rating Debug row label' },
];

function isAllowlisted(lit: string): boolean {
  const lower = lit.toLowerCase();
  return ALLOWLIST.some((a) => lower.includes(a.match.toLowerCase()));
}

// KNOWN GAPS — real un-extracted chrome strings this lint surfaced that Batch B
// MISSED (the gate-only per-screen tests can't catch a file no task owned).
// These are NOT allowlisted-as-fine; they are TODO i18n work, recorded here so
// the suite stays green while keeping the gaps visible and inventoried.
//
// (Previously: components/card/MomentCardSheet.js — the share sheet — was not in
// any Batch-B partition row. It has since been extracted to the `share` ns, so its
// entries were removed from this inventory.)
const KNOWN_GAPS: Array<{ file: string; text: string }> = [];

function isKnownGap(f: Finding): boolean {
  return KNOWN_GAPS.some((g) => g.file === f.file && g.text === f.text);
}

// True if the literal is already inside a t(...) call (within ~40 chars before
// the opening quote on the same line). Cheap proximity check — a net.
function precededByT(line: string, quoteIndex: number): boolean {
  const before = line.slice(Math.max(0, quoteIndex - 40), quoteIndex);
  return /\bt\(\s*$/.test(before) || /\bt\(\s*['"`][^'"`]*['"`]\s*,\s*$/.test(before);
}

type Finding = { file: string; line: number; kind: string; text: string };

// User-facing string-literal props worth flagging.
const PROP_RE =
  /\b(title|placeholder|label|accessibilityLabel|accessibilityHint)\s*=\s*(['"])((?:(?!\2).)*)\2/g;
// JSX text node: >some words< on a single line (no tags/braces inside).
const JSX_TEXT_RE = />([^<>{}\n]+)</g;

function scanFile(file: string): Finding[] {
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');
  const findings: Finding[] = [];
  const rel = relative(ROOT, file);

  lines.forEach((line, i) => {
    // Skip comment lines wholesale.
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;

    // --- user-facing prop literals ---
    let m: RegExpExecArray | null;
    PROP_RE.lastIndex = 0;
    while ((m = PROP_RE.exec(line)) !== null) {
      const value = m[3];
      const quoteIdx = m.index + m[0].indexOf(m[2]);
      if (precededByT(line, quoteIdx)) continue;
      if (looksUserFacing(value) && !isAllowlisted(value)) {
        findings.push({ file: rel, line: i + 1, kind: `prop ${m[1]}`, text: value });
      }
    }

    // --- JSX text nodes ---
    JSX_TEXT_RE.lastIndex = 0;
    while ((m = JSX_TEXT_RE.exec(line)) !== null) {
      const text = m[1];
      // Skip arrow-function bodies / comparisons that masquerade as >x<.
      if (text.includes('=') || text.includes('&&') || text.includes('||')) continue;
      if (looksUserFacing(text) && !isAllowlisted(text)) {
        findings.push({ file: rel, line: i + 1, kind: 'jsx-text', text: text.trim() });
      }
    }
  });

  return findings;
}

describe('no-hardcoded-literal lint (screens + components)', () => {
  const files = SCAN_DIRS.flatMap(walk);
  const findings = files.flatMap(scanFile);

  it('scans a meaningful number of files (guard is wired)', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it('surfaces the inventoried known gaps (so they stay visible)', () => {
    // Every KNOWN_GAPS entry must still be a live finding — if a gap gets
    // extracted, this fails and forces deleting the now-stale entry.
    const stillFound = KNOWN_GAPS.filter((g) =>
      findings.some((f) => f.file === g.file && f.text === g.text),
    );
    expect(
      stillFound.map((g) => `${g.file}: "${g.text}"`).sort(),
      'a KNOWN_GAPS entry was extracted — remove it from KNOWN_GAPS',
    ).toEqual(KNOWN_GAPS.map((g) => `${g.file}: "${g.text}"`).sort());
  });

  it('finds no NEW un-extracted user-facing literals (beyond known gaps)', () => {
    const fresh = findings.filter((f) => !isKnownGap(f));
    const report = fresh
      .map((f) => `  ${f.file}:${f.line} [${f.kind}] "${f.text}"`)
      .join('\n');
    expect(
      fresh,
      fresh.length
        ? `Un-extracted user-facing literals (extract to a t() ns, or allowlist if non-translatable):\n${report}`
        : '',
    ).toEqual([]);
  });
});
