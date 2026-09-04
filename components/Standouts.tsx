"use client";

import { useState, type CSSProperties } from "react";
import {
  STANDOUT_LABEL,
  type Requirement,
  type StandoutSuggestion,
} from "@/lib/types";

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
          : "Copy step"}
    </button>
  );
}

export function Standouts({
  standouts,
  requirements,
}: {
  standouts: StandoutSuggestion[];
  requirements: Requirement[];
}) {
  if (standouts.length === 0) return null;

  return (
    <section className="rise shell pt-2xl">
      <h2 className="font-display text-display-s font-medium">What to add</h2>
      <p className="mt-2xs max-w-[58ch] text-sm text-neutral">
        These are not on the file yet. They are projects, skills, credentials,
        and public artifacts a reviewer in this pool would notice. They do not
        change the score until they exist.
      </p>

      <div className="mt-lg grid gap-md">
        {standouts.map((item, index) => {
          const tied =
            item.requirementId === null
              ? null
              : requirements.find((row) => row.id === item.requirementId)
                  ?.text ?? null;

          return (
            <article
              key={`${item.kind}-${index}`}
              className="rise panel p-md sm:p-lg"
              style={{ "--i": index } as CSSProperties}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-sm">
                <span className="chip">{STANDOUT_LABEL[item.kind]}</span>
                {tied !== null && (
                  <span className="max-w-[46ch] text-xs text-muted">
                    Speaks to: {tied}
                  </span>
                )}
              </div>

              <h3 className="mt-md font-display text-md font-medium">
                {item.title}
              </h3>
              <p className="mt-xs max-w-[62ch] text-sm text-ink-2">{item.why}</p>

              <div className="mt-md border-t border-rule pt-sm">
                <div className="flex flex-wrap items-center justify-between gap-sm">
                  <p className="label-mono">How</p>
                  <CopyButton value={item.how} />
                </div>
                <p className="mt-2xs max-w-[62ch] text-sm text-ink">{item.how}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
