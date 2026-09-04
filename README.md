# Resumatics

Resumatics compares one résumé with one job description and produces an
auditable technical-fit score. Every scored requirement includes the exact
résumé evidence that earned credit, and unverified model quotes are discarded.

The app runs locally with Next.js and [Ollama](https://ollama.com/download).
Résumé files are parsed in memory and are not saved by the application.

## Quickstart

### Prerequisites

- Node.js 20.9 or newer
- Ollama for macOS, Windows, or Linux
- Enough local memory to run the selected model

### 1. Install the project

```bash
git clone <repository-url>
cd ResumeAnalyzer
npm ci
cp .env.example .env
```

On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`.

### 2. Start Ollama and install the model

Start the Ollama desktop app, or run this in a terminal:

```bash
ollama serve
```

In another terminal, download the model configured in `.env`:

```bash
ollama pull llama3.1:8b
```

### 3. Start Resumatics

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The setup card checks that
Ollama is reachable and that the configured model is installed before enabling
analysis.

## Using the app

1. Upload a text-based PDF or `.docx` résumé up to 8 MB.
2. Paste the complete job description, including its requirements section.
3. Run the analysis and inspect the score, evidence, gaps, and recommendations.
4. Save the result as a PDF if needed.

Direct job-posting links are not fetched yet. Copy and paste the description
instead. Scanned PDFs also require OCR before Resumatics can read them.

## Configuration

The defaults in `.env.example` work with a standard local Ollama installation:

```dotenv
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
```

To use a different installed model, change `OLLAMA_MODEL`, restart the Next.js
development server, and use the setup card to confirm it is ready. Smaller
models may run faster but are more likely to return incomplete structured data.

## Troubleshooting

### Ollama is not reachable

Open the Ollama desktop app or run `ollama serve`, then select **Check again** in
the app. If Ollama is on another machine, update `OLLAMA_BASE_URL` and restart
the development server.

### The configured model is not installed

Run `ollama pull <model>`, using the model name shown by the setup card. You can
also run `ollama ls` to see the models already installed.

### The model returns invalid JSON

Try the analysis again. If it continues, select a stronger instruction-following
model through `OLLAMA_MODEL`.

### A résumé produces little or no evidence

Use a text-based PDF or `.docx`. Image-only and scanned PDFs need OCR before
uploading.

## How scoring works

The model does not choose the final percentage. It judges each technical
requirement as met, partial, or missing, and `lib/score.ts` calculates the score
with deterministic weights:

- Required: 3 points
- Preferred: 2 points
- Nice to have: 1 point
- Met earns full weight, partial earns half, and missing earns zero

Every supporting quote is checked against the extracted résumé text by
`lib/evidence.ts`. A quote that cannot be found is discarded and cannot earn
points.

## Project structure

```text
app/
  page.tsx                 Input, analysis, and result states
  api/analyze/route.ts     Streamed analysis pipeline
  api/health/route.ts      Ollama and model readiness check
components/                Inputs, readiness, progress, and result views
lib/
  ollama.ts                Local model client and structured-output handling
  parse-resume.ts          PDF and DOCX text extraction
  pipeline.ts              Extraction, judging, and recommendations
  evidence.ts              Verbatim-quote verification
  score.ts                 Deterministic scoring
```

## Scripts

```bash
npm run dev        # Development server
npm run typecheck  # TypeScript validation
npm run build      # Production build
npm run start      # Run the production build
```

## Privacy and deployment

With the default configuration, résumé and job text are sent only to the local
Next.js server and local Ollama service. If `OLLAMA_BASE_URL` points to another
machine, that service receives the full text.

The current architecture is intended for local use. A hosted Next.js deployment
cannot reach Ollama running on a visitor's computer through `localhost`; it needs
an Ollama-compatible service reachable from the deployed server.
