import type { Section } from "./types";

/**
 * Splits the extracted text into addressable sections.
 *
 * Sections are the unit of the whole tool surface: the agent asks for an
 * outline, searches, then pulls one section at a time. Making them small and
 * named is what lets a useful analysis happen inside a tight byte budget.
 */

const MAX_CHARS_PER_SECTION = 2400;

interface Heading {
  index: number;
  end: number;
  title: string;
  level: number;
}

function detectHeadings(text: string): Heading[] {
  const headings: Heading[] = [];
  const lines = text.split("\n");
  let offset = 0;

  for (const line of lines) {
    const start = offset;
    offset += line.length + 1;
    const trimmed = line.trim();
    if (!trimmed) continue;

    const md = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (md) {
      headings.push({ index: start, end: start + line.length, title: md[2].trim(), level: md[1].length });
      continue;
    }

    // "Article 5 - Liability", "3.2 Payment terms", "SECTION IV"
    const numbered = /^((?:article|section|clause|annex|annexe|appendix|chapter|partie|chapitre)\s+[\dIVXLC]+[.)]?|[\d]+(?:\.[\d]+)*[.)])\s*[-–—:]?\s*(.{0,90})$/i.exec(
      trimmed,
    );
    if (numbered && trimmed.length < 110) {
      const depth = (numbered[1].match(/\./g) ?? []).length + 1;
      headings.push({
        index: start,
        end: start + line.length,
        title: trimmed,
        level: Math.min(depth, 4),
      });
      continue;
    }

    // A short all-caps line with no terminal punctuation reads as a heading.
    if (
      trimmed.length <= 70 &&
      trimmed === trimmed.toUpperCase() &&
      /[\p{L}]/u.test(trimmed) &&
      !/[.;!?]$/.test(trimmed)
    ) {
      headings.push({ index: start, end: start + line.length, title: trimmed, level: 1 });
    }
  }

  return headings;
}

/** Cuts an oversized block on paragraph boundaries. */
function splitLongBlock(
  text: string,
  start: number,
  end: number,
  title: string,
  level: number,
  nextId: () => string,
): Section[] {
  const body = text.slice(start, end);
  if (body.length <= MAX_CHARS_PER_SECTION) {
    return [{ id: nextId(), title, level, text: body, start, end }];
  }

  const out: Section[] = [];
  const paragraphs = body.split(/\n{2,}/);
  let buffer = "";
  let bufferStart = start;
  let cursor = start;
  let part = 1;

  const flush = () => {
    if (!buffer.trim()) return;
    out.push({
      id: nextId(),
      title: `${title} (part ${part})`,
      level,
      text: buffer,
      start: bufferStart,
      end: bufferStart + buffer.length,
    });
    part += 1;
    buffer = "";
  };

  for (const paragraph of paragraphs) {
    const chunk = paragraph + "\n\n";
    if (buffer.length + chunk.length > MAX_CHARS_PER_SECTION && buffer.length > 0) {
      flush();
      bufferStart = cursor;
    }
    if (!buffer) bufferStart = cursor;
    buffer += chunk;
    cursor += chunk.length;
  }
  flush();

  return out.length ? out : [{ id: nextId(), title, level, text: body, start, end }];
}

export function splitIntoSections(text: string): Section[] {
  const headings = detectHeadings(text);
  let counter = 0;
  const nextId = () => `s${String(++counter).padStart(2, "0")}`;
  const sections: Section[] = [];

  if (headings.length === 0) {
    return splitLongBlock(text, 0, text.length, "Document", 1, nextId);
  }

  if (headings[0].index > 0) {
    const preamble = text.slice(0, headings[0].index);
    if (preamble.trim()) {
      sections.push(...splitLongBlock(text, 0, headings[0].index, "Preamble", 1, nextId));
    }
  }

  headings.forEach((heading, i) => {
    const bodyStart = heading.end + 1;
    const bodyEnd = i + 1 < headings.length ? headings[i + 1].index : text.length;
    if (bodyEnd <= bodyStart) {
      sections.push({
        id: nextId(),
        title: heading.title,
        level: heading.level,
        text: "",
        start: bodyStart,
        end: bodyStart,
      });
      return;
    }
    sections.push(
      ...splitLongBlock(text, bodyStart, bodyEnd, heading.title, heading.level, nextId),
    );
  });

  return sections;
}
