import type {
  Importance,
  Requirement,
  RequirementCategory,
  Verdict,
  VerdictKind,
} from "./types";

/**
 * The score is arithmetic, not a model opinion.
 *
 * No language model is involved past this point. Every requirement carries a
 * weight from its importance and earns a fraction of it from its verdict, so
 * the same verdicts always produce the same number and every point traces back
 * to a specific row of the checklist.
 */

export const IMPORTANCE_WEIGHT: Record<Importance, number> = {
  required: 3,
  preferred: 2,
  nice_to_have: 1,
};

export const VERDICT_CREDIT: Record<VerdictKind, number> = {
  met: 1,
  partial: 0.5,
  missing: 0,
};

export interface CategoryScore {
  category: RequirementCategory;
  earned: number;
  possible: number;
  percent: number;
}

/** One slice of the derivation bar. Width is the requirement's share of the total weight. */
export interface ScoreSegment {
  requirementId: string;
  verdict: VerdictKind;
  weight: number;
  sharePercent: number;
}

export interface ScoreResult {
  percent: number;
  earned: number;
  possible: number;
  counts: Record<VerdictKind, number>;
  byCategory: CategoryScore[];
  segments: ScoreSegment[];
}

const CATEGORY_ORDER: RequirementCategory[] = [
  "skill",
  "experience",
  "responsibility",
  "education",
  "certification",
];

export function scoreAnalysis(
  requirements: Requirement[],
  verdicts: Pick<Verdict, "requirementId" | "verdict">[],
): ScoreResult {
  const verdictById = new Map(verdicts.map((v) => [v.requirementId, v.verdict]));

  let earned = 0;
  let possible = 0;
  const counts: Record<VerdictKind, number> = { met: 0, partial: 0, missing: 0 };
  const categoryTotals = new Map<
    RequirementCategory,
    { earned: number; possible: number }
  >();

  for (const requirement of requirements) {
    const verdict = verdictById.get(requirement.id) ?? "missing";
    const weight = IMPORTANCE_WEIGHT[requirement.importance];
    const credit = weight * VERDICT_CREDIT[verdict];

    earned += credit;
    possible += weight;
    counts[verdict] += 1;

    const bucket = categoryTotals.get(requirement.category) ?? {
      earned: 0,
      possible: 0,
    };
    bucket.earned += credit;
    bucket.possible += weight;
    categoryTotals.set(requirement.category, bucket);
  }

  const byCategory: CategoryScore[] = CATEGORY_ORDER.flatMap((category) => {
    const bucket = categoryTotals.get(category);
    if (bucket === undefined || bucket.possible === 0) return [];
    return [
      {
        category,
        earned: bucket.earned,
        possible: bucket.possible,
        percent: Math.round((bucket.earned / bucket.possible) * 100),
      },
    ];
  });

  // Grouped by verdict so the earned portion of the bar reads as one span.
  const verdictRank: Record<VerdictKind, number> = {
    met: 0,
    partial: 1,
    missing: 2,
  };
  const segments: ScoreSegment[] = requirements
    .map((requirement) => {
      const verdict = verdictById.get(requirement.id) ?? "missing";
      const weight = IMPORTANCE_WEIGHT[requirement.importance];
      return {
        requirementId: requirement.id,
        verdict,
        weight,
        sharePercent: possible === 0 ? 0 : (weight / possible) * 100,
      };
    })
    .sort((a, b) => verdictRank[a.verdict] - verdictRank[b.verdict]);

  return {
    percent: possible === 0 ? 0 : Math.round((earned / possible) * 100),
    earned,
    possible,
    counts,
    byCategory,
    segments,
  };
}

/**
 * The worded form of the percentage, so the readout never presents a bare
 * number as its own headline. Bands are fixed thresholds, not a judgement —
 * the same percentage always reads the same way.
 */
export function scoreBand(percent: number): string {
  if (percent >= 85) return "Strong match";
  if (percent >= 70) return "Close match";
  if (percent >= 55) return "Partial match";
  if (percent >= 40) return "Thin match";
  return "Weak match";
}

/** Trims a trailing `.0` so weights read as `3` and `1.5`, not `3.0`. */
export function formatWeight(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
