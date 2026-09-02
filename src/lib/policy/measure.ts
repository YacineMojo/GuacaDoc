import type { Redactor, Leak } from "../redact";

/**
 * Walks a tool result, scrubs every string in it and counts what leaves.
 *
 * Nothing is capped by this count any more; it is what the strip and the
 * record report. The rule stays fail-safe all the same: a string is counted
 * unless its key is on the structural list, so forgetting to classify a new
 * field overstates what left rather than hiding it. The opposite default
 * would let a careless handler slip document text past the record under a
 * structural-looking name.
 */

const STRUCTURAL_KEYS = new Set([
  "id",
  "ids",
  "section_id",
  "section_ids",
  "parent_id",
  "level",
  "type",
  "kind",
  "status",
  "ok",
  "reason",
  "hint",
  "unit",
]);

export interface MeasuredResult {
  value: unknown;
  /** Bytes of document text this answer put in front of the agent. */
  servedBytes: number;
  /** The scrubbed strings that were counted, for the live feed. */
  servedTexts: string[];
  /** Source values that survived the first substitution pass, if any. */
  leaks: Leak[];
}

function utf8Length(s: string): number {
  return new TextEncoder().encode(s).length;
}

export function scrubAndMeasure(
  value: unknown,
  redactor: Redactor,
  freeKeys: readonly string[] = [],
): MeasuredResult {
  const exempt = new Set([...STRUCTURAL_KEYS, ...freeKeys]);
  const servedTexts: string[] = [];
  const leaks: Leak[] = [];
  let servedBytes = 0;

  function walk(node: unknown, key: string | null, counted: boolean): unknown {
    if (typeof node === "string") {
      const { text, leaks: found } = redactor.scrub(node);
      if (found.length) leaks.push(...found);
      if (counted) {
        servedBytes += utf8Length(text);
        servedTexts.push(text);
      }
      return text;
    }
    if (Array.isArray(node)) {
      return node.map((item) => walk(item, key, counted));
    }
    if (node && typeof node === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        out[k] = walk(v, k, counted && !exempt.has(k));
      }
      return out;
    }
    return node;
  }

  const scrubbed = walk(value, null, true);
  return { value: scrubbed, servedBytes, servedTexts, leaks };
}

/**
 * Trims the largest counted string until the result fits the per-call cap.
 *
 * The cap is about response size, not about how much an agent may see over a
 * session: there is no such limit. Truncating beats refusing, because a
 * partial section still tells the agent whether the rest is worth asking for.
 */
export function truncateToFit(
  value: unknown,
  redactor: Redactor,
  cap: number,
  freeKeys: readonly string[] = [],
): { result: MeasuredResult; truncated: boolean } {
  let measured = scrubAndMeasure(value, redactor, freeKeys);
  if (measured.servedBytes <= cap) return { result: measured, truncated: false };

  const clone = JSON.parse(JSON.stringify(value)) as unknown;
  let guard = 0;

  while (measured.servedBytes > cap && guard++ < 40) {
    const overshoot = measured.servedBytes - cap;
    const target = findLongestString(clone);
    if (!target) break;
    const current = target.get();
    const keep = Math.max(0, current.length - overshoot - 24);
    if (keep >= current.length) break;
    target.set(current.slice(0, keep).trimEnd() + " […truncated]");
    measured = scrubAndMeasure(clone, redactor, freeKeys);
  }

  return { result: measured, truncated: true };
}

interface StringSlot {
  get: () => string;
  set: (v: string) => void;
  length: number;
}

function findLongestString(root: unknown): StringSlot | null {
  let best: StringSlot | null = null;

  function walk(node: unknown) {
    if (Array.isArray(node)) {
      node.forEach((item, i) => {
        if (typeof item === "string") {
          if (!best || item.length > best.length) {
            best = { get: () => node[i] as string, set: (v) => (node[i] = v), length: item.length };
          }
        } else walk(item);
      });
      return;
    }
    if (node && typeof node === "object") {
      const obj = node as Record<string, unknown>;
      for (const [k, v] of Object.entries(obj)) {
        if (typeof v === "string") {
          if (!best || v.length > best.length) {
            best = { get: () => obj[k] as string, set: (nv) => (obj[k] = nv), length: v.length };
          }
        } else walk(v);
      }
    }
  }

  walk(root);
  return best;
}
