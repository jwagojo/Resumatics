import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Analysis, Recommendation, Requirement, Verdict } from "./types";
import {
  CATEGORY_LABEL,
  IMPORTANCE_LABEL,
  STANDOUT_LABEL,
  VERDICT_LABEL,
} from "./types";
import { formatWeight, scoreAnalysis, scoreBand, type ScoreResult } from "./score";
import type { VerifiedVerdict } from "./evidence";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 54;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const INK = rgb(0.22, 0.14, 0.1);
const MUTED = rgb(0.45, 0.35, 0.28);
const RULE = rgb(0.85, 0.8, 0.72);

interface Writer {
  doc: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  y: number;
}

function wrap(font: PDFFont, text: string, size: number, width: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let current = words[0] ?? "";
  for (const word of words.slice(1)) {
    const next = `${current} ${word}`;
    if (font.widthOfTextAtSize(next, size) <= width) {
      current = next;
    } else {
      lines.push(current);
      current = word;
    }
  }
  lines.push(current);
  return lines;
}

async function startDoc(): Promise<Writer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  return { doc, page, font, bold, y: PAGE_HEIGHT - MARGIN };
}

function newPage(writer: Writer): void {
  writer.page = writer.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  writer.y = PAGE_HEIGHT - MARGIN;
}

function ensure(writer: Writer, height: number): void {
  if (writer.y - height < MARGIN + 28) newPage(writer);
}

function rule(writer: Writer): void {
  ensure(writer, 12);
  writer.page.drawLine({
    start: { x: MARGIN, y: writer.y },
    end: { x: PAGE_WIDTH - MARGIN, y: writer.y },
    thickness: 0.6,
    color: RULE,
  });
  writer.y -= 14;
}

function text(
  writer: Writer,
  value: string,
  options: { size: number; font?: PDFFont; color?: ReturnType<typeof rgb>; gap?: number },
): void {
  const font = options.font ?? writer.font;
  const lines = wrap(font, value, options.size, CONTENT_WIDTH);
  for (const line of lines) {
    ensure(writer, options.size + 4);
    writer.page.drawText(line, {
      x: MARGIN,
      y: writer.y - options.size,
      size: options.size,
      font,
      color: options.color ?? INK,
    });
    writer.y -= options.size + (options.gap ?? 4);
  }
}

function heading(writer: Writer, value: string): void {
  writer.y -= 8;
  text(writer, value, { size: 12, font: writer.bold, gap: 8 });
}

function sanitize(value: string): string {
  return value.replace(/[^\x09\x0a\x0d\x20-\x7e]/g, " ").replace(/\s+/g, " ").trim();
}

function slug(value: string): string {
  return (
    sanitize(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "analysis"
  );
}

function requirementLine(
  requirement: Requirement,
  verdict: Verdict | undefined,
): string {
  const kind = verdict?.verdict ?? "missing";
  return `${VERDICT_LABEL[kind]}  |  ${IMPORTANCE_LABEL[requirement.importance]}  |  ${CATEGORY_LABEL[requirement.category]}`;
}

function recommendationBody(item: Recommendation, requirements: Requirement[]): string {
  const label = (id: string) =>
    requirements.find((row) => row.id === id)?.text ?? id;

  switch (item.kind) {
    case "rewrite":
      return `${label(item.requirementId)}\nBefore: ${item.before}\nAfter: ${item.after}\nWhy: ${item.why}`;
    case "ask":
      return `${label(item.requirementId)}\n${item.question}`;
    case "deprioritize":
      return `${item.target}\n${item.why}`;
    case "real_gap":
      return `${label(item.requirementId)}\n${item.why}\nHow to close: ${item.howToClose}`;
  }
}

function stampPages(doc: PDFDocument, font: PDFFont): void {
  const pages = doc.getPages();
  const total = pages.length;
  pages.forEach((page, index) => {
    page.drawText(`Resumatics  |  ${index + 1} of ${total}`, {
      x: MARGIN,
      y: 28,
      size: 8,
      font,
      color: MUTED,
    });
  });
}

export async function analysisToPdfBytes(
  analysis: Analysis,
  verdicts: VerifiedVerdict[],
  score: ScoreResult,
): Promise<Uint8Array> {
  const writer = await startDoc();
  writer.doc.setTitle(
    `${analysis.job.title} at ${analysis.job.company} — Resumatics`,
  );
  writer.doc.setAuthor("Resumatics");
  writer.doc.setSubject("Technical résumé fit analysis");
  writer.doc.setCreator("Resumatics");
  writer.doc.setProducer("Resumatics");
  writer.doc.setCreationDate(new Date());

  text(writer, "RESUMATICS", {
    size: 9,
    font: writer.bold,
    color: MUTED,
    gap: 10,
  });
  text(writer, `${score.percent}%  ${scoreBand(score.percent)}`, {
    size: 22,
    font: writer.bold,
    gap: 8,
  });
  text(
    writer,
    `${sanitize(analysis.job.title)} at ${sanitize(analysis.job.company)}`,
    { size: 12, font: writer.bold, gap: 6 },
  );
  text(
    writer,
    `${sanitize(analysis.resumeFilename)}  |  ${formatWeight(score.earned)} of ${formatWeight(score.possible)} weighted points  |  ${analysis.job.sourceLabel}`,
    { size: 9, color: MUTED, gap: 6 },
  );
  text(
    writer,
    "Score uses technical résumé evidence only. Soft skills and logistics are omitted.",
    { size: 9, color: MUTED, gap: 10 },
  );
  if (verdicts.some((item) => !item.evidenceVerified)) {
    const n = verdicts.filter((item) => !item.evidenceVerified).length;
    text(
      writer,
      `${n} quoted ${n === 1 ? "line was" : "lines were"} discarded because they could not be found in the résumé.`,
      { size: 9, color: MUTED, gap: 8 },
    );
  }
  rule(writer);

  heading(writer, "Requirements");
  for (const requirement of analysis.requirements) {
    const verdict = verdicts.find((item) => item.requirementId === requirement.id);
    ensure(writer, 48);
    text(writer, sanitize(requirement.text), { size: 10, font: writer.bold, gap: 3 });
    text(writer, requirementLine(requirement, verdict), {
      size: 8,
      color: MUTED,
      gap: 3,
    });
    if (verdict?.evidenceQuote) {
      text(writer, `Quote: "${sanitize(verdict.evidenceQuote)}"`, {
        size: 9,
        gap: 3,
      });
    }
    if (verdict?.reasoning) {
      text(writer, sanitize(verdict.reasoning), { size: 9, color: MUTED, gap: 10 });
    } else {
      writer.y -= 6;
    }
  }

  if (analysis.standouts.length > 0) {
    rule(writer);
    heading(writer, "What to add");
    for (const item of analysis.standouts) {
      text(writer, `${STANDOUT_LABEL[item.kind]}  |  ${sanitize(item.title)}`, {
        size: 10,
        font: writer.bold,
        gap: 3,
      });
      text(writer, sanitize(item.why), { size: 9, gap: 3 });
      text(writer, `How: ${sanitize(item.how)}`, { size: 9, color: MUTED, gap: 10 });
    }
  }

  if (analysis.recommendations.length > 0) {
    rule(writer);
    heading(writer, "Recommendations");
    for (const item of analysis.recommendations) {
      const title =
        item.kind === "rewrite"
          ? "Rewrite"
          : item.kind === "ask"
            ? "Ask"
            : item.kind === "deprioritize"
              ? "Deprioritize"
              : "Real gap";
      text(writer, title, { size: 10, font: writer.bold, gap: 3 });
      for (const line of recommendationBody(item, analysis.requirements).split("\n")) {
        text(writer, sanitize(line), { size: 9, gap: 3 });
      }
      writer.y -= 8;
    }
  }

  if (analysis.omitted.length > 0) {
    rule(writer);
    heading(writer, "Omitted from the score");
    for (const item of analysis.omitted) {
      text(writer, sanitize(item.text), { size: 9, font: writer.bold, gap: 3 });
      text(writer, sanitize(item.reason), { size: 9, color: MUTED, gap: 8 });
    }
  }

  stampPages(writer.doc, writer.font);
  return writer.doc.save();
}

export function analysisPdfFilename(analysis: Analysis, percent: number): string {
  return `resumatics-${slug(analysis.job.company)}-${percent}.pdf`;
}

export async function downloadAnalysisPdf(
  analysis: Analysis,
  verdicts: VerifiedVerdict[],
): Promise<void> {
  const score = scoreAnalysis(analysis.requirements, verdicts);
  const bytes = await analysisToPdfBytes(analysis, verdicts, score);
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  const blob = new Blob([copy], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = analysisPdfFilename(analysis, score.percent);
  link.click();
  URL.revokeObjectURL(url);
}
