/** Shared domain types. Everything here lives in tab memory only. */

export type EntityType =
  | "person"
  | "org"
  | "email"
  | "phone"
  | "iban"
  | "card"
  | "date"
  | "amount"
  | "reference"
  | "location"
  | "id"
  | "custom";

/**
 * What happens to an entity when a tool result leaves the tab.
 * - visible: sent as-is
 * - pseudonymized: sent as a stable token
 * - blocked: never sent, in any form
 */
export type EntityLevel = "visible" | "pseudonymized" | "blocked";

export type EntitySource = "regex" | "heuristic" | "manual";

export interface Entity {
  id: string;
  type: EntityType;
  /** Exact source string as it appears in the document. */
  value: string;
  /** Normalized key. Two entities sharing it share a token. */
  key: string;
  token: string;
  /**
   * Extra surface forms that map to the same token, such as the surname alone
   * for a full name. Free text rarely repeats an entity in its full form.
   */
  aliases: string[];
  level: EntityLevel;
  source: EntitySource;
  /** Character offsets of every occurrence in the extracted text. */
  spans: Array<[number, number]>;
}

export interface Section {
  id: string;
  title: string;
  /** Heading depth, 1 = top level. 0 means untitled preamble. */
  level: number;
  /** Raw source text of the section body, heading excluded. */
  text: string;
  start: number;
  end: number;
}

export interface LoadedDocument {
  name: string;
  kind: "txt" | "md" | "pdf" | "docx";
  /** Extracted plain text. Never leaves the tab as a whole. */
  text: string;
  sections: Section[];
  byteLength: number;
  loadedAt: string;
}

export type PolicyDecision =
  | "allowed"
  | "truncated"
  | "denied"
  | "cancelled"
  | "error";

export interface AuditEvent {
  seq: number;
  ts: string;
  tool: string;
  args: unknown;
  decision: PolicyDecision;
  /** Bytes of document text this call actually served. */
  bytes: number;
  detail?: string;
  /**
   * Set on a session boundary rather than a tool call.
   *
   * Loading a document restarts the byte count and the token registry, so
   * calls either side of it are not comparable. The record keeps both and marks the
   * seam, because dropping the earlier calls is how an agent's first probes
   * used to vanish from a trail that claims to have no gaps.
   */
  boundary?: boolean;
}

/** One chunk of text that really left the tab, for the live feed. */
export interface TransmittedChunk {
  seq: number;
  ts: string;
  tool: string;
  text: string;
  bytes: number;
}

/** An observation the agent asked to write back, after user confirmation. */
export interface Finding {
  id: string;
  ts: string;
  sectionId: string;
  note: string;
}
