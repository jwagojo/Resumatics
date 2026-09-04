"use client";

import type { CSSProperties } from "react";
import {
  CATEGORY_LABEL,
  VERDICT_GLYPH,
  VERDICT_LABEL,
  type JobPosting,
  type VerdictKind,
} from "@/lib/types";
import { formatWeight, scoreBand, type ScoreResult } from "@/lib/score";
import { useCountUp } from "@/lib/use-count-up";

/**
 * Hero archetype H4 — stat-led. The figure is the headline and everything
 * around it qualifies where the figure came from.
 *
 * Instrument panel: paper-2 in light mode, elevated charcoal in dark. It
 * carries a typographic frame rather than the theme's code-card window
 * chrome, since re-drawn chrome is banned outright and this is a data
 * readout rather than a code block.
 */
export function ScorePanel({
  score,
  job,
  resumeFilename,
  unverifiedCount,
}: {
  score: ScoreResult;
  job: JobPosting;
  resumeFilename: string;
  unverifiedCount: number;
}) {
  const displayed = useCountUp(score.percent);
  const verdictOrder: VerdictKind[] = ["met", "partial", "missing"];

  return (
    <section className="rise border-b border-graphite-rule bg-graphite text-on-graphite-2">
      {/* Bottom padding runs heavier than top so the band pulls the checklist
       * up into it instead of floating as its own slab. */}
      <div className="shell pt-xl pb-2xl">
        {/* Typographic frame: hairline, mono label, hairline. */}
        <div className="flex flex-wrap items-baseline justify-between gap-x-lg gap-y-xs border-b border-graphite-rule pb-sm">
          <span className="font-mono text-2xs font-medium tracking-[0.06em] text-on-graphite-muted uppercase">
            Fit score
          </span>
          <span className="font-mono text-2xs tracking-[0.06em] text-on-graphite-muted uppercase">
            {job.title} · {job.company}
          </span>
        </div>

        <div className="grid gap-xl pt-lg lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-2xl">
          {/* -- The figure, and what it is a fraction of -------------------- */}
          <div>
            <p className="flex items-start gap-2xs">
              <span className="numeric font-display text-score leading-[0.9] font-semibold tracking-[-0.03em] text-on-graphite">
                {displayed}
              </span>
              <span
                aria-hidden="true"
                className="mt-[0.4em] font-display text-md font-medium text-accent-on-dark"
              >
                %
              </span>
            </p>

            {/* The figure is the loudest thing here, but it is never the only
             * thing — a bare number as the sole headline says nothing. */}
            <h1 className="mt-xs font-display text-xl font-medium text-on-graphite">
              {scoreBand(score.percent)} for {job.title}
            </h1>

            <p className="mt-sm max-w-[48ch] text-sm text-on-graphite-2">
              <span className="numeric font-medium text-on-graphite">
                {formatWeight(score.earned)}
              </span>{" "}
              of{" "}
              <span className="numeric font-medium text-on-graphite">
                {formatWeight(score.possible)}
              </span>{" "}
              weighted points, summed from the{" "}
              <span className="numeric">{score.segments.length}</span>{" "}
              requirements below. Required items count 3, preferred 2, nice to
              have 1.
            </p>

            <p className="mt-md flex flex-wrap items-center gap-xs">
              {verdictOrder.map((verdict) => (
                <span key={verdict} className="chip" data-tone="on-dark">
                  <span aria-hidden="true">{VERDICT_GLYPH[verdict]}</span>
                  <span className="numeric">{score.counts[verdict]}</span>
                  <span>{VERDICT_LABEL[verdict]}</span>
                </span>
              ))}
            </p>

            {unverifiedCount > 0 && (
              <p className="mt-md flex flex-wrap items-start gap-xs text-sm text-on-graphite-2">
                <span className="chip mt-3xs" data-tone="warn">
                  Discarded
                </span>
                <span className="max-w-[46ch]">
                  <span className="numeric">{unverifiedCount}</span>{" "}
                  {unverifiedCount === 1 ? "quote" : "quotes"} could not be
                  found in {resumeFilename} and earned no credit.
                </span>
              </p>
            )}
          </div>

          {/* -- The derivation, so the figure reads as computed ------------- */}
          <div>
            <p
              id="how-scoring-works"
              className="scroll-mt-2xl max-w-[62ch] text-sm text-on-graphite-2"
            >
              Each slice below is one requirement, sized by its weight. Nothing
              here is a model’s estimate — the percentage is this bar divided by
              its own width.
            </p>

            {/* Hidden rather than labelled: every slice is restated as a row in
             * the checklist below, so a screen reader gains nothing here. */}
            <div className="derivation mt-md" aria-hidden="true" data-animate="">
              {score.segments.map((segment, index) => (
                <div
                  key={segment.requirementId}
                  className="derivation__seg"
                  data-verdict={segment.verdict}
                  style={
                    {
                      width: `${segment.sharePercent}%`,
                      "--i": index,
                    } as CSSProperties
                  }
                />
              ))}
            </div>

            <ul className="mt-sm flex flex-wrap gap-x-md gap-y-2xs text-xs text-on-graphite-muted">
              <li className="flex items-center gap-2xs">
                <span
                  aria-hidden="true"
                  className="h-[0.5rem] w-lg rounded-full bg-accent-on-dark"
                />
                Full credit
              </li>
              <li className="flex items-center gap-2xs">
                <span
                  aria-hidden="true"
                  className="derivation__seg h-[0.5rem] w-lg rounded-full"
                  data-verdict="partial"
                />
                Half credit
              </li>
              <li className="flex items-center gap-2xs">
                <span
                  aria-hidden="true"
                  className="h-[0.5rem] w-lg rounded-full bg-graphite-2"
                />
                No credit
              </li>
            </ul>

            {/* Feature archetype F3 vocabulary — hairline rows, tabular figures. */}
            <dl className="mt-lg border-t border-graphite-rule">
              {score.byCategory.map((category, index) => (
                <div
                  key={category.category}
                  className="flex items-center gap-md border-b border-graphite-rule py-sm"
                >
                  <dt className="min-w-0 flex-1 text-sm text-on-graphite-2">
                    {CATEGORY_LABEL[category.category]}
                  </dt>
                  <dd className="numeric w-[7ch] shrink-0 text-right text-xs text-on-graphite-muted">
                    {formatWeight(category.earned)}/
                    {formatWeight(category.possible)}
                  </dd>
                  <dd
                    aria-hidden="true"
                    className="hidden h-[0.25rem] w-[8rem] shrink-0 overflow-hidden rounded-full bg-graphite-2 sm:block"
                  >
                    <div
                      className="meter h-full rounded-full bg-accent-on-dark"
                      style={
                        {
                          width: `${category.percent}%`,
                          "--i": index,
                        } as CSSProperties
                      }
                    />
                  </dd>
                  <dd className="numeric w-[5ch] shrink-0 text-right text-sm font-medium text-on-graphite">
                    {category.percent}
                    <span className="text-on-graphite-muted">%</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
