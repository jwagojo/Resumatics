"use client";

import { useMemo, useState, type CSSProperties } from "react";
import {
  CATEGORY_LABEL,
  IMPORTANCE_LABEL,
  VERDICT_GLYPH,
  VERDICT_LABEL,
  type Requirement,
  type VerdictKind,
} from "@/lib/types";
import type { VerifiedVerdict } from "@/lib/evidence";
import { IMPORTANCE_WEIGHT, VERDICT_CREDIT, formatWeight } from "@/lib/score";

type Filter = "all" | VerdictKind;

/** Wraps the quoted span inside its resume line so the match is visible in context. */
function highlight(line: string, quote: string) {
  const at = line.toLowerCase().indexOf(quote.toLowerCase().trim());
  if (at === -1) return <>{line}</>;
  return (
    <>
      {line.slice(0, at)}
      <mark className="bg-accent-quiet text-ink decoration-clone">
        {line.slice(at, at + quote.trim().length)}
      </mark>
      {line.slice(at + quote.trim().length)}
    </>
  );
}

/**
 * Feature archetype F3 — tabular spec sheet. Hairline rules between rows,
 * tabular figures, one row per requirement.
 *
 * Expanding a row is the whole point of the product: it shows the exact line
 * of the résumé that earned the credit, so the score is auditable rather than
 * taken on faith.
 */
export function RequirementTable({
  requirements,
  verdicts,
}: {
  requirements: Requirement[];
  verdicts: VerifiedVerdict[];
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(new Set());

  const verdictById = useMemo(
    () => new Map(verdicts.map((verdict) => [verdict.requirementId, verdict])),
    [verdicts],
  );

  const counts = useMemo(() => {
    const tally: Record<VerdictKind, number> = { met: 0, partial: 0, missing: 0 };
    for (const verdict of verdicts) tally[verdict.verdict] += 1;
    return tally;
  }, [verdicts]);

  const rows = requirements.filter((requirement) => {
    if (filter === "all") return true;
    return verdictById.get(requirement.id)?.verdict === filter;
  });

  function toggle(id: string) {
    setOpenIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filters: { value: Filter; label: string; count: number }[] = [
    { value: "all", label: "All", count: requirements.length },
    { value: "met", label: VERDICT_LABEL.met, count: counts.met },
    { value: "partial", label: VERDICT_LABEL.partial, count: counts.partial },
    { value: "missing", label: VERDICT_LABEL.missing, count: counts.missing },
  ];

  return (
    <section className="rise shell pt-2xl">
      <div className="flex flex-wrap items-end justify-between gap-md">
        <div>
          <h2 className="font-display text-display-s font-medium">
            Requirement by requirement
          </h2>
          <p className="mt-2xs max-w-[52ch] text-sm text-neutral">
            Open any row to see the line of your résumé that earned it, and the
            weight it contributed.
          </p>
        </div>

        <div
          role="group"
          aria-label="Filter by verdict"
          className="flex flex-wrap items-center gap-3xs rounded-control border border-rule bg-paper-2 p-3xs"
        >
          {filters.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={filter === option.value}
              onClick={() => setFilter(option.value)}
              className="seg"
            >
              {option.label}
              <span className="seg__count numeric">{option.count}</span>
            </button>
          ))}
        </div>
      </div>

      <ul className="mt-lg border-t border-rule">
        {rows.map((requirement, index) => {
          const verdict = verdictById.get(requirement.id);
          if (verdict === undefined) return null;

          const isOpen = openIds.has(requirement.id);
          const weight = IMPORTANCE_WEIGHT[requirement.importance];
          const earned = weight * VERDICT_CREDIT[verdict.verdict];
          const panelId = `evidence-${requirement.id}`;

          return (
            <li
              key={requirement.id}
              className="rise border-b border-rule"
              style={{ "--i": Math.min(index, 12) } as CSSProperties}
            >
              <h3>
                <button
                  type="button"
                  onClick={() => toggle(requirement.id)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  className="group flex w-full items-start gap-sm py-md text-left transition-colors duration-(--dur-micro) ease-out hover:bg-paper-2 active:bg-paper-3 sm:gap-md"
                >
                  <span
                    aria-hidden="true"
                    data-verdict={verdict.verdict}
                    className="mt-3xs w-[1ch] shrink-0 font-mono text-sm data-[verdict=met]:text-verdict-met data-[verdict=missing]:text-verdict-missing data-[verdict=partial]:text-verdict-partial"
                  >
                    {VERDICT_GLYPH[verdict.verdict]}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span
                      data-verdict={verdict.verdict}
                      className="block font-display text-base data-[verdict=met]:font-medium data-[verdict=met]:text-verdict-met data-[verdict=missing]:text-verdict-missing data-[verdict=partial]:font-medium data-[verdict=partial]:text-verdict-partial"
                    >
                      {requirement.text}
                    </span>
                    <span className="mt-2xs flex flex-wrap items-center gap-x-xs gap-y-3xs text-xs text-muted">
                      <span>{IMPORTANCE_LABEL[requirement.importance]}</span>
                      <span aria-hidden="true" className="text-faint">
                        ·
                      </span>
                      <span>{CATEGORY_LABEL[requirement.category]}</span>
                      <span aria-hidden="true" className="text-faint">
                        ·
                      </span>
                      <span className="numeric">
                        {VERDICT_LABEL[verdict.verdict]}
                      </span>
                      {!verdict.evidenceVerified && (
                        <span className="chip" data-tone="warn">
                          Quote not found
                        </span>
                      )}
                    </span>
                  </span>

                  <span className="numeric mt-3xs shrink-0 text-right font-mono text-xs text-neutral">
                    {formatWeight(earned)}
                    <span className="text-muted">/{formatWeight(weight)}</span>
                  </span>

                  <span
                    aria-hidden="true"
                    data-open={isOpen}
                    className="mt-3xs shrink-0 font-mono text-xs text-muted transition-transform duration-(--dur-short) ease-out data-[open=true]:rotate-90"
                  >
                    ›
                  </span>
                </button>
              </h3>

              <div id={panelId} className="disclose" data-open={isOpen}>
                <div>
                  <div className="grid gap-md pb-lg pl-[calc(1ch+var(--space-sm))] sm:pl-[calc(1ch+var(--space-md))]">
                    {verdict.evidenceVerified && verdict.evidenceLine !== null && verdict.evidenceQuote !== null ? (
                      <figure>
                        <figcaption className="label-mono">
                          Evidence, in context
                        </figcaption>
                        <blockquote className="mt-xs rounded-control bg-paper-2 p-md font-mono text-sm leading-relaxed text-ink-2">
                          {highlight(
                            verdict.evidenceLine,
                            verdict.evidenceQuote,
                          )}
                        </blockquote>
                      </figure>
                    ) : (
                      <div>
                        <p className="label-mono">Evidence</p>
                        <p className="mt-xs max-w-[62ch] text-sm text-neutral">
                          {verdict.evidenceQuote === null
                            ? "Nothing in the résumé supports this requirement."
                            : "The quote offered for this requirement does not appear in the résumé, so it was discarded and the verdict downgraded to missing."}
                        </p>
                        {verdict.evidenceQuote !== null && (
                          <blockquote className="mt-xs max-w-[62ch] rounded-control border border-warn bg-warn-quiet p-md font-mono text-sm leading-relaxed text-neutral line-through">
                            {verdict.evidenceQuote}
                          </blockquote>
                        )}
                      </div>
                    )}

                    <div>
                      <p className="label-mono">Reasoning</p>
                      <p className="mt-xs max-w-[62ch] text-sm text-ink-2">
                        {verdict.reasoning}
                      </p>
                    </div>

                    <p className="numeric font-mono text-xs text-muted">
                      {formatWeight(weight)} ×{" "}
                      {VERDICT_CREDIT[verdict.verdict]} = {formatWeight(earned)}{" "}
                      points
                    </p>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {rows.length === 0 && (
        <p className="py-xl text-sm text-neutral">
          No requirements landed in that group.{" "}
          <button
            type="button"
            onClick={() => setFilter("all")}
            className="tap-safe text-accent-strong underline decoration-1 underline-offset-2 active:text-ink"
          >
            Show all {requirements.length}
          </button>
        </p>
      )}
    </section>
  );
}
