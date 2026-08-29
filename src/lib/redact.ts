import type { Entity } from "./types";
import { blockedMarker } from "./tokens";
import { escapeRegExp, flexibleSource } from "./regex-utils";

/**
 * Outbound substitution.
 *
 * Every string that leaves the tab goes through here, without exception. The
 * policy wrapper walks whole tool results and scrubs each string it finds, so
 * a handler cannot leak by forgetting to redact: forgetting is not a code path
 * that exists.
 */

interface Surface {
  text: string;
  replacement: string;
  entityId: string;
  value: string;
}

export interface Leak {
  entityId: string;
  value: string;
}

export interface Redactor {
  /** Replaces every non-visible surface form with its token or block marker. */
  apply(text: string): string;
  /** Reports any non-visible source value still present in the text. */
  verify(text: string): Leak[];
  /** apply() followed by a verified second pass. Nothing leaves without it. */
  scrub(text: string): { text: string; leaks: Leak[] };
  /** Reverses pseudonymization locally, for the decode panel. */
  decode(text: string): string;
  /** True when no entity would be altered, so scrubbing is a no-op. */
  isIdentity: boolean;
}

export function buildRedactor(entities: Entity[]): Redactor {
  const surfaces: Surface[] = [];

  for (const entity of entities) {
    if (entity.level === "visible") continue;
    const replacement =
      entity.level === "blocked" ? blockedMarker(entity.type) : entity.token;
    const forms = [entity.value, ...entity.aliases];
    for (const form of forms) {
      const trimmed = form.trim();
      if (!trimmed) continue;
      surfaces.push({
        text: trimmed,
        replacement,
        entityId: entity.id,
        value: trimmed,
      });
    }
  }

  // Longest first, so "Marceline Dubreuil" wins over the alias "Dubreuil".
  surfaces.sort((a, b) => b.text.length - a.text.length);

  const seen = new Set<string>();
  const unique = surfaces.filter((s) => {
    const key = s.text.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const lookup = new Map(unique.map((s) => [s.text.toLowerCase(), s.replacement]));

  const alternatives = unique.map((s) => {
    const needsLeftBoundary = /^[\p{L}\p{N}]/u.test(s.text);
    const needsRightBoundary = /[\p{L}\p{N}]$/u.test(s.text);
    const left = needsLeftBoundary ? "(?<![\\p{L}\\p{N}])" : "";
    const right = needsRightBoundary ? "(?![\\p{L}\\p{N}])" : "";
    return `${left}${flexibleSource(s.text)}${right}`;
  });

  const matcher =
    alternatives.length > 0 ? new RegExp(`(?:${alternatives.join("|")})`, "giu") : null;

  const decodeEntries = entities
    .filter((e) => e.level === "pseudonymized")
    .map((e) => [e.token, e.value] as const);
  const decodeMatcher =
    decodeEntries.length > 0
      ? new RegExp(decodeEntries.map(([t]) => escapeRegExp(t)).join("|"), "g")
      : null;
  const decodeLookup = new Map(decodeEntries);

  function apply(text: string): string {
    if (!matcher) return text;
    return text.replace(
      matcher,
      (match) => lookup.get(match.replace(/\s+/g, " ").toLowerCase()) ?? match,
    );
  }

  function verify(text: string): Leak[] {
    const leaks: Leak[] = [];
    for (const s of unique) {
      const re = new RegExp(flexibleSource(s.text), "iu");
      if (re.test(text)) leaks.push({ entityId: s.entityId, value: s.value });
    }
    return leaks;
  }

  function scrub(text: string): { text: string; leaks: Leak[] } {
    const first = apply(text);
    const leaks = verify(first);
    if (leaks.length === 0) return { text: first, leaks };

    // A residue means a surface form survived the boundary-aware pass, for
    // instance because it is glued to a letter. Fall back to a literal,
    // boundary-free replacement so the value cannot go out either way.
    let hardened = first;
    for (const s of unique) {
      hardened = hardened.replace(new RegExp(flexibleSource(s.text), "giu"), s.replacement);
    }
    return { text: hardened, leaks: verify(hardened) };
  }

  function decode(text: string): string {
    if (!decodeMatcher) return text;
    return text.replace(decodeMatcher, (match) => decodeLookup.get(match) ?? match);
  }

  return { apply, verify, scrub, decode, isIdentity: unique.length === 0 };
}
