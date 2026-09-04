"use client";

import { useMemo, useRef, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { ResumeDrop } from "@/components/ResumeDrop";
import { JobInput, type JobMode } from "@/components/JobInput";
import { AnalyzeBar } from "@/components/AnalyzeBar";
import { ScorePanel } from "@/components/ScorePanel";
import { RequirementTable } from "@/components/RequirementTable";
import { Recommendations } from "@/components/Recommendations";
import { RealGaps } from "@/components/RealGaps";
import { Standouts } from "@/components/Standouts";
import { downloadAnalysisPdf } from "@/lib/export-pdf";
import { countUnverified, verifyVerdicts } from "@/lib/evidence";
import { scoreAnalysis } from "@/lib/score";
import type { Analysis } from "@/lib/types";

type Phase = "input" | "analyzing" | "results";

type StreamEvent =
  | { type: "stage"; index: number }
  | { type: "result"; analysis: Analysis }
  | { type: "error"; message: string };

async function readSse(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: StreamEvent) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const line = chunk
        .split("\n")
        .find((entry) => entry.startsWith("data: "));
      if (line === undefined) continue;
      onEvent(JSON.parse(line.slice(6)) as StreamEvent);
    }
  }
}

export default function Page() {
  const [phase, setPhase] = useState<Phase>("input");
  const [stageIndex, setStageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [resume, setResume] = useState<File | null>(null);
  const [jobMode, setJobMode] = useState<JobMode>("url");
  const [jobUrl, setJobUrl] = useState("");
  const [jobText, setJobText] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [savingPdf, setSavingPdf] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const verdicts = useMemo(
    () =>
      analysis === null
        ? []
        : verifyVerdicts(analysis.verdicts, analysis.resumeText),
    [analysis],
  );
  const score = useMemo(
    () =>
      analysis === null
        ? null
        : scoreAnalysis(analysis.requirements, verdicts),
    [analysis, verdicts],
  );
  const unverifiedCount = countUnverified(verdicts);

  const jobReady =
    jobMode === "url" ? jobUrl.trim().length > 0 : jobText.trim().length > 40;
  const canAnalyze = resume !== null && jobReady && phase !== "analyzing";

  async function startAnalysis() {
    if (resume === null) return;

    setError(null);
    setStageIndex(0);
    setPhase("analyzing");

    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    const form = new FormData();
    form.append("file", resume);
    form.append("job", jobMode === "url" ? jobUrl : jobText);
    form.append("mode", jobMode);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: form,
        signal: abort.signal,
      });

      if (response.body === null) {
        throw new Error("The server returned an empty response.");
      }

      let receivedResult = false;
      let failed = false;
      await readSse(response.body, (event) => {
        if (abort.signal.aborted) return;
        if (event.type === "stage") {
          setStageIndex(event.index);
          return;
        }
        if (event.type === "error") {
          failed = true;
          setError(event.message);
          setPhase("input");
          return;
        }
        setAnalysis(event.analysis);
        receivedResult = true;
        setPhase("results");
      });

      if (abort.signal.aborted) {
        setPhase("input");
        return;
      }
      if (!receivedResult && !failed) {
        setError("The analysis ended without a result.");
        setPhase("input");
      }
    } catch (caught) {
      if (abort.signal.aborted) {
        setPhase("input");
        return;
      }
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not reach the analysis service.",
      );
      setPhase("input");
    } finally {
      if (abortRef.current === abort) abortRef.current = null;
    }
  }

  function cancelRun() {
    abortRef.current?.abort();
    setPhase("input");
  }

  async function savePdf() {
    if (analysis === null) return;
    setSavingPdf(true);
    try {
      await downloadAnalysisPdf(analysis, verdicts);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not save the analysis PDF.",
      );
    } finally {
      setSavingPdf(false);
    }
  }

  function reset() {
    abortRef.current?.abort();
    setPhase("input");
    setStageIndex(0);
    setError(null);
    setResume(null);
    setJobUrl("");
    setJobText("");
    setAnalysis(null);
  }

  const showResults = phase === "results" && analysis !== null && score !== null;

  return (
    <>
      <AppHeader onReset={reset} canReset={phase !== "input"} />

      <main>
        {showResults ? (
          <>
            <ScorePanel
              score={score}
              job={analysis.job}
              resumeFilename={analysis.resumeFilename}
              unverifiedCount={unverifiedCount}
            />

            <div className="rise shell pt-lg">
              {error !== null && (
                <p className="helper mb-sm" data-tone="error">
                  {error}
                </p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-sm">
                <p className="flex flex-wrap items-center gap-xs text-xs text-muted">
                  <span className="chip">{analysis.job.sourceLabel}</span>
                  <span className="max-w-[74ch]">
                    {analysis.resumeFilename} against {analysis.job.title} at{" "}
                    {analysis.job.company}. Score uses technical résumé evidence
                    only.
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    void savePdf();
                  }}
                  disabled={savingPdf}
                  className="btn btn--quiet btn--compact"
                >
                  {savingPdf ? "Saving PDF…" : "Save PDF"}
                </button>
              </div>
              {analysis.omitted.length > 0 && (
                <p className="mt-xs max-w-[74ch] text-xs text-muted">
                  {analysis.omitted.length}{" "}
                  {analysis.omitted.length === 1
                    ? "line was"
                    : "lines were"}{" "}
                  left out because a résumé cannot prove them
                  {analysis.omitted.length <= 4
                    ? `: ${analysis.omitted.map((item) => item.text).join("; ")}.`
                    : "."}{" "}
                  Those belong in the interview.
                </p>
              )}
            </div>

            <RequirementTable
              requirements={analysis.requirements}
              verdicts={verdicts}
            />
            <Standouts
              standouts={analysis.standouts}
              requirements={analysis.requirements}
            />
            <Recommendations
              recommendations={analysis.recommendations}
              requirements={analysis.requirements}
            />
            <RealGaps
              recommendations={analysis.recommendations}
              requirements={analysis.requirements}
            />
          </>
        ) : (
          <div className="shell grid gap-xl pt-xl pb-2xl lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-2xl lg:pt-2xl lg:pb-3xl">
            <div className="lg:pt-sm">
              <h1 className="text-display font-semibold">
                The score shows its work.
              </h1>

              <p className="mt-md max-w-[46ch] text-base text-ink-2">
                Give it a résumé and one posting. Each technical requirement is
                judged on its own against a quoted line of your file. Soft
                skills, on-site rules, and similar interview tests are left out
                of the score.
              </p>

              <dl className="mt-xl border-t border-rule">
                {[
                  {
                    term: "Reproducible",
                    detail:
                      "The same résumé and posting give the same number every time, because arithmetic does not have moods.",
                  },
                  {
                    term: "Auditable",
                    detail:
                      "Open any requirement to see the exact line that earned the credit, highlighted where it sits.",
                  },
                  {
                    term: "Honest",
                    detail:
                      "It rewords what you did. It will not invent experience you do not have, and it says so when a gap is real.",
                  },
                ].map((item) => (
                  <div key={item.term} className="border-b border-rule py-md">
                    <dt className="font-display text-sm font-medium text-ink">
                      {item.term}
                    </dt>
                    <dd className="mt-2xs max-w-[46ch] text-sm text-neutral">
                      {item.detail}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div>
              {phase === "analyzing" ? (
                <AnalyzeBar stageIndex={stageIndex} onCancel={cancelRun} />
              ) : (
                <div className="rise panel p-md sm:p-lg">
                  <div className="grid gap-lg">
                    {error !== null && (
                      <p className="helper" data-tone="error">
                        {error}
                      </p>
                    )}

                    <ResumeDrop file={resume} onChange={setResume} />

                    <div className="border-t border-rule pt-lg">
                      <JobInput
                        mode={jobMode}
                        onModeChange={setJobMode}
                        url={jobUrl}
                        onUrlChange={setJobUrl}
                        text={jobText}
                        onTextChange={setJobText}
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-sm border-t border-rule pt-lg">
                      <p className="text-xs text-muted">
                        {canAnalyze
                          ? "Runs locally on Ollama. You can cancel mid-run."
                          : "Add a résumé and a posting to continue."}
                      </p>
                      <button
                        type="button"
                        disabled={!canAnalyze}
                        onClick={() => {
                          void startAnalysis();
                        }}
                        className="btn btn--primary"
                      >
                        Run analysis
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <AppFooter />
    </>
  );
}
