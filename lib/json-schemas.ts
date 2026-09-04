/** JSON Schema passed to Ollama `format` so the model is constrained at decode time. */

export const EXTRACT_BULLETS_JSON_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    company: { type: "string" },
    bullets: {
      type: "array",
      minItems: 1,
      items: { type: "string" },
    },
  },
  required: ["title", "company", "bullets"],
} as const;

export const EXTRACT_STRUCTURE_JSON_SCHEMA = {
  type: "object",
  properties: {
    requirements: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          text: { type: "string" },
          category: {
            type: "string",
            enum: [
              "skill",
              "experience",
              "education",
              "certification",
              "responsibility",
            ],
          },
          importance: {
            type: "string",
            enum: ["required", "preferred", "nice_to_have"],
          },
          yearsRequired: { type: ["number", "null"] },
        },
        required: ["id", "text", "category", "importance", "yearsRequired"],
      },
    },
  },
  required: ["requirements"],
} as const;

export const EXTRACT_JSON_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    company: { type: "string" },
    requirements: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          text: { type: "string" },
          category: {
            type: "string",
            enum: [
              "skill",
              "experience",
              "education",
              "certification",
              "responsibility",
            ],
          },
          importance: {
            type: "string",
            enum: ["required", "preferred", "nice_to_have"],
          },
          yearsRequired: { type: ["number", "null"] },
        },
        required: ["id", "text", "category", "importance", "yearsRequired"],
      },
    },
  },
  required: ["title", "company", "requirements"],
} as const;

export const JUDGE_JSON_SCHEMA = {
  type: "object",
  properties: {
    verdicts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          requirementId: { type: "string" },
          verdict: { type: "string", enum: ["met", "partial", "missing"] },
          evidenceQuote: { type: ["string", "null"] },
          reasoning: { type: "string" },
        },
        required: ["requirementId", "verdict", "evidenceQuote", "reasoning"],
      },
    },
  },
  required: ["verdicts"],
} as const;

export const RECOMMEND_JSON_SCHEMA = {
  type: "object",
  properties: {
    recommendations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          kind: {
            type: "string",
            enum: ["rewrite", "ask", "deprioritize", "real_gap"],
          },
          requirementId: { type: "string" },
          before: { type: "string" },
          after: { type: "string" },
          why: { type: "string" },
          question: { type: "string" },
          target: { type: "string" },
          howToClose: { type: "string" },
        },
        required: ["kind"],
      },
    },
  },
  required: ["recommendations"],
} as const;

export const STANDOUT_JSON_SCHEMA = {
  type: "object",
  properties: {
    standouts: {
      type: "array",
      minItems: 1,
      maxItems: 6,
      items: {
        type: "object",
        properties: {
          kind: {
            type: "string",
            enum: ["project", "skill", "credential", "artifact"],
          },
          title: { type: "string" },
          why: { type: "string" },
          how: { type: "string" },
          requirementId: { type: ["string", "null"] },
        },
        required: ["kind", "title", "why", "how", "requirementId"],
      },
    },
  },
  required: ["standouts"],
} as const;
