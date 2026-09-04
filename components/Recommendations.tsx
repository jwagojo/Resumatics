"use client";

import { useState, type CSSProperties } from "react";
import type { Recommendation, Requirement } from "@/lib/types";

/**
 * Copy is the one action here whose effect is invisible, so it confirms on the
 * button itself rather than firing a toast.
 */
function CopyButton({ value }: { value: string }) {
  const [state, setState] = useState<"idle" | "success" | "error">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState("success");
      window.setTimeout(() => setState("idle"), 1800);
    } catch {
      setState("error");
      window.setTimeout(() => setState("idle"), 2400);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      data-state={state === "idle" ? undefined : state}
      className="btn btn--quiet btn--compact"
    >
      <span aria-hidden="true" className="font-mono">
        {state === "success" ? "✓" : state === "error" ? "!" : "⧉"}
      </span>
      {state === "success"
        ? "Copied"
        : state === "error"
          ? "Copy failed"
          : "Copy"}
    </button>
  );
}

function requirementText(
  requirements: Requirement[],
  id: string,
): string | null {
  return requirements.find((requirement) => requirement.id === id)?.text ?? null;
}

export function Recommendations({
  recommendations,
  requirements,
}: {
  recommendations: Recommendation[];
  requirements: Requirement[];
}) {
  const rewrites = recommendations.filter((item) => item.kind === "rewrite");
  const asks = recommendations.filter((item) => item.kind === "ask");
  const cuts = recommendations.filter((item) => item.kind === "deprioritize");

  return (
    <section className="rise shell pt-2xl">
      <h2 className="font-display text-display-s font-medium">
        What to change
      </h2>
      <p className="mt-2xs max-w-[58ch] text-sm text-neutral">
        Every rewrite below reuses facts already in your résumé. Where a
        requirement needs something the file does not show, this section asks
        you instead of writing the claim for you.
      </p>

      {/* -- Rewrites: before and after, stacked so mobile keeps the pairing -- */}
      <div className="mt-lg grid gap-md">
        {rewrites.map((item, index) => {
          if (item.kind !== "rewrite") return null;
          const target = requirementText(requirements, item.requirementId);

          return (
            <article
              key={`rewrite-${index}`}
              className="rise panel p-md sm:p-lg"
              style={{ "--i": index } as CSSProperties}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-sm">
                <span className="label-mono">Rewrite</span>
                {target !== null && (
                  <span className="max-w-[46ch] text-xs text-muted">
                    Strengthens: {target}
                  </span>
                )}
              </div>

              <div className="mt-md grid gap-sm">
                <div>
                  <p className="label-mono">Currently</p>
                  <p className="mt-2xs font-mono text-sm leading-relaxed text-muted">
                    {item.before}
                  </p>
                </div>

                <div className="border-t border-rule pt-sm">
                  <div className="flex flex-wrap items-center justify-between gap-sm">
                    <p className="label-mono">Proposed</p>
                    <CopyButton value={item.after} />
                  </div>
                  <p className="mt-2xs font-mono text-sm leading-relaxed text-ink">
                    {item.after}
                  </p>
                </div>
              </div>

              <p className="mt-md max-w-[62ch] border-t border-rule pt-sm text-sm text-ink-2">
                {item.why}
              </p>
            </article>
          );
        })}
      </div>

      {/* -- Questions, never claims ---------------------------------------- */}
      {asks.length > 0 && (
        <div className="mt-xl">
          <h3 className="font-display text-md font-medium">
            Questions only you can answer
          </h3>
          <p className="mt-2xs max-w-[58ch] text-sm text-neutral">
            These would raise the score, but only if they are true. Nothing here
            has been added to your résumé.
          </p>
          <ul className="mt-md border-t border-rule">
            {asks.map((item, index) => {
              if (item.kind !== "ask") return null;
              const target = requirementText(requirements, item.requirementId);
              return (
                <li
                  key={`ask-${index}`}
                  className="rise flex items-start gap-sm border-b border-rule py-md sm:gap-md"
                  style={{ "--i": index } as CSSProperties}
                >
                  <span
                    aria-hidden="true"
                    className="mt-3xs w-[1ch] shrink-0 font-mono text-sm text-accent-strong"
                  >
                    ?
                  </span>
                  <div className="min-w-0">
                    <p className="max-w-[62ch] text-sm text-ink-2">
                      {item.question}
                    </p>
                    {target !== null && (
                      <p className="mt-2xs text-xs text-muted">{target}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* -- Lines earning nothing for this posting ------------------------- */}
      {cuts.length > 0 && (
        <div className="mt-xl">
          <h3 className="font-display text-md font-medium">
            Earning nothing here
          </h3>
          <ul className="mt-md border-t border-rule">
            {cuts.map((item, index) => {
              if (item.kind !== "deprioritize") return null;
              return (
                <li
                  key={`cut-${index}`}
                  className="rise border-b border-rule py-md"
                  style={{ "--i": index } as CSSProperties}
                >
                  <p className="font-mono text-sm leading-relaxed text-muted line-through">
                    {item.target}
                  </p>
                  <p className="mt-xs max-w-[62ch] text-sm text-ink-2">
                    {item.why}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
