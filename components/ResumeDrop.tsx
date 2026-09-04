"use client";

import { useId, useRef, useState } from "react";

const ACCEPTED = [".pdf", ".docx"];
const MAX_BYTES = 8 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export type ResumeFile = File;

/**
 * Native file input wrapped in a styled label — `input[type=file]` is not
 * meaningfully styleable, so the label is the surface.
 */
export function ResumeDrop({
  file,
  onChange,
}: {
  file: ResumeFile | null;
  onChange: (file: ResumeFile | null) => void;
}) {
  const inputId = useId();
  const helperId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function accept(candidate: File | undefined) {
    if (candidate === undefined) return;

    const extension = candidate.name
      .slice(candidate.name.lastIndexOf("."))
      .toLowerCase();

    if (!ACCEPTED.includes(extension)) {
      // What broke, then what to do. No apology for the user's input.
      setError(`That file is a ${extension || "unknown type"}. Upload a PDF or a .docx.`);
      return;
    }
    if (candidate.size > MAX_BYTES) {
      setError(
        `That file is ${formatBytes(candidate.size)}. The limit is ${formatBytes(MAX_BYTES)} — export a flattened copy and try again.`,
      );
      return;
    }

    setError(null);
    onChange(candidate);
  }

  function clear() {
    setError(null);
    onChange(null);
    if (inputRef.current !== null) inputRef.current.value = "";
  }

  return (
    <div>
      <div className="mb-xs flex items-baseline justify-between gap-sm">
        <label htmlFor={inputId} className="label-mono">
          Résumé
        </label>
        {file !== null && (
          <button
            type="button"
            onClick={clear}
            className="tap-safe text-xs text-muted underline decoration-rule-2 underline-offset-4 transition-colors duration-(--dur-micro) ease-out hover:text-warn hover:decoration-warn"
          >
            Remove
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPTED.join(",")}
        aria-describedby={helperId}
        aria-invalid={error !== null}
        className="sr-only peer"
        onChange={(event) => accept(event.target.files?.[0])}
      />

      <label
        htmlFor={inputId}
        data-dragging={isDragging}
        data-filled={file !== null}
        data-invalid={error !== null}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          accept(event.dataTransfer.files?.[0]);
        }}
        className="flex min-h-[7.5rem] cursor-pointer flex-col justify-center gap-2xs rounded-control border border-rule-2 border-dashed bg-paper px-md py-lg transition-[background-color,border-color] duration-(--dur-short) ease-out hover:bg-paper-2 data-[dragging=true]:border-accent data-[dragging=true]:bg-accent-quiet data-[filled=true]:border-solid data-[filled=true]:bg-paper-2 data-[invalid=true]:border-warn peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus"
      >
        {file === null ? (
          <>
            <span className="font-display text-base font-medium text-ink">
              Drop a PDF or .docx
            </span>
            <span className="text-xs text-muted">
              Or click to browse. Parsed in memory, never uploaded to storage.
            </span>
          </>
        ) : (
          <>
            <span className="flex items-center gap-xs">
              <span
                aria-hidden="true"
                className="font-mono text-sm text-accent-strong"
              >
                ■
              </span>
              <span className="font-display text-base font-medium break-all text-ink">
                {file.name}
              </span>
            </span>
            <span className="numeric text-xs text-muted">
              {formatBytes(file.size)} · ready
            </span>
          </>
        )}
      </label>

      <p
        id={helperId}
        data-tone={error !== null ? "error" : undefined}
        className="helper mt-2xs"
      >
        {error ?? "Text-based PDFs read best. Scanned pages need OCR."}
      </p>
    </div>
  );
}
