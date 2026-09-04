"use client";

import { ThemeToggle } from "./ThemeToggle";

/**
 * Nav archetype N9 — edge-aligned minimal, executed as a bordered bar rather
 * than a floating pill, per the hairline discipline.
 *
 * The app has two real destinations, so a dense marketing bar would be
 * fiction. No command palette either: there is nothing here to command.
 */
export function AppHeader({
  onReset,
  canReset,
}: {
  onReset: () => void;
  canReset: boolean;
}) {
  return (
    <header className="sticky top-0 z-(--z-sticky) border-b border-rule bg-paper/85 backdrop-blur-md transition-[background-color,border-color] duration-(--dur-short) ease-out">
      <div className="shell flex items-center justify-between gap-md py-sm">
        <a
          href="/"
          className="tap-safe font-mono text-lg font-medium tracking-[0.14em] whitespace-nowrap text-ink uppercase"
        >
          Resumatics
        </a>

        <div className="flex items-center gap-xs">
          <ThemeToggle />
          <a
            href="#how-scoring-works"
            className="tap-safe hidden px-xs py-2xs text-sm whitespace-nowrap text-neutral underline decoration-rule-2 decoration-1 underline-offset-4 transition-colors duration-(--dur-micro) ease-out hover:text-accent-strong hover:decoration-accent sm:inline"
          >
            How scoring works
          </a>
          <button
            type="button"
            onClick={onReset}
            disabled={!canReset}
            className="btn btn--quiet"
          >
            New analysis
          </button>
        </div>
      </div>
    </header>
  );
}
