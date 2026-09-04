"use client";

import { useId, useState } from "react";

export type JobMode = "url" | "paste";

type UrlVerdict =
  | { kind: "empty" }
  | { kind: "invalid" }
  | { kind: "adapter"; adapter: string; note: string }
  | { kind: "blocked"; site: string }
  | { kind: "generic" };

/**
 * Greenhouse, Lever and Ashby all publish job boards as public JSON, so those
 * get real adapters. LinkedIn and Indeed actively block server-side fetching,
 * so they are named as unsupported rather than quietly failing.
 */
function inspectUrl(raw: string): UrlVerdict {
  const trimmed = raw.trim();
  if (trimmed === "") return { kind: "empty" };

  let host: string;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") return { kind: "invalid" };
    host = parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return { kind: "invalid" };
  }

  if (host.endsWith("greenhouse.io")) {
    return {
      kind: "adapter",
      adapter: "Greenhouse",
      note: "Reads the public board API, so the description arrives as clean structured text.",
    };
  }
  if (host.endsWith("lever.co")) {
    return {
      kind: "adapter",
      adapter: "Lever",
      note: "Reads the public postings API, so the description arrives as clean structured text.",
    };
  }
  if (host.endsWith("ashbyhq.com")) {
    return {
      kind: "adapter",
      adapter: "Ashby",
      note: "Reads the public job-board API, so the description arrives as clean structured text.",
    };
  }
  if (host.endsWith("linkedin.com")) return { kind: "blocked", site: "LinkedIn" };
  if (host.endsWith("indeed.com")) return { kind: "blocked", site: "Indeed" };

  return { kind: "generic" };
}

export function JobInput({
  mode,
  onModeChange,
  url,
  onUrlChange,
  text,
  onTextChange,
}: {
  mode: JobMode;
  onModeChange: (mode: JobMode) => void;
  url: string;
  onUrlChange: (url: string) => void;
  text: string;
  onTextChange: (text: string) => void;
}) {
  const urlId = useId();
  const textId = useId();
  const helperId = useId();
  const [touched, setTouched] = useState(false);

  const verdict = inspectUrl(url);
  const showInvalid = touched && verdict.kind === "invalid";

  return (
    <div>
      <div className="mb-xs flex flex-wrap items-baseline justify-between gap-sm">
        <span className="label-mono">Job posting</span>

        {/* Buttons with aria-pressed rather than radios — radio tabs can
         * scroll-jump when focus moves into them. */}
        <div
          role="group"
          aria-label="Job input method"
          className="flex items-center gap-3xs rounded-control border border-rule bg-paper-2 p-3xs"
        >
          {(["url", "paste"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={mode === option}
              onClick={() => onModeChange(option)}
              className="seg"
            >
              {option === "url" ? "Link" : "Paste"}
            </button>
          ))}
        </div>
      </div>

      {mode === "url" ? (
        <div key="url" className="rise">
          <label htmlFor={urlId} className="sr-only">
            Job posting URL
          </label>
          <input
            id={urlId}
            type="url"
            inputMode="url"
            placeholder="https://boards.greenhouse.io/company/jobs/1234567"
            value={url}
            onChange={(event) => onUrlChange(event.target.value)}
            onBlur={() => setTouched(true)}
            aria-describedby={helperId}
            aria-invalid={showInvalid}
            className="field"
          />
          <div id={helperId} className="mt-xs min-h-[1lh]">
            {showInvalid && (
              <p className="helper" data-tone="error">
                That is not a valid https link. Paste the full URL including the
                protocol.
              </p>
            )}
            {verdict.kind === "adapter" && (
              <p className="flex flex-wrap items-center gap-xs text-xs text-neutral">
                <span className="chip" data-tone="accent">
                  {verdict.adapter}
                </span>
                <span>{verdict.note}</span>
              </p>
            )}
            {verdict.kind === "blocked" && (
              <p className="flex flex-wrap items-center gap-xs text-xs text-neutral">
                <span className="chip" data-tone="warn">
                  Blocked
                </span>
                <span>
                  {verdict.site} blocks automated fetching and will return a
                  login wall. Switch to Paste and copy the description in.
                </span>
              </p>
            )}
            {verdict.kind === "generic" && (
              <p className="helper">
                Unrecognised board. Will look for a schema.org JobPosting block
                and fall back to asking you to paste.
              </p>
            )}
            {verdict.kind === "empty" && (
              <p className="helper">
                Greenhouse, Lever and Ashby links read cleanly. Most other sites
                need a paste.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div key="paste" className="rise">
          <label htmlFor={textId} className="sr-only">
            Job description text
          </label>
          <textarea
            id={textId}
            placeholder="Paste the full job description, including the requirements section."
            value={text}
            onChange={(event) => onTextChange(event.target.value)}
            className="field"
            rows={7}
          />
          <p className="helper mt-2xs">
            <span className="numeric">{text.trim().length}</span> characters.
            Include the requirements list — that is what gets scored.
          </p>
        </div>
      )}
    </div>
  );
}
