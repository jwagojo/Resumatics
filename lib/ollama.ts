import { Ollama } from "ollama";
import { ZodError, type ZodType } from "zod";

let runSignal: AbortSignal | null = null;

/** Tie in-flight Ollama fetches to the HTTP request so Cancel aborts the model. */
export function bindOllamaAbort(signal: AbortSignal | null): void {
  runSignal = signal;
}

export function throwIfAborted(): void {
  if (!runSignal?.aborted) return;
  const error = new Error("Analysis cancelled.");
  error.name = "AbortError";
  throw error;
}

function mergedSignal(existing?: AbortSignal | null): AbortSignal | undefined {
  if (runSignal && existing) return AbortSignal.any([runSignal, existing]);
  return runSignal ?? existing ?? undefined;
}

export const ollama = new Ollama({
  host: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
  fetch: (input, init) =>
    fetch(input, { ...init, signal: mergedSignal(init?.signal) }),
});

function camelKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(camelKeys);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
        key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
        camelKeys(nested),
      ]),
    );
  }
  return value;
}

function parseJsonPayload(raw: string): unknown {
  const stripped = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .trim();
  const fenced = stripped.match(/```(?:json)?\s*([\s\S]*?)```/);
  const text = (fenced?.[1] ?? stripped).trim();
  return camelKeys(JSON.parse(text) as unknown);
}

function modelName(): string {
  return process.env.OLLAMA_MODEL ?? "llama3.1:8b";
}

async function installedModelNames(): Promise<string[]> {
  try {
    const { models } = await ollama.list();
    return models.map((model) => model.name);
  } catch {
    return [];
  }
}

function formatZod(error: ZodError): string {
  return error.issues
    .slice(0, 8)
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "root";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
}

async function chatOnce(
  model: string,
  system: string,
  prompt: string,
  format: string | object,
): Promise<string> {
  throwIfAborted();
  try {
    const response = await ollama.chat({
      model,
      format,
      think: false,
      stream: false,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    });
    const content = response.message.content?.trim() ?? "";
    if (content.length === 0) {
      throw new Error("Ollama returned an empty message.");
    }
    return content;
  } catch (error) {
    if (
      (error instanceof Error && error.name === "AbortError") ||
      runSignal?.aborted
    ) {
      const cancelled = new Error("Analysis cancelled.");
      cancelled.name = "AbortError";
      throw cancelled;
    }
    const detail = error instanceof Error ? error.message : String(error);
    if (/not found/i.test(detail)) {
      const available = await installedModelNames();
      const hint =
        available.length > 0
          ? ` Installed: ${available.join(", ")}. Set OLLAMA_MODEL to one of those.`
          : " Pull it with `ollama pull`, or set OLLAMA_MODEL to a model you have.";
      throw new Error(`Ollama has no model named '${model}'.${hint}`);
    }
    throw error instanceof Error ? error : new Error(detail);
  }
}

export async function chatJson<T>(
  schema: ZodType<T>,
  system: string,
  prompt: string,
  format: string | object = "json",
): Promise<T> {
  const model = modelName();
  const first = await chatOnce(model, system, prompt, format);

  try {
    return schema.parse(parseJsonPayload(first));
  } catch (error) {
    if (!(error instanceof ZodError) && !(error instanceof SyntaxError)) {
      throw error;
    }

    const reason =
      error instanceof ZodError ? formatZod(error) : "Response was not valid JSON.";
    const retryPrompt = `${prompt}

---
Your previous reply was rejected: ${reason}
Return one JSON object that matches the schema. No markdown.`;

    const second = await chatOnce(model, system, retryPrompt, format);
    try {
      return schema.parse(parseJsonPayload(second));
    } catch (secondError) {
      if (secondError instanceof ZodError) {
        throw new Error(
          `The model returned JSON that did not match the expected shape (${formatZod(secondError)}).`,
        );
      }
      throw secondError;
    }
  }
}
