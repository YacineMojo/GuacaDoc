"use client";

import { buildRedactor } from "../redact";
import { searchSections } from "../search";
import { registerToolWithPolicy } from "../policy/wrapper";
import { addFinding, documentServedRatio, getState, setState } from "../store";
import { beginRegistration, toolsHeldByBrowser, withdrawRegistration } from "./api";
import type { RegistrationOutcome } from "./api";

/**
 * The whole tool surface. Four reads and one write, and that is on purpose.
 *
 * There is no get_full_text and there never will be: a tool that returns the
 * document defeats every layer above it. Descriptions are one plain sentence.
 * They ask for restraint, but restraint is not what enforces anything here.
 * The wrapper does. A model that ignores every word below still receives
 * pseudonyms instead of names, still cannot see a blocked value, and still
 * leaves every byte it took on the record.
 */

const PER_CALL_CAP = 4096;

/**
 * Registers the whole surface and reports what the browser accepted.
 *
 * Returns a disposer. Calling it withdraws the tools, which is the only way
 * back out: the API has no unregisterTool(), so a registration is revoked by
 * aborting the signal it was made with. Without that, a second mount offers
 * five names the browser already holds, every one is refused with
 * InvalidStateError, and the page goes on advertising tools that an agent is
 * being answered on by an older set of closures.
 */
export function registerAllTools(): () => void {
  const signal = beginRegistration();
  const pending: Array<Promise<RegistrationOutcome>> = [];

  pending.push(registerToolWithPolicy(
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
      // document is not a disclosure of its contents, and counting it as
      // served text would overstate what an agent actually read.
      freeKeys: ["title"],
    },
    signal,
  ));

  pending.push(registerToolWithPolicy<{ query: string; limit?: number }>(
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
    signal,
  ));

  pending.push(registerToolWithPolicy<{ id: string }>(
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
    signal,
  ));

  pending.push(registerToolWithPolicy(
    {
      name: "get_metrics",
      description: "Report how much of the document has been served to an agent so far.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      handler: () => {
        const state = getState();
        return {
          bytes_served: state.bytesServed,
          document_bytes: state.doc?.byteLength ?? 0,
          document_served_ratio: Number(documentServedRatio(state).toFixed(4)),
          calls_made: state.audit.filter((event) => !event.boundary).length,
        };
      },
    },
    { access: "read", maxBytesPerCall: PER_CALL_CAP, substitute: true, requireConfirmation: false },
    signal,
  ));

  pending.push(registerToolWithPolicy<{ section_id: string; note: string }>(
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
    signal,
  ));

  setState({ toolsRegistered: true });
  void publishRegistrationReport(pending, signal);

  return () => {
    withdrawRegistration();
    setState({ toolsRegistered: false, browserTools: null });
  };
}

/**
 * Publishes what the browser did with the offer.
 *
 * getTools() is asked first, because it is the browser's own answer and the
 * only one that cannot be wrong. Where it is missing, the outcome of each
 * registerTool() call stands in. Either way the number in the header is a
 * measurement, not an assumption, so "live · 5 tools" above an empty record
 * becomes impossible.
 */
async function publishRegistrationReport(
  pending: Array<Promise<RegistrationOutcome>>,
  signal: AbortSignal,
): Promise<void> {
  const outcomes = await Promise.all(pending);
  if (signal.aborted) return;

  const held = await toolsHeldByBrowser();
  if (signal.aborted) return;

  const offered = outcomes.map((o) => o.name);
  const accepted = held ? held.filter((name) => offered.includes(name)) : outcomes.filter((o) => o.accepted).map((o) => o.name);
  const rejected = outcomes
    .filter((o) => !accepted.includes(o.name))
    .map((o) => ({ name: o.name, reason: o.reason ?? "the browser did not keep this tool" }));

  setState({
    browserTools:
      held === null && rejected.length === outcomes.length && rejected.every((r) => r.reason === "no WebMCP in this browser")
        ? null
        : { accepted, rejected, verified: held !== null },
  });
}
