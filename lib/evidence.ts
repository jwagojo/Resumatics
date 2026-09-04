import type { Verdict, VerdictKind } from "./types";

/**
 * Evidence verification.
 *
 * The model is asked to quote the resume verbatim when it credits a
 * requirement. This checks that the quote actually exists. A quote that cannot
 * be located is a fabrication, and the verdict resting on it is downgraded to
 * `missing` rather than silently trusted.
 */

/** Collapses whitespace and case so formatting differences do not cause a miss. */
function normalize(input: string): string {
  return input
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export interface VerifiedVerdict extends Verdict {
  /** False when the quote could not be located in the resume. */
  evidenceVerified: boolean;
  /** The verdict the model returned, before any downgrade. */
  originalVerdict: VerdictKind;
  /** The resume line the quote was found on, for showing it in context. */
  evidenceLine: string | null;
}

export function verifyVerdicts(
  verdicts: Verdict[],
  resumeText: string,
): VerifiedVerdict[] {
  const haystack = normalize(resumeText);
  const lines = resumeText.split("\n");

  return verdicts.map((verdict) => {
    if (verdict.evidenceQuote === null) {
      return {
        ...verdict,
        evidenceVerified: true,
        originalVerdict: verdict.verdict,
        evidenceLine: null,
      };
    }

    const needle = normalize(verdict.evidenceQuote);
    const found = needle.length > 0 && haystack.includes(needle);
    const evidenceLine =
      lines.find((line) => normalize(line).includes(needle)) ?? null;

    return {
      ...verdict,
      evidenceVerified: found,
      originalVerdict: verdict.verdict,
      // An unverifiable quote earns no credit.
      verdict: found ? verdict.verdict : "missing",
      evidenceLine: found ? evidenceLine : null,
    };
  });
}

export function countUnverified(verdicts: VerifiedVerdict[]): number {
  return verdicts.filter((v) => !v.evidenceVerified).length;
}

/** Rows whose quoted evidence was invented or mistyped. */
export function discardedQuoteIds(verdicts: VerifiedVerdict[]): string[] {
  return verdicts
    .filter(
      (verdict) =>
        !verdict.evidenceVerified && verdict.originalVerdict !== "missing",
    )
    .map((verdict) => verdict.requirementId);
}

/**
 * Re-judge only discarded rows when the first pass lost too many quotes.
 * Cheaper than restarting extract + judge.
 */
export function shouldRejudgeDiscarded(verdicts: VerifiedVerdict[]): boolean {
  const discarded = discardedQuoteIds(verdicts);
  if (discarded.length === 0) return false;
  const quoted = verdicts.filter((verdict) => verdict.evidenceQuote !== null)
    .length;
  return discarded.length >= 2 || (quoted > 0 && discarded.length / quoted >= 0.3);
}
