import type { OmittedRequirement } from "./types";

/**
 * Requirements a résumé cannot honestly prove. Soft skills, culture, and
 * logistics belong in an interview, not in the score.
 */

const KEEP_EXCEPTIONS: RegExp[] = [
  /\bhybrid (cloud|architecture|application|app|mobile|rendering|approach)\b/i,
  /\bremote (sensing|procedure|debugging|desktop|api)\b/i,
  /\btechnical writing\b/i,
  /\b(?:api|sdk|system) documentation\b/i,
  /\bhigh availability\b/i,
  /\bavailability zone\b/i,
];

const SKIP: { pattern: RegExp; reason: string }[] = [
  {
    pattern:
      /\b(excellent|strong|outstanding|solid|good|effective)?\s*(verbal|oral|written)?\s*communication skills\b/i,
    reason: "Communication style is judged in conversation, not on a résumé.",
  },
  {
    pattern: /\b(verbal|oral) (communication|skills)\b/i,
    reason: "Verbal skill is an interview signal.",
  },
  {
    pattern: /\bwritten communication\b/i,
    reason: "General writing ability is not a technical résumé check.",
  },
  {
    pattern: /\b(interpersonal|people|soft) skills\b/i,
    reason: "Interpersonal skill is an interview signal.",
  },
  {
    pattern: /\bpresentation skills\b|\bpublic speaking\b/i,
    reason: "Presentation skill is an interview signal.",
  },
  {
    pattern: /\bteam player\b|\bworks? well with others\b|\bability to work in a team\b/i,
    reason: "Team fit is an interview signal.",
  },
  {
    pattern: /\bability to work independently\b|\bself-?starter\b|\bself-?motivated\b/i,
    reason: "Work style is an interview signal.",
  },
  {
    pattern: /\bpassion(ate)?\b|\bpositive attitude\b|\bculture fit\b/i,
    reason: "Attitude and culture fit are interview signals.",
  },
  {
    pattern: /\bdetail-?oriented\b|\bmulti-?task/i,
    reason: "Generic work-habit language is not scored from a résumé.",
  },
  {
    pattern: /\bwork under pressure\b|\bfast[ -]paced environment\b/i,
    reason: "Environment preference is not a résumé technical check.",
  },
  {
    pattern: /\bon[ -]?site\b|\bin[ -]?office\b|\bin[ -]?person\b/i,
    reason: "On-site presence is logistics, not résumé evidence.",
  },
  {
    pattern: /\bhybrid\b.{0,40}\b(work|office|schedule|days?|week)\b/i,
    reason: "Office hybrid policy is logistics.",
  },
  {
    pattern: /\b\d+\s*days?\s*(a|per)\s*week\s*(in|on|at)\b/i,
    reason: "Office days are logistics.",
  },
  {
    pattern: /\b(fully )?remote work\b|\bwork from home\b|\bwfh\b/i,
    reason: "Remote policy is logistics.",
  },
  {
    pattern: /\brelocat|\bcommute\b|\bmust be (located|based|present|willing to move)\b/i,
    reason: "Location is logistics.",
  },
  {
    pattern: /\bwilling to travel\b|\btravel\s*(\d+\s*%|required|up to)\b/i,
    reason: "Travel is logistics.",
  },
  {
    pattern: /\b(us|u\.s\.) citizen|\bwork authorization\b|\bvisa\b|\bclearance not required\b/i,
    reason: "Eligibility is HR screening, not a technical résumé match.",
  },
  {
    pattern: /\bavailable to (start|work|begin|join)\b/i,
    reason: "Start-date and term availability are logistics, not résumé evidence.",
  },
  {
    pattern: /\b(start|begin) (date|full[ -]?time)\b/i,
    reason: "Start date is logistics.",
  },
  {
    pattern:
      /\b(full[ -]?time|internship|co-?op)\b.{0,60}\b(between|from)\b.{0,40}\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4})\b/i,
    reason: "Internship or term windows are logistics.",
  },
  {
    pattern: /\b\d+\s*weeks?\s+(between|from|during)\b/i,
    reason: "Term length and dates are logistics.",
  },
  {
    pattern: /\bmust be available\b|\bability to start\b|\bwilling to start\b/i,
    reason: "Availability is confirmed when you apply, not from a résumé.",
  },
];

export function interviewOrLogisticsReason(text: string): string | null {
  if (KEEP_EXCEPTIONS.some((pattern) => pattern.test(text))) return null;
  for (const rule of SKIP) {
    if (rule.pattern.test(text)) return rule.reason;
  }
  return null;
}

export function keepTechnicalRequirements<T extends { id: string; text: string }>(
  requirements: T[],
): { kept: T[]; omitted: OmittedRequirement[] } {
  const omitted: OmittedRequirement[] = [];
  const kept: T[] = [];

  for (const requirement of requirements) {
    const reason = interviewOrLogisticsReason(requirement.text);
    if (reason !== null) {
      omitted.push({ text: requirement.text, reason });
      continue;
    }
    kept.push(requirement);
  }

  const renumbered = kept.map((requirement, index) => ({
    ...requirement,
    id: `r${index + 1}`,
  }));

  return {
    kept: renumbered,
    omitted,
  };
}
