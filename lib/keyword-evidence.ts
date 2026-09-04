import type { Requirement, Verdict } from "./types";

/**
 * Named products count as the generic skill. A local model often looks for
 * the word "database" and ignores PostgreSQL / MongoDB sitting in the file.
 *
 * Also used as a pre-filter: obvious hits are credited before the LLM so the
 * model only settles partials and ambiguous rows.
 */

interface Family {
  requirement: RegExp;
  needles: string[];
}

const FAMILIES: Family[] = [
  {
    requirement:
      /\b(database|databases|rdbms|nosql|sql|data layer|datastore|data store|persistence)\b/i,
    needles: [
      "postgresql",
      "postgres",
      "mongodb",
      "mongo",
      "mysql",
      "mariadb",
      "sqlite",
      "dynamodb",
      "sql",
      "redis",
      "rds",
      "aurora",
      "cassandra",
      "elasticsearch",
      "cosmos",
      "firestore",
      "supabase",
    ],
  },
  {
    requirement: /\b(cloud)\b/i,
    needles: [
      "aws",
      "amazon web services",
      "azure",
      "gcp",
      "google cloud",
      "s3",
      "ec2",
      "lambda",
    ],
  },
  {
    requirement: /\b(container|docker|kubernetes|k8s|orchestration)\b/i,
    needles: ["docker", "kubernetes", "k8s", "container"],
  },
  {
    requirement: /\b(ci\/?cd|continuous integration|github actions|jenkins)\b/i,
    needles: ["github actions", "jenkins", "ci/cd", "gitlab ci"],
  },
  {
    requirement:
      /\b(degree|bachelor'?s?|master'?s?|phd|doctorate|b\.s\.?|m\.s\.?|bsc|msc)\b/i,
    needles: [
      "bachelor",
      "bachelor's",
      "b.s.",
      "b.s",
      "master",
      "master's",
      "m.s.",
      "m.s",
      "phd",
      "doctorate",
      "mba",
      "bsc",
      "msc",
    ],
  },
];

const STOPWORDS = new Set([
  "the",
  "and",
  "with",
  "from",
  "that",
  "this",
  "for",
  "experience",
  "knowledge",
  "familiarity",
  "required",
  "preferred",
  "using",
  "strong",
  "years",
  "year",
  "ability",
  "able",
  "working",
  "work",
  "including",
  "such",
  "plus",
  "related",
  "equivalent",
  "minimum",
  "must",
  "have",
  "has",
  "been",
  "least",
  "more",
  "than",
  "over",
  "under",
  "into",
  "onto",
  "your",
  "our",
  "their",
  "will",
  "should",
  "would",
  "could",
  "proficiency",
  "proficient",
  "understanding",
  "demonstrated",
  "hands",
  "etc",
  "via",
  "per",
  "any",
  "all",
  "both",
  "either",
  "software",
  "engineering",
  "engineer",
  "developer",
  "development",
  "team",
  "environment",
  "technologies",
  "technology",
  "tools",
  "tool",
  "skills",
  "skill",
  "building",
  "build",
  "design",
  "designing",
  "systems",
  "system",
  "applications",
  "application",
  "services",
  "service",
]);

/** Tokens too short for a generic substring, but real skills when they are whole words. */
const SHORT_WHITELIST = new Set([
  "go",
  "aws",
  "sql",
  "css",
  "gcp",
  "k8s",
  "c++",
  "c#",
  "s3",
]);

function normalize(input: string): string {
  return input.toLowerCase().replace(/\s+/g, " ");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function lineContaining(resumeText: string, needle: string): string | null {
  const haystack = normalize(needle);
  if (haystack.length < 2) return null;
  const line = resumeText.split(/\r?\n/).find((entry) =>
    normalize(entry).includes(haystack),
  );
  return line?.trim() || null;
}

function wholeWordInResume(resumeText: string, token: string): string | null {
  const pattern = new RegExp(
    `(^|[^a-z0-9+#])${escapeRegExp(token)}([^a-z0-9+#]|$)`,
    "i",
  );
  const line = resumeText.split(/\r?\n/).find((entry) => pattern.test(entry));
  return line?.trim() || null;
}

export function namedSkillsInResume(resumeText: string): string[] {
  const found = new Set<string>();
  for (const family of FAMILIES) {
    for (const needle of family.needles) {
      if (lineContaining(resumeText, needle) !== null) found.add(needle);
    }
  }
  return [...found];
}

function needlesFor(requirementText: string): string[] {
  const extra: string[] = [];
  for (const family of FAMILIES) {
    if (family.requirement.test(requirementText)) {
      extra.push(...family.needles);
    }
  }
  return extra;
}

const TOKEN_ALIASES: Record<string, string[]> = {
  go: ["golang"],
  aws: ["amazon web services"],
  gcp: ["google cloud"],
  k8s: ["kubernetes"],
  postgresql: ["postgres"],
  postgres: ["postgresql"],
  mongodb: ["mongo"],
  mongo: ["mongodb"],
};

function distinctiveTokens(requirementText: string): string[] {
  const raw = requirementText.match(/[A-Za-z][A-Za-z0-9+#.]{1,}/g) ?? [];
  const tokens: string[] = [];
  for (const piece of raw) {
    const token = piece.replace(/\.+$/, "").toLowerCase();
    if (STOPWORDS.has(token)) continue;
    if (token.length >= 4 || SHORT_WHITELIST.has(token)) {
      tokens.push(token);
    }
  }
  return [...new Set(tokens)];
}

function quoteFromLine(line: string, needle: string): string {
  const at = normalize(line).indexOf(normalize(needle));
  if (at === -1) return line;
  const start = Math.max(0, at - 12);
  const end = Math.min(line.length, at + needle.length + 24);
  return line.slice(start, end).trim();
}

function hitForRequirement(
  requirement: Requirement,
  resumeText: string,
): { needle: string; line: string } | null {
  for (const needle of needlesFor(requirement.text)) {
    const line =
      needle.length <= 3
        ? wholeWordInResume(resumeText, needle)
        : lineContaining(resumeText, needle);
    if (line !== null) return { needle, line };
  }

  for (const token of distinctiveTokens(requirement.text)) {
    const candidates = [token, ...(TOKEN_ALIASES[token] ?? [])];
    for (const candidate of candidates) {
      const line = wholeWordInResume(resumeText, candidate);
      if (line !== null) return { needle: candidate, line };
    }
  }

  return null;
}

function metVerdict(
  requirementId: string,
  needle: string,
  line: string,
  reasoning: string,
): Verdict {
  return {
    requirementId,
    verdict: "met",
    evidenceQuote: quoteFromLine(line, needle),
    reasoning,
  };
}

/**
 * Credit obvious named skills / tokens before the model runs. Remaining rows
 * (partials, years, adjacent skills) go to the LLM.
 */
export function prefilterObviousHits(
  requirements: Requirement[],
  resumeText: string,
): { settled: Verdict[]; unsettled: Requirement[] } {
  const settled: Verdict[] = [];
  const unsettled: Requirement[] = [];

  for (const requirement of requirements) {
    const hit = hitForRequirement(requirement, resumeText);
    if (hit === null) {
      unsettled.push(requirement);
      continue;
    }
    settled.push(
      metVerdict(
        requirement.id,
        hit.needle,
        hit.line,
        `Keyword match: the résumé names ${hit.needle}.`,
      ),
    );
  }

  return { settled, unsettled };
}

/**
 * If the résumé already names a concrete tool that satisfies a generic
 * requirement, credit it — even when the model missed it.
 */
export function applyNamedSkillEvidence(
  requirements: Requirement[],
  verdicts: Verdict[],
  resumeText: string,
): Verdict[] {
  const byId = new Map(verdicts.map((verdict) => [verdict.requirementId, verdict]));

  return requirements.map((requirement) => {
    const existing = byId.get(requirement.id) ?? {
      requirementId: requirement.id,
      verdict: "missing" as const,
      evidenceQuote: null,
      reasoning: "",
    };

    if (existing.verdict === "met" && existing.evidenceQuote) {
      return existing;
    }

    const hit = hitForRequirement(requirement, resumeText);
    if (hit === null) return existing;

    return metVerdict(
      requirement.id,
      hit.needle,
      hit.line,
      `The résumé names ${hit.needle}, which satisfies this requirement without needing the generic word.`,
    );
  });
}
