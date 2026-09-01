"use client";

import type {
  AuditEvent,
  Entity,
  Finding,
  LoadedDocument,
  PolicyDecision,
  TransmittedChunk,
} from "./types";
import { DEFAULT_BUDGET_RATIO } from "./policy/measure";

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
  /**
   * What the browser actually holds, as opposed to what was offered to it.
   *
   * null means no WebMCP in this browser. Anything else is the outcome of the
   * last registration pass, verified with getTools() where the browser has it.
   * The interface reads this rather than the local registry, so it cannot
   * announce tools an agent has no way to call.
   */
  browserTools: {
    accepted: string[];
    rejected: Array<{ name: string; reason: string }>;
    /** True when getTools() answered, rather than us trusting our own calls. */
    verified: boolean;
  } | null;
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
  budgetRatio: DEFAULT_BUDGET_RATIO,
  bytesSpent: 0,
  audit: [],
  transmitted: [],
  findings: [],
  toolsRegistered: false,
  browserTools: null,
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
 * This is the Clear button and nothing else: a deliberate delete, where losing
 * the record is the point. Loading a document goes through startDocument(),
 * which keeps the record.
 *
 * Three things survive, because none of them is session data: the budget the
 * user chose, and the two facts about registration. Clearing those would tell
 * the interface the tools are gone while they are still live in
 * document.modelContext.
 */
export function resetSession() {
  const pending = state.pendingConfirmation;
  state = {
    ...initialState,
    budgetRatio: state.budgetRatio,
    toolsRegistered: state.toolsRegistered,
    browserTools: state.browserTools,
  };
  for (const l of listeners) l();
  // A tool call suspended on the modal would otherwise never settle, and a
  // call that never returns is a call that never reaches the record.
  pending?.resolve(false);
}

/**
 * Starts a session on a new document while keeping the record of every call
 * already answered.
 *
 * The budget, the transmitted feed and the token registry all restart: they
 * describe one document and mean nothing across two. The audit trail does not
 * restart. An agent attached to this tab typically probes the tools before the
 * user has opened anything, and wiping those calls on load is what used to
 * make them disappear from a record advertised as gapless. The seam is marked
 * instead.
 */
export function startDocument(doc: LoadedDocument) {
  const pending = state.pendingConfirmation;
  const audit = state.audit;
  state = {
    ...initialState,
    budgetRatio: state.budgetRatio,
    toolsRegistered: state.toolsRegistered,
    browserTools: state.browserTools,
    audit,
  };
  for (const l of listeners) l();
  pending?.resolve(false);
  if (audit.length > 0) {
    recordAudit({
      tool: doc.name,
      args: {},
      decision: "allowed",
      bytes: 0,
      detail: "document opened — budget and tokens restart here",
      boundary: true,
    });
  }
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
  boundary?: boolean;
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
