"use client";

import { budgetBytes, getState } from "./store";

/**
 * Session record, for filing or for a reviewer.
 *
 * It deliberately does not contain a single source value. Exporting the
 * mapping would put the very data this tool keeps in the tab onto a disk, and
 * the audit trail does not need it: tokens are enough to follow what happened.
 */
export function buildAuditExport() {
  const state = getState();
  return {
    tool: "redaction gateway session record",
    exported_at: new Date().toISOString(),
    note: "Source values are intentionally absent. Tokens identify entities without disclosing them.",
    document: state.doc
      ? {
          name: state.doc.name,
          kind: state.doc.kind,
          bytes: state.doc.byteLength,
          sections: state.doc.sections.length,
          loaded_at: state.doc.loadedAt,
        }
      : null,
    budget: {
      ratio_of_document: state.budgetRatio,
      bytes: budgetBytes(state),
      bytes_spent: state.bytesSpent,
    },
    entities: state.entities.map((e) => ({
      token: e.level === "blocked" ? null : e.token,
      type: e.type,
      level: e.level,
      occurrences: e.spans.length,
      alias_forms: e.aliases.length,
      detected_by: e.source,
    })),
    calls: state.audit.map((event) => ({
      seq: event.seq,
      at: event.ts,
      tool: event.tool,
      arguments: event.args,
      decision: event.decision,
      billable_bytes: event.bytes,
      detail: event.detail ?? null,
    })),
    transmissions: state.transmitted.map((chunk) => ({
      seq: chunk.seq,
      at: chunk.ts,
      tool: chunk.tool,
      bytes: chunk.bytes,
      redacted_text: chunk.text,
    })),
    findings: state.findings,
    blocked_runtime_attempts: state.violations,
  };
}

export function downloadAuditLog() {
  const blob = new Blob([JSON.stringify(buildAuditExport(), null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `session-record-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
