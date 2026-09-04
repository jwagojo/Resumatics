"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type HealthResponse = {
  status: "ready" | "missing_model" | "unreachable";
  model: string;
  installedModels: string[];
};

type CheckState =
  | { kind: "checking" }
  | ({ kind: "ready" | "missing_model" | "unreachable" } & Omit<
      HealthResponse,
      "status"
    >);

export function OllamaStatus({
  onReadyChange,
}: {
  onReadyChange: (ready: boolean) => void;
}) {
  const [state, setState] = useState<CheckState>({ kind: "checking" });
  const requestRef = useRef<AbortController | null>(null);

  const check = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setState({ kind: "checking" });
    onReadyChange(false);

    try {
      const response = await fetch("/api/health", {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Readiness check failed.");
      const result = (await response.json()) as HealthResponse;
      if (controller.signal.aborted) return;
      setState({
        kind: result.status,
        model: result.model,
        installedModels: result.installedModels,
      });
      onReadyChange(result.status === "ready");
    } catch {
      if (controller.signal.aborted) return;
      setState({
        kind: "unreachable",
        model: "the configured model",
        installedModels: [],
      });
      onReadyChange(false);
    }
  }, [onReadyChange]);

  useEffect(() => {
    void check();
    return () => requestRef.current?.abort();
  }, [check]);

  const ready = state.kind === "ready";
  const label =
    state.kind === "checking"
      ? "Checking"
      : ready
        ? "Ready"
        : "Setup needed";

  return (
    <section aria-live="polite" className="border-b border-rule pb-lg">
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <div className="flex flex-wrap items-center gap-xs">
          <span className="label-mono">Local model</span>
          <span
            className="chip"
            data-tone={
              ready ? "accent" : state.kind === "checking" ? undefined : "warn"
            }
          >
            {label}
          </span>
        </div>
        {state.kind !== "checking" && !ready && (
          <button
            type="button"
            onClick={() => void check()}
            className="btn btn--quiet btn--compact"
          >
            Check again
          </button>
        )}
      </div>

      {state.kind === "checking" && (
        <p className="helper mt-xs">Checking Ollama and the configured model…</p>
      )}
      {state.kind === "ready" && (
        <p className="helper mt-xs">
          Ollama is running and <code>{state.model}</code> is installed.
        </p>
      )}
      {state.kind === "unreachable" && (
        <p className="helper mt-xs" data-tone="error">
          Ollama is not reachable. Start the Ollama app or run{" "}
          <code>ollama serve</code>, then check again.
        </p>
      )}
      {state.kind === "missing_model" && (
        <p className="helper mt-xs" data-tone="error">
          Ollama is running, but <code>{state.model}</code> is not installed. Run{" "}
          <code>ollama pull {state.model}</code>, then check again.
          {state.installedModels.length > 0 && (
            <> Installed: {state.installedModels.join(", ")}.</>
          )}
        </p>
      )}
    </section>
  );
}
