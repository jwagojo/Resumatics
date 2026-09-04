import { z } from "zod";

/**
 * Runtime validators for Ollama JSON. Local models drift on enums, nulls, and
 * casing — coerce here so the rest of the app still sees the strict types.
 */

function slug(value: unknown): unknown {
  if (typeof value !== "string") return value;
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function asNumberOrNull(value: unknown): unknown {
  if (value === "" || value === undefined || value === "null" || value === "none") {
    return null;
  }
  if (typeof value === "string") {
    const match = value.match(/-?\d+(\.\d+)?/);
    return match ? Number(match[0]) : null;
  }
  return value;
}

function emptyToNull(value: unknown): unknown {
  return value === "" ? null : value;
}

const CATEGORIES = [
  "skill",
  "experience",
  "education",
  "certification",
  "responsibility",
] as const;
const IMPORTANCE = ["required", "preferred", "nice_to_have"] as const;
const VERDICTS = ["met", "partial", "missing"] as const;
const REC_KINDS = ["rewrite", "ask", "deprioritize", "real_gap"] as const;
const STANDOUT_KINDS = ["project", "skill", "credential", "artifact"] as const;

function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | undefined {
  const normalized = slug(value);
  if (typeof normalized !== "string") return undefined;
  return allowed.find((item) => item === normalized);
}

export const RequirementCategorySchema = z.coerce.string().transform((value, ctx) => {
  const match = oneOf(value, CATEGORIES);
  if (match === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Invalid category: ${String(value)}`,
    });
    return z.NEVER;
  }
  return match;
});

export const ImportanceSchema = z.coerce.string().transform((value, ctx) => {
  let normalized = oneOf(value, IMPORTANCE);
  const slugValue = slug(value);
  if (slugValue === "must" || slugValue === "must_have" || slugValue === "mandatory") {
    normalized = "required";
  }
  if (slugValue === "optional" || slugValue === "nice" || slugValue === "bonus") {
    normalized = "nice_to_have";
  }
  if (normalized === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Invalid importance: ${String(value)}`,
    });
    return z.NEVER;
  }
  return normalized;
});

export const VerdictKindSchema = z.coerce.string().transform((value, ctx) => {
  const match = oneOf(value, VERDICTS);
  if (match === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Invalid verdict: ${String(value)}`,
    });
    return z.NEVER;
  }
  return match;
});

export const RequirementSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  category: RequirementCategorySchema,
  importance: ImportanceSchema,
  yearsRequired: z.any().transform((value, ctx) => {
    const next = asNumberOrNull(value);
    if (next !== null && typeof next !== "number") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "yearsRequired must be a number or null",
      });
      return z.NEVER;
    }
    return next;
  }),
});

export const VerdictSchema = z.object({
  requirementId: z.string().min(1),
  verdict: VerdictKindSchema,
  evidenceQuote: z.any().transform((value) => {
    const next = emptyToNull(value);
    return next === null ? null : String(next);
  }),
  reasoning: z.string(),
});

const RecommendationKindSchema = z.coerce.string().transform((value, ctx) => {
  let match = oneOf(value, REC_KINDS);
  const slugValue = slug(value);
  if (slugValue === "rewritten" || slugValue === "reword") match = "rewrite";
  if (slugValue === "question" || slugValue === "ask_user") match = "ask";
  if (slugValue === "cut" || slugValue === "remove") match = "deprioritize";
  if (slugValue === "gap" || slugValue === "realgap") match = "real_gap";
  if (match === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Invalid recommendation kind: ${String(value)}`,
    });
    return z.NEVER;
  }
  return match;
});

export const RecommendationSchema = z
  .object({
    kind: RecommendationKindSchema,
    requirementId: z.string().optional(),
    before: z.string().optional(),
    after: z.string().optional(),
    why: z.string().optional(),
    question: z.string().optional(),
    target: z.string().optional(),
    howToClose: z.string().optional(),
  })
  .transform((item, ctx) => {
    switch (item.kind) {
      case "rewrite":
        if (!item.requirementId || !item.before || !item.after || !item.why) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "rewrite needs requirementId, before, after, why",
          });
          return z.NEVER;
        }
        return {
          kind: "rewrite" as const,
          requirementId: item.requirementId,
          before: item.before,
          after: item.after,
          why: item.why,
        };
      case "ask":
        if (!item.requirementId || !item.question) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "ask needs requirementId and question",
          });
          return z.NEVER;
        }
        return {
          kind: "ask" as const,
          requirementId: item.requirementId,
          question: item.question,
        };
      case "deprioritize":
        if (!item.target || !item.why) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "deprioritize needs target and why",
          });
          return z.NEVER;
        }
        return {
          kind: "deprioritize" as const,
          target: item.target,
          why: item.why,
        };
      case "real_gap":
        if (!item.requirementId || !item.why || !item.howToClose) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "real_gap needs requirementId, why, howToClose",
          });
          return z.NEVER;
        }
        return {
          kind: "real_gap" as const,
          requirementId: item.requirementId,
          why: item.why,
          howToClose: item.howToClose,
        };
    }
  });

export const JobPostingSchema = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  source: z.enum(["greenhouse", "lever", "ashby", "json-ld", "pasted"]),
  sourceLabel: z.string().min(1),
});

export const StandoutKindSchema = z.coerce.string().transform((value, ctx) => {
  let match = oneOf(value, STANDOUT_KINDS);
  const slugValue = slug(value);
  if (slugValue === "cert" || slugValue === "certification" || slugValue === "course") {
    match = "credential";
  }
  if (
    slugValue === "github" ||
    slugValue === "demo" ||
    slugValue === "portfolio" ||
    slugValue === "writeup"
  ) {
    match = "artifact";
  }
  if (match === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Invalid standout kind: ${String(value)}`,
    });
    return z.NEVER;
  }
  return match;
});

export const StandoutSuggestionSchema = z.object({
  kind: StandoutKindSchema,
  title: z.string().min(1),
  why: z.string().min(1),
  how: z.string().min(1),
  requirementId: z.any().transform((value) => {
    const next = emptyToNull(value);
    return next === null ? null : String(next);
  }),
});

export const AnalysisSchema = z.object({
  job: JobPostingSchema,
  resumeFilename: z.string().min(1),
  resumeText: z.string(),
  requirements: z.array(RequirementSchema),
  verdicts: z.array(VerdictSchema),
  recommendations: z.array(RecommendationSchema),
  standouts: z.array(StandoutSuggestionSchema),
  omitted: z.array(
    z.object({
      text: z.string(),
      reason: z.string(),
    }),
  ),
});

export const ExtractRequirementsResponseSchema = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  requirements: z.array(RequirementSchema).min(1),
});

/** Pass 1 of extract: a bullet list only. Small models break JSON when they also classify. */
export const ExtractBulletsResponseSchema = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  bullets: z.array(z.string().min(1)).min(1),
});

/** Pass 2 of extract: category / importance / years on already-extracted bullets. */
export const ExtractStructureResponseSchema = z.object({
  requirements: z.array(RequirementSchema).min(1),
});

export const JudgeVerdictsResponseSchema = z.object({
  verdicts: z.array(VerdictSchema),
});

export const GenerateRecommendationsResponseSchema = z.object({
  recommendations: z.array(RecommendationSchema),
});

export const GenerateStandoutsResponseSchema = z.object({
  standouts: z.array(StandoutSuggestionSchema).min(1).max(6),
});
