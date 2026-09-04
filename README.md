# Resumatics

Loads a résumé and one job posting, then reports how well they match — as a
score you can audit, requirement by requirement, with the exact line of the
résumé that earned each point.

This repository currently contains **the frontend only**, running against one
fixed sample analysis. The scoring and the evidence guardrail are real code and
run on every render; the model calls that produce the verdicts are not wired in
yet.

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
```

Other scripts:

```bash
npm run typecheck    # tsc --noEmit
npm run build        # production build
```

Requires Node 20 or newer.

## The idea the UI is built around

A matching percentage is easy to fake and hard to trust. Three decisions keep
this one honest, and the interface is shaped to make each of them visible:

**The score is arithmetic, not an opinion.** No model is asked "how good is this
match?" Instead each requirement is judged on its own, and the percentage is the
weighted sum of those judgements. Required requirements count 3, preferred 2,
nice-to-have 1; a met verdict earns full weight, partial earns half, missing
earns nothing. `lib/score.ts` is a pure function, so the same inputs always give
the same number. The graphite band shows the derivation bar the percentage was
divided out of, so the figure reads as computed rather than asserted.

**Evidence is verified, not trusted.** Every "met" verdict has to quote a line
from the résumé. `lib/evidence.ts` checks that the quote actually appears in the
file; when it does not, the verdict is downgraded to missing and flagged. The
sample data deliberately contains one fabricated quote so you can see the
guardrail fire — look for the `QUOTE NOT FOUND` marker on the Kafka requirement,
and note that it earns zero points.

**Gaps are stated, not written around.** Rewrites only reorder facts already in
the file. Where a requirement needs something the résumé does not show, the
interface asks you a question instead of inventing the claim, and genuinely
unbridgeable gaps get their own section rather than being softened into
suggestions.

## Layout

```
app/
  layout.tsx          font loading, document shell
  page.tsx            the three-phase state machine: input → analyzing → results
  globals.css         base rules and component classes
tokens.css            the whole design system as custom properties
components/
  AppHeader.tsx       sticky bordered bar
  AppFooter.tsx       inline single-line footer
  ResumeDrop.tsx      file drop zone with type and size validation
  JobInput.tsx        URL or paste, with per-ATS messaging
  AnalyzeBar.tsx      pipeline stage progress
  ScorePanel.tsx      the dark instrument band: figure, derivation, subscores
  RequirementTable.tsx  per-requirement rows with evidence accordions
  Recommendations.tsx   rewrites, questions, deprioritizations
  RealGaps.tsx          the gaps rewording will not close
lib/
  types.ts            mirrors the backend schemas, no runtime validation
  score.ts            the deterministic scorer
  evidence.ts         the quote verification guardrail
  mock.ts             the one sample analysis the UI currently renders
```

### Design system

`tokens.css` holds every colour, type step, spacing step, radius, easing and
z-index as a custom property, and is consumed by Tailwind v4 through its
`@theme` at-rule. Nothing in the components hard-codes a value.

Colours are authored in OKLCH so lightness is perceptual and contrast is
predictable. Every text pair clears WCAG 4.5:1 against all three paper steps —
not just the resting one, so text stays legible on hover and pressed surfaces
too — and control borders clear the 3:1 that WCAG 1.4.11 asks of a control's
visual boundary. The `browserslist` field in `package.json` is set to the
baseline for `oklch()` support specifically so the build does not downlevel
those colours to hex.

To reuse the tokens outside Tailwind, change `@theme` to `:root`.

## Wiring the backend in

`app/page.tsx` currently reads `sampleAnalysis` from `lib/mock.ts` and moves
through its stages on a timer. Three things change when the pipeline lands:

1. **Replace the data source.** Add a route handler that accepts the résumé file
   and the posting, and returns an `Analysis` (the shape in `lib/types.ts`).
   Swap the `sampleAnalysis` import for its response.
2. **Drive the stages from the response.** `AnalyzeBar` takes a `stageIndex`;
   feed it from the streamed pipeline instead of `STAGE_MS`, and delete the
   `useEffect` timer.
3. **Keep the scoring on the client, or run it on both sides.** `scoreAnalysis`
   and `verifyVerdicts` deliberately take plain data and return plain data. They
   should run over whatever the model returns — the guardrail is only meaningful
   if it runs after the model, never instead of it. Do not let the backend send
   a `percent` field; compute it.

The pipeline itself is three calls with structured outputs: extract the
posting's requirements, judge each requirement against the résumé with a
required evidence quote, then draft recommendations from the resulting gaps.
`.env.example` lists the Azure AI Foundry variables these will need.

Some things the backend still has to decide, which the frontend already assumes:

- **Fetching postings.** `JobInput` detects Greenhouse, Lever and Ashby URLs and
  tells the user that other sites need a paste, because LinkedIn and Indeed
  block server-side fetches. Those three need real adapters.
- **Reading files.** The UI accepts PDF and DOCX and warns that scanned pages
  need OCR. Plain extraction covers most text-based PDFs; Document Intelligence
  is in `.env.example` for the rest.
- **Requirement IDs.** Verdicts and recommendations join to requirements by
  `requirementId`, so extraction has to emit stable IDs within a single
  analysis.

## Notes on the interface

The score band is the page's only dark surface, which gives the results a
light-dark-light rhythm and marks the readout as the instrument it is. Depth
comes from hairlines rather than shadows.

Motion is used in two places and both carry information: the pipeline progress,
and the evidence accordions. Both animate `transform` or `grid-template-rows`
rather than layout properties. Under `prefers-reduced-motion` transitions
collapse to 150ms and the accordion resolves instantly rather than being
disabled — it holds content, so it has to keep working.

Interactive elements are laid out against a 44px floor. Where something is
visually smaller by design — the segmented filters, the copy buttons — a
`tap-safe` class grows the hit area along the block axis under `pointer: coarse`
only. It grows vertically rather than in all directions on purpose: an
all-around expansion on controls sitting in a row makes each one's hit area
overlap its neighbour, and the later sibling quietly wins the tap.
