import { chatJson, throwIfAborted } from "./ollama";
import {
  EXTRACT_BULLETS_JSON_SCHEMA,
  EXTRACT_STRUCTURE_JSON_SCHEMA,
  JUDGE_JSON_SCHEMA,
  RECOMMEND_JSON_SCHEMA,
  STANDOUT_JSON_SCHEMA,
} from "./json-schemas";
import {
  ExtractBulletsResponseSchema,
  ExtractStructureResponseSchema,
  GenerateRecommendationsResponseSchema,
  GenerateStandoutsResponseSchema,
  JudgeVerdictsResponseSchema,
} from "./schemas";
import {
  applyNamedSkillEvidence,
  namedSkillsInResume,
  prefilterObviousHits,
} from "./keyword-evidence";
import { keepTechnicalRequirements } from "./technical-filter";
import type {
  JobPosting,
  OmittedRequirement,
  Recommendation,
  Requirement,
  StandoutSuggestion,
  Verdict,
} from "./types";

export { parseResume } from "./parse-resume";

const JUDGE_CHUNK_SIZE = 5;

const EXTRACT_BULLETS_PROMPT = `You extract hiring requirements from a job posting that can be checked against a résumé.

Return JSON only, shaped as:
{
  "title": "job title",
  "company": "company name",
  "bullets": ["one distinct technical requirement, as a short phrase", "..."]
}

Include only things a résumé can show with a quoted line:
- languages, frameworks, tools, platforms, cloud, data, security engineering
- years in a technical role, domain, or stack
- degrees, technical certifications
- concrete job responsibilities (build X, operate Y, own Z)

Do NOT include anything decided in an interview or by HR logistics:
- verbal / oral / written communication, interpersonal or "soft" skills
- team player, self-starter, passion, culture fit, attitude
- on-site, hybrid office days, remote policy, commute, relocation, travel %
- citizenship, visa, or generic work authorization (clearance listed as a cert is OK)
- available to start, intern/co-op term dates, "16 weeks between…", start windows

Rules:
- Split compound bullets into separate strings.
- Do not assign categories, importance, or ids. Text only.
- If the company is not named, use "Unknown".
- If the input is a URL or is too thin to be a posting, still return JSON with whatever technical requirements you can infer.`;

const EXTRACT_STRUCTURE_PROMPT = `You classify already-extracted job requirements.

Return JSON only, shaped as:
{
  "requirements": [
    {
      "id": "r1",
      "text": "copy the bullet unchanged",
      "category": "skill" | "experience" | "education" | "certification" | "responsibility",
      "importance": "required" | "preferred" | "nice_to_have",
      "yearsRequired": number or null
    }
  ]
}

Rules:
- One object per input bullet, same order. Copy the text exactly.
- Give stable ids r1, r2, r3… in order.
- Prefer "required" when the posting uses must / required / minimum.
- yearsRequired is a number of years, or null if none is stated.
- Do not add, drop, or rewrite bullets.`;

const JUDGE_PROMPT = `You judge a résumé against a small list of requirements.

Return JSON only, shaped as:
{
  "verdicts": [
    {
      "requirementId": "r1",
      "verdict": "met" | "partial" | "missing",
      "evidenceQuote": "verbatim substring from the résumé, or null",
      "reasoning": "one or two sentences"
    }
  ]
}

Rules:
- One verdict per requirement. Use the given requirementId. Do not invent ids.
- Judge only the requirements in this request. Do not skip any.
- evidenceQuote must be copied character-for-character from the résumé. Do not paraphrase. Do not invent lines.
- If you cannot find a supporting line, set verdict to "missing" and evidenceQuote to null.
- "partial" is for related but incomplete evidence (wrong years, adjacent skill, implied not stated).
- "met" requires a quote that actually supports the requirement.
- Named products count. PostgreSQL, MongoDB, DynamoDB, MySQL, SQLite, Redis, or SQL in a skills list or a bullet IS familiarity with databases. Do not require the word "database".
- The same rule applies to other generics: AWS/S3 is cloud; Docker is containers; GitHub Actions is CI.
- These items are already technical. Do not invent communication, on-site, or culture verdicts.`;

const RECOMMEND_PROMPT = `You suggest résumé changes from judged requirements.

Return JSON only, shaped as:
{
  "recommendations": [ /* mix of the four kinds below */ ]
}

Kinds:
- rewrite: { "kind": "rewrite", "requirementId", "before", "after", "why" }
  Only when the résumé already contains the facts. before must be a real line from the résumé. after reorders those facts; it must not add employers, titles, tools, or numbers that are not already in the résumé.
- ask: { "kind": "ask", "requirementId", "question" }
  When the requirement might be true but the file does not show it. Ask the candidate. Do not write the claim for them.
- deprioritize: { "kind": "deprioritize", "target", "why" }
  A line or topic that does not help this posting.
- real_gap: { "kind": "real_gap", "requirementId", "why", "howToClose" }
  The gap is real. howToClose is what they would need to do in the world, not a résumé trick.

Do not invent experience. Prefer ask or real_gap over a rewrite that adds facts.
Do not recommend adding "strong communication" or "willing to work on site" — those are not résumé facts.`;

const STANDOUT_PROMPT = `You suggest technical things a candidate could add so they stand out for this posting. These items are not on the résumé yet.

Return JSON only, shaped as:
{
  "standouts": [
    {
      "kind": "project" | "skill" | "credential" | "artifact",
      "title": "short name of the thing to add",
      "why": "why a reviewer in this pool would notice it, tied to this posting",
      "how": "a concrete next step they can finish in days or weeks, not years",
      "requirementId": "r1 or null"
    }
  ]
}

Kinds:
- project: something to build (repo, demo, small system) that proves a missing or thin requirement.
- skill: a named tool or technique to practise and then list, only if the posting cares.
- credential: a specific cert or course, only when the posting names one or an industry equivalent.
- artifact: a public write-up, architecture note, or live demo of work they could produce.

Rules:
- Return 3 to 5 items. Mix kinds. Prefer at least one project.
- Ground every item in a missing or partial requirement, or in a preferred skill the file barely shows.
- Do not invent that they already did it. This is a to-do list, not a résumé rewrite.
- Do not suggest communication, culture, on-site, or availability.
- Do not suggest generic "contribute to open source" with no stack.
- Keep how specific: a scoped project, a dataset, an API, a cert name.
- requirementId must be one of the given ids, or null.`;

function chunkItems<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function fallbackStructure(bullets: string[]): Requirement[] {
  return bullets.map((text, index) => ({
    id: `r${index + 1}`,
    text,
    category: "skill" as const,
    importance: "required" as const,
    yearsRequired: null,
  }));
}

function alignStructure(bullets: string[], structured: Requirement[]): Requirement[] {
  return bullets.map((text, index) => {
    const row = structured[index];
    return {
      id: `r${index + 1}`,
      text,
      category: row?.category ?? "skill",
      importance: row?.importance ?? "required",
      yearsRequired: row?.yearsRequired ?? null,
    };
  });
}

export async function extractRequirements(jobText: string): Promise<{
  job: Pick<JobPosting, "title" | "company">;
  requirements: Requirement[];
  omitted: OmittedRequirement[];
}> {
  throwIfAborted();
  const bulletsResult = await chatJson(
    ExtractBulletsResponseSchema,
    EXTRACT_BULLETS_PROMPT,
    jobText,
    EXTRACT_BULLETS_JSON_SCHEMA,
  );

  throwIfAborted();
  let structured: Requirement[];
  try {
    const classified = await chatJson(
      ExtractStructureResponseSchema,
      EXTRACT_STRUCTURE_PROMPT,
      JSON.stringify({
        title: bulletsResult.title,
        company: bulletsResult.company,
        bullets: bulletsResult.bullets,
      }),
      EXTRACT_STRUCTURE_JSON_SCHEMA,
    );
    structured = alignStructure(
      bulletsResult.bullets,
      classified.requirements as Requirement[],
    );
  } catch {
    structured = fallbackStructure(bulletsResult.bullets);
  }

  const { kept, omitted } = keepTechnicalRequirements(structured);
  if (kept.length === 0) {
    throw new Error(
      "No résumé-checkable technical requirements were found in that posting.",
    );
  }
  return {
    job: { title: bulletsResult.title, company: bulletsResult.company },
    requirements: kept,
    omitted,
  };
}

async function judgeChunk(
  resumeText: string,
  requirements: Requirement[],
): Promise<Verdict[]> {
  throwIfAborted();
  const result = await chatJson(
    JudgeVerdictsResponseSchema,
    JUDGE_PROMPT,
    JSON.stringify({
      resume: resumeText,
      namedSkillsFoundInResume: namedSkillsInResume(resumeText),
      requirements: requirements.map((item) => ({
        id: item.id,
        text: item.text,
        category: item.category,
        importance: item.importance,
        yearsRequired: item.yearsRequired,
      })),
    }),
    JUDGE_JSON_SCHEMA,
  );
  return result.verdicts as Verdict[];
}

function mergeVerdicts(
  requirements: Requirement[],
  parts: Verdict[],
): Verdict[] {
  const byId = new Map(parts.map((verdict) => [verdict.requirementId, verdict]));
  return requirements.map(
    (requirement) =>
      byId.get(requirement.id) ?? {
        requirementId: requirement.id,
        verdict: "missing" as const,
        evidenceQuote: null,
        reasoning: "No verdict was returned for this requirement.",
      },
  );
}

export async function judgeRequirements(
  resumeText: string,
  requirements: Requirement[],
  options: { skipPrefilter?: boolean } = {},
): Promise<Verdict[]> {
  const settled: Verdict[] = [];
  let remaining = requirements;

  if (!options.skipPrefilter) {
    const filtered = prefilterObviousHits(requirements, resumeText);
    settled.push(...filtered.settled);
    remaining = filtered.unsettled;
  }

  const judged: Verdict[] = [...settled];
  for (const group of chunkItems(remaining, JUDGE_CHUNK_SIZE)) {
    judged.push(...(await judgeChunk(resumeText, group)));
  }

  return applyNamedSkillEvidence(requirements, mergeVerdicts(requirements, judged), resumeText);
}

/** Second judge pass for rows whose quotes failed verification. */
export async function rejudgeRequirements(
  resumeText: string,
  requirements: Requirement[],
  previous: Verdict[],
  retryIds: string[],
): Promise<Verdict[]> {
  const retrySet = new Set(retryIds);
  const retryRows = requirements.filter((item) => retrySet.has(item.id));
  if (retryRows.length === 0) return previous;

  const retried = await judgeRequirements(resumeText, retryRows, {
    skipPrefilter: true,
  });
  const byId = new Map(previous.map((verdict) => [verdict.requirementId, verdict]));
  for (const verdict of retried) {
    byId.set(verdict.requirementId, verdict);
  }
  return mergeVerdicts(requirements, [...byId.values()]);
}

export async function generateRecommendations(
  resumeText: string,
  requirements: Requirement[],
  verdicts: Verdict[],
): Promise<Recommendation[]> {
  throwIfAborted();
  const result = await chatJson(
    GenerateRecommendationsResponseSchema,
    RECOMMEND_PROMPT,
    JSON.stringify({ resume: resumeText, requirements, verdicts }),
    RECOMMEND_JSON_SCHEMA,
  );
  return result.recommendations as Recommendation[];
}

export async function suggestStandouts(
  resumeText: string,
  job: Pick<JobPosting, "title" | "company">,
  requirements: Requirement[],
  verdicts: Verdict[],
): Promise<StandoutSuggestion[]> {
  throwIfAborted();
  const result = await chatJson(
    GenerateStandoutsResponseSchema,
    STANDOUT_PROMPT,
    JSON.stringify({
      job,
      resume: resumeText,
      requirements: requirements.map((item) => ({
        id: item.id,
        text: item.text,
        category: item.category,
        importance: item.importance,
      })),
      verdicts: verdicts.map((item) => ({
        requirementId: item.requirementId,
        verdict: item.verdict,
      })),
    }),
    STANDOUT_JSON_SCHEMA,
  );
  const ids = new Set(requirements.map((item) => item.id));
  return result.standouts.map((item) => ({
    kind: item.kind,
    title: item.title,
    why: item.why,
    how: item.how,
    requirementId:
      item.requirementId !== null && ids.has(item.requirementId)
        ? item.requirementId
        : null,
  })) as StandoutSuggestion[];
}
