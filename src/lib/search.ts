import type { Section } from "./types";
import type { Redactor } from "./redact";
import { escapeRegExp } from "./regex-utils";

/**
 * Search runs over the redacted text, never the source.
 *
 * This is not a detail. If search hit the original text, the tool would become
 * an oracle: an agent could ask for "Dubreuil" and learn from a hit or a miss
 * whether that name is in the document, without a single byte of it ever
 * being returned. Searching the redacted view closes that channel, at the
 * cost of making blocked values genuinely unfindable, which is the point.
 */

export interface SearchHit {
  section_id: string;
  title: string;
  snippet: string;
  matches: number;
}

const SNIPPET_RADIUS = 90;

export function searchSections(
  sections: Section[],
  redactor: Redactor,
  query: string,
  limit: number,
): SearchHit[] {
  const terms = query
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
  if (terms.length === 0) return [];

  const pattern = new RegExp(terms.map(escapeRegExp).join("|"), "gi");
  const hits: SearchHit[] = [];

  for (const section of sections) {
    const redacted = redactor.apply(section.text);
    const positions: number[] = [];
    let m: RegExpExecArray | null;
    pattern.lastIndex = 0;
    while ((m = pattern.exec(redacted)) !== null) {
      positions.push(m.index);
      if (m.index === pattern.lastIndex) pattern.lastIndex++;
      if (positions.length > 50) break;
    }
    if (positions.length === 0) continue;

    const at = positions[0];
    const start = Math.max(0, at - SNIPPET_RADIUS);
    const end = Math.min(redacted.length, at + SNIPPET_RADIUS);
    const snippet =
      (start > 0 ? "…" : "") +
      redacted.slice(start, end).replace(/\s+/g, " ").trim() +
      (end < redacted.length ? "…" : "");

    hits.push({
      section_id: section.id,
      title: redactor.apply(section.title),
      snippet,
      matches: positions.length,
    });
  }

  return hits.sort((a, b) => b.matches - a.matches).slice(0, limit);
}
