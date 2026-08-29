import type { EntityType } from "../types";
import { escapeRegExp, flexibleSource } from "../regex-utils";

/**
 * Documents almost never repeat a name in full. "Marceline Dubreuil" is
 * introduced once and then becomes "Dubreuil" or "Marceline" for the rest of
 * the text. Substituting only the full form would leave the short one in the
 * outbound stream, which defeats the point.
 *
 * So each multi-word name contributes its distinctive parts as aliases mapped
 * to the same token. Aliases are only kept when they actually occur elsewhere
 * in the document, which keeps the noise down and makes the count honest.
 */

const NOT_DISTINCTIVE = new Set([
  // company forms and generic business words
  "sas", "sarl", "sa", "sasu", "gmbh", "ltd", "limited", "llc", "plc", "inc",
  "corp", "group", "groupe", "holding", "holdings", "partners", "company",
  "industries", "technologies", "solutions", "systems", "services", "labs",
  "bank", "banque", "assurances", "consulting", "ventures", "capital",
  "energy", "marine", "offshore", "international", "global", "national",
  // civility titles
  "mr", "mrs", "ms", "miss", "dr", "prof", "sir", "m", "mme", "mlle", "me",
  // connectors
  "de", "du", "des", "van", "von", "der", "den", "le", "la", "and", "et", "of",
]);

function occursOutside(text: string, alias: string, fullValue: string): boolean {
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(alias)}(?![\\p{L}\\p{N}])`, "giu");
  let m: RegExpExecArray | null;
  const fullRe = new RegExp(flexibleSource(fullValue), "gi");
  const fullSpans: Array<[number, number]> = [];
  let f: RegExpExecArray | null;
  while ((f = fullRe.exec(text)) !== null) {
    fullSpans.push([f.index, f.index + f[0].length]);
    if (f.index === fullRe.lastIndex) fullRe.lastIndex++;
  }
  while ((m = re.exec(text)) !== null) {
    const s = m.index;
    const e = s + m[0].length;
    const insideFull = fullSpans.some(([fs, fe]) => s >= fs && e <= fe);
    if (!insideFull) return true;
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  return false;
}

export function deriveAliases(type: EntityType, value: string, text: string): string[] {
  if (type !== "person" && type !== "org") return [];

  const words = value.split(/\s+/).filter(Boolean);
  if (words.length < 2) return [];

  const candidates = words
    .map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""))
    .filter((w) => w.length >= 4)
    .filter((w) => !NOT_DISTINCTIVE.has(w.toLowerCase()))
    .filter((w) => /^[\p{Lu}]/u.test(w));

  const unique = [...new Set(candidates)];
  return unique.filter((alias) => occursOutside(text, alias, value));
}
