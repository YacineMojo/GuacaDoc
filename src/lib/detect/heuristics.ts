import type { EntityType } from "../types";
import type { RawMatch } from "./patterns";

/**
 * Capitalized-sequence heuristic for names of people and organizations.
 *
 * This is the weakest part of the pipeline and it is meant to be: free text is
 * where local detection loses. It is tuned to over-detect rather than
 * under-detect, because a false positive costs the user one click in the
 * editor while a false negative silently leaves a name in the outbound text.
 */

const COMPANY_MARKERS = new Set([
  "sas", "sarl", "sa", "sasu", "eurl", "scop", "gie",
  "gmbh", "ag", "kg", "ug", "ab", "as", "asa", "oy", "bv", "nv", "aps",
  "ltd", "limited", "llc", "llp", "plc", "inc", "corp", "corporation",
  "group", "groupe", "holding", "holdings", "partners", "industries",
  "technologies", "solutions", "systems", "labs", "laboratories", "bank",
  "banque", "assurances", "consulting", "ventures", "capital", "mutual",
  "energy", "energie", "offshore", "marine", "services", "analytics",
]);

const PERSON_TITLES = new Set([
  "mr", "mrs", "ms", "miss", "dr", "prof", "sir", "madam",
  "mme", "mlle", "me", "dre", "pr",
]);

/**
 * Words that are capitalized for a reason other than being a name: they open a
 * sentence, or they are a defined term of the contract such as "the Client".
 */
const NOT_A_NAME = new Set([
  "the", "this", "that", "these", "those", "a", "an", "in", "on", "at", "for",
  "from", "to", "by", "with", "and", "or", "but", "if", "as", "it", "we",
  "you", "they", "he", "she", "there", "here", "all", "any", "each", "no",
  "not", "such", "under", "upon", "where", "when", "while", "after", "both",
  "before", "during", "per", "either", "neither", "however", "signed", "dated",
  "le", "la", "les", "un", "une", "des", "du", "de", "ce", "cet", "cette",
  "ces", "et", "ou", "mais", "si", "il", "elle", "ils", "elles", "nous",
  "vous", "on", "dans", "sur", "pour", "par", "avec", "sans", "sous", "chez",
  "toute", "toutes", "tout", "tous", "aucun", "aucune", "selon", "lors",
  "cependant", "ainsi", "donc", "car", "fait", "signé",
  // structural words
  "article", "section", "annex", "annexe", "appendix", "clause", "page",
  "note", "notes", "total", "subtotal", "date", "dates", "name", "type",
  "reference", "invoice", "witnessed", "executed",
  // defined terms that pepper contracts and are not entities
  "client", "provider", "party", "parties", "agreement", "contractor",
  "supplier", "customer", "vendor", "purchaser", "seller", "buyer", "company",
  "employer", "employee", "licensor", "licensee", "lessor", "lessee",
  "recipient", "insurer", "counsel", "card", "payment",
]);

/** Small words allowed inside a multi-word name. */
const CONNECTORS = new Set([
  "de", "du", "des", "da", "di", "van", "von", "der", "den", "le", "la", "&",
]);

const TOKEN = /[\p{L}\p{N}'’&.-]+/gu;

function isCapitalized(word: string): boolean {
  return /^[\p{Lu}&]/u.test(word) && /[\p{L}&]/u.test(word);
}

function bare(word: string): string {
  return word.toLowerCase().replace(/[.,;:]+$/, "");
}

function classify(words: string[]): EntityType {
  const lowered = words.map(bare);
  if (lowered.some((w) => COMPANY_MARKERS.has(w))) return "org";
  if (lowered.some((w) => PERSON_TITLES.has(w))) return "person";
  if (words.includes("&")) return "org";
  if (words.length >= 2 && words.every((w) => w === w.toUpperCase() && w.length > 1)) {
    return "org";
  }
  return words.length >= 2 ? "person" : "org";
}

/** Character ranges covered by heading lines, where Title Case means nothing. */
function headingRanges(text: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  let offset = 0;
  for (const line of text.split("\n")) {
    const start = offset;
    offset += line.length + 1;
    const trimmed = line.trim();
    if (!trimmed) continue;
    const isMarkdownHeading = /^#{1,6}\s/.test(trimmed);
    const isShoutedTitle =
      trimmed.length < 80 && trimmed === trimmed.toUpperCase() && !/[.:;!?]$/.test(trimmed);
    if (isMarkdownHeading || isShoutedTitle) ranges.push([start, start + line.length]);
  }
  return ranges;
}

export function findNameCandidates(text: string, alreadyClaimed: RawMatch[]): RawMatch[] {
  const claimed = new Set<number>();
  for (const m of alreadyClaimed) {
    for (let i = m.start; i < m.end; i++) claimed.add(i);
  }
  const headings = headingRanges(text);
  const inHeading = (start: number, end: number) =>
    headings.some(([hs, he]) => start < he && hs < end);

  const tokens: Array<{ word: string; start: number; end: number }> = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(TOKEN.source, TOKEN.flags);
  while ((m = re.exec(text)) !== null) {
    tokens.push({ word: m[0], start: m.index, end: m.index + m[0].length });
  }

  /**
   * A name never survives a sentence boundary. Two tokens belong to the same
   * run only when nothing but blank space separates them, that space holds at
   * most one line break, and the left token does not end a clause.
   */
  const joinable = (left: { word: string; end: number }, right: { start: number }) => {
    if (/[.,;:!?]$/.test(left.word)) return false;
    const gap = text.slice(left.end, right.start);
    if (!/^[ \t]*\n?[ \t]*$/.test(gap)) return false;
    return true;
  };

  const results: RawMatch[] = [];
  let i = 0;

  while (i < tokens.length) {
    if (!isCapitalized(tokens[i].word)) {
      i++;
      continue;
    }

    const run: typeof tokens = [tokens[i]];
    let j = i + 1;
    while (j < tokens.length) {
      const previous = run[run.length - 1];
      const current = tokens[j];
      if (!joinable(previous, current)) break;

      if (isCapitalized(current.word)) {
        run.push(current);
        j++;
        continue;
      }
      const isConnector = CONNECTORS.has(bare(current.word));
      const nextIsCapitalized =
        j + 1 < tokens.length && isCapitalized(tokens[j + 1].word) && joinable(current, tokens[j + 1]);
      if (isConnector && nextIsCapitalized) {
        run.push(current);
        j++;
        continue;
      }
      break;
    }

    while (run.length && CONNECTORS.has(bare(run[run.length - 1].word))) run.pop();
    // Drop leading words that are capitalized only by position or convention.
    while (run.length && NOT_A_NAME.has(bare(run[0].word))) run.shift();
    while (run.length && NOT_A_NAME.has(bare(run[run.length - 1].word))) run.pop();

    if (run.length) {
      const words = run.map((t) => t.word);
      const hasMarker = words.some(
        (w) => COMPANY_MARKERS.has(bare(w)) || PERSON_TITLES.has(bare(w)),
      );
      const keep = words.length >= 2 || hasMarker;

      const spanStart = run[0].start;
      const spanEnd = run[run.length - 1].end;
      let overlaps = inHeading(spanStart, spanEnd);
      if (!overlaps) {
        for (let k = spanStart; k < spanEnd; k++) {
          if (claimed.has(k)) {
            overlaps = true;
            break;
          }
        }
      }

      if (keep && !overlaps) {
        results.push({
          type: classify(words),
          value: text
            .slice(spanStart, spanEnd)
            .replace(/\s+/g, " ")
            .replace(/[.,;:]+$/, ""),
          start: spanStart,
          end: spanEnd,
          priority: 100,
        });
      }
    }

    i = Math.max(j, i + 1);
  }

  return results;
}
