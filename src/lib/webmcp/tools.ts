"use client";

import { buildRedactor } from "../redact";
import { searchSections } from "../search";
import { registerToolWithPolicy } from "../policy/wrapper";
import {
  addFinding,
  budgetBytes,
  bytesRemaining,
  documentConsumedRatio,
  getState,
  setState,
} from "../store";
import { clearLocalRegistry } from "./api";

/**
 * The whole tool surface. Four reads and one write, and that is on purpose.
 *
 * There is no get_full_text and there never will be: a tool that returns the
 * document defeats every layer above it. Descriptions are one plain sentence.
 * They ask for restraint, but restraint is not what enforces anything here.
 * The wrapper does. A model that ignores every word below still cannot get
 * more than the budget allows, and still cannot see a blocked value.
 */

const PER_CALL_CAP = 4096;

export function registerAllTools(): void {
  clearLocalRegistry();

  registerToolWithPolicy(
    {
      name: "get_document_outline",
      description:
        "List the document's sections with their identifiers and sizes, without any body text.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      handler: () => {
        const { doc } = getState();
        if (!doc) return { sections: [] };
        return {
          document_kind: doc.kind,
          section_count: doc.sections.length,
          sections: doc.sections.map((s) => ({
            id: s.id,
            level: s.level,
            title: s.title,
            chars: s.text.length,
          })),
        };
      },
    },
    {
      access: "read",
      maxBytesPerCall: PER_CALL_CAP,
      substitute: true,
      requireConfirmation: false,
      // The outline is structure. Titles are still redacted, but a map of the
      // document is not a disclosure of its contents, and charging for it
      // would push agents to skip the cheap step and read sections blind.
      freeKeys: ["title"],
    },
  );

  registerToolWithPolicy<{ query: string; limit?: number }>(
    {
      name: "search_document",
      description:
        "Find which sections mention a term and get a short excerpt from each; prefer this before reading a section.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Words to look for." },
          limit: { type: "number", description: "Maximum sections to return, default 5." },
        },
        required: ["query"],
        additionalProperties: false,
      },
      handler: ({ query, limit }) => {
        const state = getState();
        if (!state.doc) return { hits: [] };
        const redactor = buildRedactor(state.entities);
        const capped = Math.max(1, Math.min(10, Math.floor(limit ?? 5)));
        const hits = searchSections(state.doc.sections, redactor, String(query ?? ""), capped);
        return {
          query: String(query ?? ""),
          hit_count: hits.length,
          hits,
          ...(hits.length === 0
            ? {
                hint: "No section matched. Note that search runs on the redacted text, so real names and blocked values are not findable by design.",
              }
            : {}),
        };
      },
    },
    {
      access: "read",
      maxBytesPerCall: PER_CALL_CAP,
      substitute: true,
      requireConfirmation: false,
      // The query came from the agent and the titles are structure; only the
      // snippets are new information leaving the tab.
      freeKeys: ["query", "title"],
    },
  );

  registerToolWithPolicy<{ id: string }>(
    {
      name: "get_section",
      description: "Return the text of one section, identified by the id from the outline.",
      inputSchema: {
        type: "object",
        properties: { id: { type: "string", description: "Section id, for example s03." } },
        required: ["id"],
        additionalProperties: false,
      },
      handler: ({ id }) => {
        const state = getState();
        const section = state.doc?.sections.find((s) => s.id === String(id));
        if (!section) {
          return {
            hint: `No section with id ${String(id)}. Call get_document_outline for the valid ids.`,
          };
        }
        return {
          id: section.id,
          level: section.level,
          title: section.title,
          text: section.text,
        };
      },
    },
    { access: "read", maxBytesPerCall: PER_CALL_CAP, substitute: true, requireConfirmation: false },
  );

  registerToolWithPolicy(
    {
      name: "get_metrics",
      description: "Report how much of the disclosure budget this session has used.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      handler: () => {
        const state = getState();
        return {
          budget_bytes: budgetBytes(state),
          bytes_used: state.bytesSpent,
          bytes_remaining: bytesRemaining(state),
          document_bytes: state.doc?.byteLength ?? 0,
          document_consumed_ratio: Number(documentConsumedRatio(state).toFixed(4)),
          calls_made: state.audit.length,
        };
      },
    },
    { access: "read", maxBytesPerCall: PER_CALL_CAP, substitute: true, requireConfirmation: false },
  );

  registerToolWithPolicy<{ section_id: string; note: string }>(
    {
      name: "add_finding",
      description: "Record one observation against a section; the user must approve it first.",
      inputSchema: {
        type: "object",
        properties: {
          section_id: { type: "string", description: "Section the observation is about." },
          note: { type: "string", description: "One short observation." },
        },
        required: ["section_id", "note"],
        additionalProperties: false,
      },
      handler: ({ section_id, note }) => {
        const state = getState();
        const section = state.doc?.sections.find((s) => s.id === String(section_id));
        if (!section) {
          return { hint: `No section with id ${String(section_id)}.` };
        }
        addFinding({
          id: `f${state.findings.length + 1}`,
          ts: new Date().toISOString(),
          sectionId: section.id,
          note: String(note ?? "").slice(0, 600),
        });
        return { id: section.id, status: "recorded" };
      },
    },
    { access: "write", maxBytesPerCall: PER_CALL_CAP, substitute: true, requireConfirmation: true },
  );

  setState({ toolsRegistered: true });
}
