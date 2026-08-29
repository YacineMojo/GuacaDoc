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

/** Adds an entity the user selected by hand in the document pane. */
export function addManualEntity(value: string, type: EntityType): boolean {
  const { doc, entities } = getState();
  if (!doc) return false;
  const trimmed = value.trim();
  if (trimmed.length < 2) return false;

  const entity = makeEntity(type, trimmed, doc.text, "manual");
  if (entity.spans.length === 0) return false;

  const duplicate = entities.find((e) => e.type === type && e.key === entity.key);
  if (duplicate) return false;

  setState({ entities: [...entities, entity] });
  return true;
}

export function setBudgetRatio(ratio: number) {
  setState({ budgetRatio: Math.max(0.01, Math.min(1, ratio)) });
}
