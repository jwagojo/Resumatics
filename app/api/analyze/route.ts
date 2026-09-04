import { ZodError } from "zod";
import {
  discardedQuoteIds,
  shouldRejudgeDiscarded,
  verifyVerdicts,
} from "@/lib/evidence";
import { bindOllamaAbort, throwIfAborted } from "@/lib/ollama";
import {
  extractRequirements,
  generateRecommendations,
  judgeRequirements,
  parseResume,
  rejudgeRequirements,
  suggestStandouts,
} from "@/lib/pipeline";
import type { Analysis, JobPosting } from "@/lib/types";

export const maxDuration = 300;
export const runtime = "nodejs";

type StageEvent = { type: "stage"; index: number };
type ResultEvent = { type: "result"; analysis: Analysis };
type ErrorEvent = { type: "error"; message: string };
type StreamEvent = StageEvent | ResultEvent | ErrorEvent;

function jobMeta(
  title: string,
  company: string,
): JobPosting {
  return {
    title,
    company,
    source: "pasted",
    sourceLabel: "Pasted description",
  };
}

function isAbort(error: unknown): boolean {
  return (
    (error instanceof Error && error.name === "AbortError") ||
    (error instanceof Error && error.message === "Analysis cancelled.")
  );
}

export async function POST(request: Request) {
  const encoder = new TextEncoder();
  bindOllamaAbort(request.signal);

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: StreamEvent) => {
        if (request.signal.aborted) return;
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
        );
      };

      try {
        const form = await request.formData();
        const file = form.get("file");
        const job = String(form.get("job") ?? "");
        const mode = String(form.get("mode") ?? "paste");

        if (!(file instanceof File) || file.size === 0) {
          emit({ type: "error", message: "Attach a résumé PDF or .docx." });
          return;
        }
        if (job.trim().length === 0) {
          emit({ type: "error", message: "Add a job posting to continue." });
          return;
        }
        if (mode !== "paste" || /^https?:\/\/\S+$/i.test(job.trim())) {
          emit({
            type: "error",
            message:
              "Direct job links are not supported yet. Paste the full job description instead.",
          });
          return;
        }

        emit({ type: "stage", index: 0 });
        const resumeText = await parseResume(file);

        throwIfAborted();
        emit({ type: "stage", index: 1 });
        const extracted = await extractRequirements(job);

        throwIfAborted();
        emit({ type: "stage", index: 2 });
        let rawVerdicts = await judgeRequirements(
          resumeText,
          extracted.requirements,
        );

        throwIfAborted();
        emit({ type: "stage", index: 3 });
        let verdicts = verifyVerdicts(rawVerdicts, resumeText);
        if (shouldRejudgeDiscarded(verdicts)) {
          rawVerdicts = await rejudgeRequirements(
            resumeText,
            extracted.requirements,
            rawVerdicts,
            discardedQuoteIds(verdicts),
          );
          verdicts = verifyVerdicts(rawVerdicts, resumeText);
        }

        throwIfAborted();
        emit({ type: "stage", index: 4 });
        let standouts: Awaited<ReturnType<typeof suggestStandouts>> = [];
        try {
          standouts = await suggestStandouts(
            resumeText,
            extracted.job,
            extracted.requirements,
            verdicts,
          );
        } catch (error) {
          if (isAbort(error) || request.signal.aborted) throw error;
          standouts = [];
        }

        throwIfAborted();
        emit({ type: "stage", index: 5 });
        const recommendations = await generateRecommendations(
          resumeText,
          extracted.requirements,
          verdicts,
        );

        emit({
          type: "result",
          analysis: {
            job: jobMeta(extracted.job.title, extracted.job.company),
            resumeFilename: file.name,
            resumeText,
            requirements: extracted.requirements,
            verdicts,
            recommendations,
            standouts,
            omitted: extracted.omitted,
          },
        });
      } catch (error) {
        if (isAbort(error) || request.signal.aborted) {
          return;
        }
        let message = "Analysis failed.";
        if (error instanceof ZodError) {
          message =
            "The model returned JSON that did not match the expected shape. Try again, or use a stronger local model.";
        } else if (error instanceof SyntaxError) {
          message = "The model did not return valid JSON. Try again.";
        } else if (error instanceof Error && error.message.length > 0) {
          message = error.message;
        }
        emit({ type: "error", message });
      } finally {
        bindOllamaAbort(null);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
