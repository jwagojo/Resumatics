import type { CSSProperties } from "react";
import {
  IMPORTANCE_LABEL,
  type Recommendation,
  type Requirement,
} from "@/lib/types";

/**
 * Kept in its own calmer section, on a tinted surface with no accent and no
 * copy buttons. These are the gaps rewording will not close, and they should
 * read as honest advice rather than as failures to fix.
 */
export function RealGaps({
  recommendations,
  requirements,
}: {
  recommendations: Recommendation[];
  requirements: Requirement[];
}) {
  const gaps = recommendations.filter((item) => item.kind === "real_gap");
  if (gaps.length === 0) return null;

  return (
    <section className="rise mt-2xl border-y border-rule bg-paper-2">
      <div className="shell py-2xl">
        <h2 className="font-display text-display-s font-medium">
          Gaps that are real
        </h2>
        <p className="mt-2xs max-w-[58ch] text-sm text-neutral">
          No phrasing closes these. They are listed so you can decide whether to
          apply anyway, and so nothing in the section above pretends they are
          not there.
        </p>

        <div className="mt-lg grid gap-lg md:grid-cols-2">
          {gaps.map((item, index) => {
            if (item.kind !== "real_gap") return null;
            const requirement = requirements.find(
              (candidate) => candidate.id === item.requirementId,
            );

            return (
              <article
                key={`gap-${index}`}
                className="rise min-w-0 border-t border-rule-2 pt-md"
                style={{ "--i": index } as CSSProperties}
              >
                {/* Importance sits under the heading, not beside it — a label
                 * parked in its own column next to a head is the templated
                 * editorial move. */}
                <h3 className="font-display text-base font-medium">
                  {requirement?.text ?? item.requirementId}
                </h3>
                {requirement !== undefined && (
                  <p className="mt-3xs text-xs text-muted">
                    {IMPORTANCE_LABEL[requirement.importance]}
                  </p>
                )}

                <p className="mt-xs max-w-[54ch] text-sm text-ink-2">
                  {item.why}
                </p>

                <p className="mt-sm max-w-[54ch] text-sm text-neutral">
                  <span className="label-mono">Worth doing</span>
                  <span className="mt-2xs block">{item.howToClose}</span>
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
