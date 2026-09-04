"use client";

import { useId } from "react";

export function JobInput({
  text,
  onTextChange,
}: {
  text: string;
  onTextChange: (text: string) => void;
}) {
  const textId = useId();
  const helperId = useId();
  const trimmed = text.trim();
  const isOnlyLink = /^https?:\/\/\S+$/i.test(trimmed);

  return (
    <div>
      <div className="mb-xs flex flex-wrap items-baseline justify-between gap-sm">
        <span className="label-mono">Job posting</span>
        <span className="chip">Paste supported</span>
      </div>

      <div className="rise">
        <label htmlFor={textId} className="sr-only">
          Job description text
        </label>
        <textarea
          id={textId}
          placeholder="Paste the full job description, including the requirements section."
          value={text}
          onChange={(event) => onTextChange(event.target.value)}
          aria-describedby={helperId}
          aria-invalid={isOnlyLink}
          className="field"
          rows={7}
        />
        <p
          id={helperId}
          className="helper mt-2xs"
          data-tone={isOnlyLink ? "error" : undefined}
        >
          {isOnlyLink ? (
            "That is only a link. Copy and paste the full job description instead."
          ) : (
            <>
              <span className="numeric">{trimmed.length}</span> characters. Include
              the requirements list — that is what gets scored. Direct job links
              are not fetched yet.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
