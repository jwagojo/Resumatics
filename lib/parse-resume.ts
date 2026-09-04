import mammoth from "mammoth";

function extensionOf(name: string): string {
  const at = name.lastIndexOf(".");
  return at === -1 ? "" : name.slice(at).toLowerCase();
}

async function parsePdf(data: Uint8Array): Promise<string> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const document = await getDocument({ data }).promise;

  const pages: string[] = [];
  for (let index = 1; index <= document.numPages; index += 1) {
    const page = await document.getPage(index);
    const content = await page.getTextContent();
    const line = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    pages.push(line);
  }

  return pages.join("\n").replace(/[ \t]+\n/g, "\n").trim();
}

async function parseDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value.trim();
}

/** PDF or DOCX to plain text. Unknown types return an empty string. */
export async function parseResume(file: File): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const extension = extensionOf(file.name);

  if (extension === ".pdf") {
    return parsePdf(new Uint8Array(bytes));
  }
  if (extension === ".docx") {
    return parseDocx(bytes);
  }
  return "";
}
