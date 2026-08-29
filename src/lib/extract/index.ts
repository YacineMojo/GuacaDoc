import type { LoadedDocument } from "../types";
import { splitIntoSections } from "../sections";

/**
 * Text extraction, entirely in the tab.
 *
 * pdf.js runs in a worker served from this origin and mammoth is bundled; no
 * step of this pipeline touches the network. The File object never becomes a
 * request body.
 */

export const ACCEPTED_EXTENSIONS = [".txt", ".md", ".markdown", ".pdf", ".docx"] as const;

function kindOf(name: string): LoadedDocument["kind"] | null {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".docx")) return "docx";
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) return "md";
  if (lower.endsWith(".txt")) return "txt";
  return null;
}

async function extractPdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/vendor/pdf.worker.min.mjs";

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let line = "";
    const lines: string[] = [];
    let lastY: number | null = null;

    for (const item of content.items) {
      if (!("str" in item)) continue;
      const y = Math.round(item.transform[5]);
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        lines.push(line.trimEnd());
        line = "";
      }
      line += item.str;
      if (item.hasEOL) {
        lines.push(line.trimEnd());
        line = "";
      }
      lastY = y;
    }
    if (line.trim()) lines.push(line.trimEnd());
    pages.push(lines.join("\n"));
    page.cleanup();
  }

  doc.cleanup();
  return pages.join("\n\n");
}

async function extractDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return value;
}

function normalizeWhitespace(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/ /g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

export async function loadDocument(file: File): Promise<LoadedDocument> {
  const kind = kindOf(file.name);
  if (!kind) {
    throw new Error(`Unsupported file type. Accepted: ${ACCEPTED_EXTENSIONS.join(", ")}`);
  }

  let raw: string;
  if (kind === "pdf") raw = await extractPdf(file);
  else if (kind === "docx") raw = await extractDocx(file);
  else raw = await file.text();

  const text = normalizeWhitespace(raw);
  if (!text) {
    throw new Error(
      "No text could be extracted. Scanned PDFs without a text layer are not supported: OCR would need a model this app refuses to call.",
    );
  }

  return {
    name: file.name,
    kind,
    text,
    sections: splitIntoSections(text),
    byteLength: new TextEncoder().encode(text).length,
    loadedAt: new Date().toISOString(),
  };
}

/** Loads the bundled demo document without going through the file picker. */
export function loadFromString(name: string, kind: LoadedDocument["kind"], raw: string): LoadedDocument {
  const text = normalizeWhitespace(raw);
  return {
    name,
    kind,
    text,
    sections: splitIntoSections(text),
    byteLength: new TextEncoder().encode(text).length,
    loadedAt: new Date().toISOString(),
  };
}
