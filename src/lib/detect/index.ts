import type { Entity, EntityLevel, EntityType } from "../types";
import { normalizeValue, tokenFor } from "../tokens";
import { deriveAliases } from "./aliases";
import { flexibleSource } from "../regex-utils";
import { findPatternMatches, type RawMatch } from "./patterns";
import { findNameCandidates } from "./heuristics";

/**
 * Default level per type.
 *
 * Everything detected is protected by default. That is the only rule that
 * makes the document pane readable at a glance: if it is marked, it is
 * handled. A mark that meant "found this, doing nothing about it" would teach
 * people to trust a highlight that protects nothing.
 *
 * Bank details go further and are withheld outright, because an account number
 * carries no analytical value at all. Dates and amounts usually matter to the
 * analysis, and one click on the group header lets them through.
 */
export const DEFAULT_LEVELS: Record<EntityType, EntityLevel> = {
  person: "pseudonymized",
  org: "pseudonymized",
  email: "pseudonymized",
  phone: "pseudonymized",
  iban: "blocked",
  card: "blocked",
  id: "pseudonymized",
  location: "pseudonymized",
  reference: "pseudonymized",
  date: "pseudonymized",
  amount: "pseudonymized",
  custom: "pseudonymized",
};

export const TYPE_LABELS: Record<EntityType, string> = {
  person: "People",
  org: "Organizations",
  email: "Emails",
  phone: "Phone numbers",
  iban: "IBANs",
  card: "Payment cards",
  id: "Identifiers",
  location: "Locations",
  reference: "References",
  date: "Dates",
  amount: "Amounts",
  custom: "Custom",
};

/** Keeps the highest-priority, longest match when spans overlap. */
function resolveOverlaps(matches: RawMatch[]): RawMatch[] {
  const sorted = [...matches].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    const lenDiff = b.end - b.start - (a.end - a.start);
    if (lenDiff !== 0) return lenDiff;
    return a.start - b.start;
  });
  const taken: Array<[number, number]> = [];
  const kept: RawMatch[] = [];
  for (const m of sorted) {
    const clash = taken.some(([s, e]) => m.start < e && s < m.end);
    if (clash) continue;
    taken.push([m.start, m.end]);
    kept.push(m);
  }
  return kept.sort((a, b) => a.start - b.start);
}

/**
 * Finds every literal occurrence of a value, including the ones the original
 * rule missed. Detecting a name once must redact it everywhere.
 */
function allOccurrences(text: string, value: string, caseInsensitive: boolean): Array<[number, number]> {
  const flags = caseInsensitive ? "gi" : "g";
  const needsBoundary = /^[\p{L}\p{N}]/u.test(value) && /[\p{L}\p{N}]$/u.test(value);
  const source = needsBoundary
    ? `(?<![\\p{L}\\p{N}])${flexibleSource(value)}(?![\\p{L}\\p{N}])`
    : flexibleSource(value);
  const re = new RegExp(source, flags + "u");
  const spans: Array<[number, number]> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    spans.push([m.index, m.index + m[0].length]);
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  return spans;
}

const CASE_INSENSITIVE_TYPES = new Set<EntityType>(["person", "org", "location", "email"]);

let entitySeq = 0;

export function makeEntity(
  type: EntityType,
  value: string,
  text: string,
  source: Entity["source"],
  level?: EntityLevel,
): Entity {
  const key = normalizeValue(type, value);
  return {
    id: `e${++entitySeq}`,
    type,
    value: value.trim(),
    key,
    token: tokenFor(type, key),
    aliases: deriveAliases(type, value.trim(), text),
    level: level ?? DEFAULT_LEVELS[type],
    source,
    spans: allOccurrences(text, value.trim(), CASE_INSENSITIVE_TYPES.has(type)),
  };
}

/** Runs the full local detection pass over the extracted text. */
export function detectEntities(text: string): Entity[] {
  const patternMatches = resolveOverlaps(findPatternMatches(text));
  const nameMatches = resolveOverlaps(findNameCandidates(text, patternMatches));
  const all = [...patternMatches, ...nameMatches];

  // Group by normalized key so every surface variant shares one token.
  const groups = new Map<string, { type: EntityType; value: string; source: Entity["source"] }>();
  for (const m of all) {
    const key = `${m.type}:${normalizeValue(m.type, m.value)}`;
    if (!groups.has(key)) {
      groups.set(key, {
        type: m.type,
        value: m.value,
        source: m.priority >= 100 ? "heuristic" : "regex",
      });
    }
  }

  const entities = [...groups.values()].map((g) => makeEntity(g.type, g.value, text, g.source));
  return entities
    .filter((e) => e.spans.length > 0)
    .sort((a, b) => (a.spans[0]?.[0] ?? 0) - (b.spans[0]?.[0] ?? 0));
}

export function resetEntitySeq() {
  entitySeq = 0;
}
