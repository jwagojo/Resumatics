/**
 * Footer archetype Ft2 — inline single line, hairline rule above.
 *
 * The privacy line is real product information rather than filler: nothing is
 * stored, which is the honest selling point for a tool that reads a résumé.
 */
export function AppFooter() {
  return (
    <footer className="mt-3xl border-t border-rule">
      <div className="shell flex flex-wrap items-center gap-x-md gap-y-xs py-lg text-xs text-muted">
        <span className="font-mono text-2xs tracking-[0.06em] text-neutral uppercase">
          Resumatics
        </span>
        <span aria-hidden="true" className="text-faint">
          ·
        </span>
        <span>Files are parsed in memory, never written to disk or a database.</span>
        <span aria-hidden="true" className="text-faint">
          ·
        </span>
        <span>
          The score is computed from the checklist, not asserted by a model.
        </span>
      </div>
    </footer>
  );
}
