"use client";

import type {
  AuditEvent,
  Entity,
  Finding,
  LoadedDocument,
  PolicyDecision,
  TransmittedChunk,
} from "./types";

/**
 * The whole application state, held in a module-level singleton.
 *
 * Two reasons it is not React state:
 *  - WebMCP tool handlers run outside the React tree and need the current
 *    value synchronously, not a snapshot captured in a closure.
 *  - It makes the "memory only" rule easy to audit: this object is the
 *    single place data lives, and nothing here is ever serialized to disk.
 */
export interface AppState {
  doc: LoadedDocument | null;
  entities: Entity[];
  /** Share of the extracted text the agent may consume, 0..1. */
  budgetRatio: number;
  bytesSpent: number;
  audit: AuditEvent[];
  transmitted: TransmittedChunk[];
  findings: Finding[];
  toolsRegistered: boolean;
  /** Blocked attempts to reach the network or persistent storage. */
  violations: Array<{ ts: string; api: string; detail: string }>;
  /** Text currently selected in the document, for the marking bar. */
  selection: string | null;
  /** Transient feedback for the marking bar. */
  notice: { text: string; ok: boolean } | null;
  /** Pending confirmation prompt raised by a write tool. */
  pendingConfirmation: {
    id: string;
    tool: string;
    summary: string;
    resolve: (approved: boolean) => void;
  } | null;
}

const initialState: AppState = {
  doc: null,
  entities: [],
  budgetRatio: 0.3,
  bytesSpent: 0,
  audit: [],
  transmitted: [],
  findings: [],
  toolsRegistered: false,
  violations: [],
  selection: null,
  notice: null,
  pendingConfirmation: null,
};

let state: AppState = initialState;
const listeners = new Set<() => void>();

export function getState(): AppState {
  return state;
}

export function setState(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
  const next = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...next };
  for (const l of listeners) l();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Wipes the document, the entities and every trace of the session.
 *
 * Two things survive, because neither is session data: the budget the user
 * chose, and the fact that the tools are registered with the browser. Clearing
 * the latter would tell the interface the tools are gone while they are still
 * live in document.modelContext.
 */
export function resetSession() {
  state = {
    ...initialState,
    budgetRatio: state.budgetRatio,
    toolsRegistered: state.toolsRegistered,
  };
  for (const l of listeners) l();
}

// --- derived values -------------------------------------------------------

export function budgetBytes(s: AppState = state): number {
  return s.doc ? Math.floor(s.doc.byteLength * s.budgetRatio) : 0;
}

export function bytesRemaining(s: AppState = state): number {
  return Math.max(0, budgetBytes(s) - s.bytesSpent);
}

export function consumedRatio(s: AppState = state): number {
  const total = budgetBytes(s);
  if (total <= 0) return 0;
  return Math.min(1, s.bytesSpent / total);
}

/** Share of the whole document that has been transmitted, not of the budget. */
export function documentConsumedRatio(s: AppState = state): number {
  if (!s.doc || s.doc.byteLength === 0) return 0;
  return Math.min(1, s.bytesSpent / s.doc.byteLength);
}

// --- mutations ------------------------------------------------------------

let auditSeq = 0;

export function recordAudit(event: {
  tool: string;
  args: unknown;
  decision: PolicyDecision;
  bytes: number;
  detail?: string;
}): AuditEvent {
  const entry: AuditEvent = {
    seq: ++auditSeq,
    ts: new Date().toISOString(),
    ...event,
  };
  setState((s) => ({ audit: [...s.audit, entry] }));
  return entry;
}

export function recordTransmission(chunk: Omit<TransmittedChunk, "seq" | "ts">) {
  setState((s) => ({
    transmitted: [
      ...s.transmitted.slice(-199),
      { ...chunk, seq: s.transmitted.length + 1, ts: new Date().toISOString() },
    ],
    bytesSpent: s.bytesSpent + chunk.bytes,
  }));
}

export function recordViolation(api: string, detail: string) {
  setState((s) => ({
    violations: [...s.violations, { ts: new Date().toISOString(), api, detail }],
  }));
}

export function setEntityLevel(id: string, level: Entity["level"]) {
  setState((s) => ({
    entities: s.entities.map((e) => (e.id === id ? { ...e, level } : e)),
  }));
}

/** Applies a level to every entity of a given type at once. */
export function setTypeLevel(type: Entity["type"], level: Entity["level"]) {
  setState((s) => ({
    entities: s.entities.map((e) => (e.type === type ? { ...e, level } : e)),
  }));
}

export function removeEntity(id: string) {
  setState((s) => ({ entities: s.entities.filter((e) => e.id !== id) }));
}

export function setSelection(selection: string | null) {
  if (getState().selection === selection) return;
  setState({ selection });
}

export function setNotice(notice: AppState["notice"]) {
  setState({ notice });
}

export function addFinding(finding: Finding) {
  setState((s) => ({ findings: [...s.findings, finding] }));
}
