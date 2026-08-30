"use client";

import { detectEntities, makeEntity, resetEntitySeq } from "./detect/index";
import { loadDocument, loadFromString } from "./extract/index";
import { resetTokenRegistry } from "./tokens";
import { DEMO_DOCUMENT, DEMO_DOCUMENT_NAME } from "./demo";
import { getState, resetSession, setState } from "./store";
import type { EntityType, LoadedDocument } from "./types";

/**
 * Loading a document resets the whole session, tokens included.
 *
 * Carrying a token registry across documents would let PERSON_01 mean two
 * different people in one audit trail, which would make the trail useless as
 * a record.
 */
function install(doc: LoadedDocument) {
  resetSession();
  resetTokenRegistry();
  resetEntitySeq();
  setState({ doc, entities: detectEntities(doc.text) });
}

export async function openFile(file: File): Promise<void> {
  install(await loadDocument(file));
}

export function openDemo(): void {
  install(loadFromString(DEMO_DOCUMENT_NAME, "md", DEMO_DOCUMENT));
}

/** Re-runs detection on the loaded text, keeping manual entities. */
export function rerunDetection(): void {
  const { doc, entities } = getState();
  if (!doc) return;
  const manual = entities.filter((e) => e.source === "manual");
  const detected = detectEntities(doc.text).filter(
    (d) => !manual.some((m) => m.key === d.key && m.type === d.type),
  );
  setState({ entities: [...manual, ...detected] });
}

export interface MarkResult {
  ok: boolean;
  message: string;
}

function spansCoveredBy(inner: Array<[number, number]>, outer: Array<[number, number]>): boolean {
  return inner.every(([s, e]) => outer.some(([os, oe]) => s >= os && e <= oe));
}

/**
 * Adds an entity the user selected by hand.
 *
 * The important part is absorption. Selecting "9 rue des Ateliers, 59300
 * Vaubercourt" when the town is already its own entity has to produce one
 * token for the whole address, not a long entity fighting a short one for the
 * same characters. Any existing entity that lives entirely inside the new
 * selection is folded into it and dropped.
 */
export function addManualEntity(value: string, type: EntityType): MarkResult {
  const { doc, entities } = getState();
  if (!doc) return { ok: false, message: "No document is open." };

  const trimmed = value.replace(/\s+/g, " ").trim().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
  if (trimmed.length < 2) {
    return { ok: false, message: "Select at least two characters to mark." };
  }

  const entity = makeEntity(type, trimmed, doc.text, "manual");
  if (entity.spans.length === 0) {
    return {
      ok: false,
      message: `"${clip(trimmed)}" could not be located in the text. Try selecting it without the surrounding punctuation.`,
    };
  }

  const duplicate = entities.find((e) => e.type === type && e.key === entity.key);
  if (duplicate) {
    return { ok: false, message: `"${clip(trimmed)}" is already marked as ${type}.` };
  }

  const absorbed = entities.filter((e) => spansCoveredBy(e.spans, entity.spans));
  const kept = entities.filter((e) => !absorbed.includes(e));

  // An entity that also appears elsewhere keeps its own mark there. The longer
  // selection still wins wherever the two overlap, so nothing is left exposed.
  const partial = kept.filter((e) =>
    e.spans.some(([s2, e2]) => entity.spans.some(([os, oe]) => s2 >= os && e2 <= oe)),
  );

  setState({ entities: [...kept, entity] });

  const parts = [`Marked "${clip(trimmed)}" as ${type}.`];
  if (absorbed.length > 0) {
    parts.push(`Folded in ${absorbed.length} mark${absorbed.length > 1 ? "s" : ""} that sat inside it.`);
  }
  if (partial.length > 0) {
    parts.push(
      `${partial.length} of them also appear elsewhere, so they keep their own mark there.`,
    );
  }
  if (absorbed.length === 0 && partial.length === 0) {
    parts.push(`Found ${entity.spans.length} time${entity.spans.length > 1 ? "s" : ""}.`);
  }
  return { ok: true, message: parts.join(" ") };
}

function clip(value: string): string {
  return value.length > 44 ? value.slice(0, 44) + "…" : value;
}

export function setBudgetRatio(ratio: number) {
  setState({ budgetRatio: Math.max(0.01, Math.min(1, ratio)) });
}
