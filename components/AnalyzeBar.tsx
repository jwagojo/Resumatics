"use client";

export const STAGES = [
  "Reading résumé and posting",
  "Extracting requirements",
  "Judging each requirement",
  "Verifying quoted evidence",
  "Suggesting what to add",
  "Drafting résumé changes",
] as const;

/**
 * Progress is the one place motion is load-bearing: the stages say which of
 * the pipeline's round trips is in flight. Functional motion, so it keeps
 * running under reduced-motion preferences rather than collapsing.
 */
export function AnalyzeBar({
  stageIndex,
  onCancel,
}: {
  stageIndex: number;
  onCancel: () => void;
}) {
  const total = STAGES.length;
  const done = Math.min(stageIndex, total);
  const fraction = done / total;
  const current = STAGES[Math.min(stageIndex, total - 1)];

  return (
    <section
      aria-live="polite"
      aria-busy={done < total}
      className="rise panel p-lg sm:p-xl"
    >
      {/* Label above heading, stacked. A mono label sitting beside a heading in
       * its own column is the templated-editorial tell. */}
      <p className="numeric label-mono">
        Step {Math.min(done + 1, total)} of {total}
      </p>
      <h2
        key={current}
        className="rise mt-2xs font-display text-md font-medium"
      >
        {current}
      </h2>

      <div
        role="progressbar"
        aria-valuenow={Math.round(fraction * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Analysis progress"
        className="mt-md h-[0.375rem] w-full overflow-hidden rounded-full bg-paper-3"
      >
        {/* scaleX rather than width — width would animate layout. The track's
         * own rounding and clip give the fill its shape. */}
        <div
          className="h-full w-full origin-left bg-accent transition-transform duration-(--dur-long) ease-out"
          style={{ transform: `scaleX(${fraction})` }}
        />
      </div>

      <ol className="mt-lg grid gap-2xs">
        {STAGES.map((stage, index) => {
          const state =
            index < done ? "done" : index === done ? "active" : "waiting";
          return (
            <li
              key={stage}
              data-state={state}
              className="flex items-center gap-sm text-sm text-muted transition-colors duration-(--dur-short) ease-out data-[state=active]:text-ink data-[state=done]:text-neutral"
            >
              <span
                aria-hidden="true"
                data-state={state}
                className="stage-mark w-[1ch] font-mono text-xs"
              >
                {state === "done" ? "■" : state === "active" ? "◪" : "□"}
              </span>
              <span>{stage}</span>
            </li>
          );
        })}
      </ol>

      <div className="mt-lg flex justify-end border-t border-rule pt-md">
        <button type="button" onClick={onCancel} className="btn btn--quiet">
          Cancel run
        </button>
      </div>
    </section>
  );
}
