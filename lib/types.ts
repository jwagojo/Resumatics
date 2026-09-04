/**
 * Mirrors the Zod schemas in `lib/schemas.ts`.
 * Kept as plain types so the frontend carries no runtime validator.
 */

export type RequirementCategory =
  | "skill"
  | "experience"
  | "education"
  | "certification"
  | "responsibility";

export type Importance = "required" | "preferred" | "nice_to_have";

export type VerdictKind = "met" | "partial" | "missing";

export interface Requirement {
  id: string;
  text: string;
  category: RequirementCategory;
  importance: Importance;
  yearsRequired: number | null;
}

export interface Verdict {
  requirementId: string;
  verdict: VerdictKind;
  /** Must be verbatim from the resume. Null when the requirement is unmet. */
  evidenceQuote: string | null;
  reasoning: string;
}

export type Recommendation =
  /** Only permitted where the resume already carries the evidence. */
  | {
      kind: "rewrite";
      requirementId: string;
      before: string;
      after: string;
      why: string;
    }
  /** A question put to the user. Never an asserted claim on their behalf. */
  | { kind: "ask"; requirementId: string; question: string }
  | { kind: "deprioritize"; target: string; why: string }
  /** Honest: the gap is real and rewording will not close it. */
  | {
      kind: "real_gap";
      requirementId: string;
      why: string;
      howToClose: string;
    }
  ;

export interface JobPosting {
  title: string;
  company: string;
  /** Which adapter produced the text, surfaced so the user can see the path. */
  source: "greenhouse" | "lever" | "ashby" | "json-ld" | "pasted";
  sourceLabel: string;
}

export interface OmittedRequirement {
  text: string;
  reason: string;
}

export type StandoutKind = "project" | "skill" | "credential" | "artifact";

export interface StandoutSuggestion {
  kind: StandoutKind;
  title: string;
  why: string;
  how: string;
  requirementId: string | null;
}

export interface Analysis {
  job: JobPosting;
  resumeFilename: string;
  resumeText: string;
  requirements: Requirement[];
  verdicts: Verdict[];
  recommendations: Recommendation[];
  /** Things to build or learn so the file stands out. Not scored until they exist. */
  standouts: StandoutSuggestion[];
  /** Posting lines skipped because a résumé cannot prove them. */
  omitted: OmittedRequirement[];
}

export const IMPORTANCE_LABEL: Record<Importance, string> = {
  required: "Required",
  preferred: "Preferred",
  nice_to_have: "Nice to have",
};

export const VERDICT_LABEL: Record<VerdictKind, string> = {
  met: "Met",
  partial: "Partial",
  missing: "Missing",
};

/**
 * Verdict is encoded three ways over — glyph, text label, and ink weight — so
 * it never depends on colour alone.
 */
export const VERDICT_GLYPH: Record<VerdictKind, string> = {
  met: "■",
  partial: "◪",
  missing: "□",
};

export const STANDOUT_LABEL: Record<StandoutKind, string> = {
  project: "Project",
  skill: "Skill",
  credential: "Credential",
  artifact: "Artifact",
};

export const CATEGORY_LABEL: Record<RequirementCategory, string> = {
  skill: "Skill",
  experience: "Experience",
  education: "Education",
  certification: "Certification",
  responsibility: "Responsibility",
};
