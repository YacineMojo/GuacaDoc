"use client";

import { buildRedactor } from "../redact";
import {
  budgetBytes,
  bytesRemaining,
  documentConsumedRatio,
  getState,
  recordAudit,
  recordTransmission,
  recordViolation,
} from "../store";
import {
  registerWithBrowser,
  type McpExecuteOptions,
  type McpToolResult,
  type RegistrationOutcome,
} from "../webmcp/api";
import { requestConfirmation } from "./confirm";
import { scrubAndMeasure, truncateToFit } from "./measure";
import type { ToolDefinition, ToolPolicy } from "./types";

/**
 * The one place a tool becomes reachable by an agent.
 *
 * Nothing registers a tool directly. Every handler is wrapped here, and the
 * wrapper is what applies substitution, counts bytes, enforces the budget,
 * asks for consent on writes and writes the audit line. A handler that
 * returned the entire document would still be scrubbed and would still be
 * refused for going over budget, because the handler is not the thing that
 * talks to the agent: this function is.
 */

function pack(payload: unknown): McpToolResult {
  return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
}

/** Attached to every answer so the agent can pace itself. Never billed. */
function metricsField() {
  const state = getState();
  const total = budgetBytes(state);
  return {
    _metrics: {
      budget_bytes: total,
      bytes_used: state.bytesSpent,
      bytes_remaining: bytesRemaining(state),
      budget_used_ratio: total > 0 ? Number((state.bytesSpent / total).toFixed(4)) : 0,
      document_consumed_ratio: Number(documentConsumedRatio(state).toFixed(4)),
    },
  };
}

export function registerToolWithPolicy<Args extends Record<string, unknown>>(
  definition: ToolDefinition<Args>,
  policy: ToolPolicy,
  signal: AbortSignal,
): Promise<RegistrationOutcome> {
  async function execute(
    rawArgs: Record<string, unknown>,
    options?: McpExecuteOptions,
  ): Promise<McpToolResult> {
    const args = (rawArgs ?? {}) as Args;
    const state = getState();

    if (!state.doc) {
      recordAudit({ tool: definition.name, args, decision: "denied", bytes: 0, detail: "no document loaded" });
      return pack({
        ok: false,
        reason: "no_document",
        hint: "The user has not loaded a document yet.",
        ...metricsField(),
      });
    }

    if (policy.requireConfirmation) {
      const outcome = await requestConfirmation(
        definition.name,
        summarizeArgs(definition.name, args),
      );
      // Nobody was asked, so nobody declined. Saying otherwise would put a
      // refusal in the record that no person ever made, and would tell the
      // agent to give up on an action the user has not seen.
      if (outcome === "busy") {
        recordAudit({
          tool: definition.name,
          args,
          decision: "denied",
          bytes: 0,
          detail: "another approval was already open — nobody was asked",
        });
        return pack({
          ok: false,
          reason: "confirmation_busy",
          hint: "Another action is waiting for the user's approval. Nothing was decided about this one. Retry it once the earlier action has been answered, and send write calls one at a time.",
          ...metricsField(),
        });
      }
      if (outcome === "declined") {
        recordAudit({ tool: definition.name, args, decision: "cancelled", bytes: 0, detail: "user declined" });
        return pack({
          ok: false,
          reason: "declined_by_user",
          hint: "The user declined this action. Do not retry it.",
          ...metricsField(),
        });
      }
    }

    const remainingBefore = bytesRemaining();
    if (policy.access === "read" && remainingBefore <= 0) {
      recordAudit({
        tool: definition.name,
        args,
        decision: "budget_exceeded",
        bytes: 0,
        detail: "budget already exhausted",
      });
      return pack({
        ok: false,
        reason: "budget_exhausted",
        hint: "The disclosure budget for this session is spent. No further document content can be returned. Answer from what you already have, or ask the user to raise the budget.",
        ...metricsField(),
      });
    }

    let raw: unknown;
    try {
      raw = await definition.handler(args);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      recordAudit({ tool: definition.name, args, decision: "error", bytes: 0, detail });
      return pack({ ok: false, reason: "tool_error", hint: detail, ...metricsField() });
    }

    // Substitution is applied here, on the way out, to the whole result tree.
    // Handlers have no say in it.
    const redactor = policy.substitute
      ? buildRedactor(getState().entities)
      : buildRedactor([]);

    const { result, truncated } = truncateToFit(
      raw,
      redactor,
      policy.maxBytesPerCall,
      policy.freeKeys ?? [],
    );

    if (result.leaks.length > 0) {
      // The second pass in scrub() already neutralized these. Surfacing them
      // matters anyway: it means a detection rule needs work.
      recordViolation(
        "redaction",
        `${result.leaks.length} residual match(es) for a non-visible value in ${definition.name}`,
      );
    }

    if (result.billableBytes > bytesRemaining()) {
      recordAudit({
        tool: definition.name,
        args,
        decision: "budget_exceeded",
        bytes: 0,
        detail: `needed ${result.billableBytes} B, ${bytesRemaining()} B left`,
      });
      return pack({
        ok: false,
        reason: "budget_exceeded",
        bytes_required: result.billableBytes,
        bytes_remaining: bytesRemaining(),
        hint: "This answer is larger than the remaining budget, so nothing was returned. Narrow the request: search for a specific term, or ask for a single section.",
        ...metricsField(),
      });
    }

    // An agent that gave up mid-call never receives this answer: the runtime
    // discards it. Billing it would spend the budget on bytes that did not
    // leave, and the strip would show text nobody read.
    if (options?.signal?.aborted) {
      recordAudit({
        tool: definition.name,
        args,
        decision: "cancelled",
        bytes: 0,
        detail: "the agent abandoned the call before the answer was served",
      });
      return pack({
        ok: false,
        reason: "aborted",
        hint: "The call was cancelled before it returned. Nothing was disclosed and nothing was charged.",
        ...metricsField(),
      });
    }

    const payload = result.value as Record<string, unknown>;
    if (result.billableBytes > 0) {
      recordTransmission({
        tool: definition.name,
        text: result.billableTexts.join("\n"),
        bytes: result.billableBytes,
      });
    }

    recordAudit({
      tool: definition.name,
      args,
      decision: truncated ? "truncated" : "allowed",
      bytes: result.billableBytes,
      detail: truncated ? `capped at ${policy.maxBytesPerCall} B per call` : undefined,
    });

    return pack({ ok: true, ...payload, ...metricsField() });
  }

  return registerWithBrowser(
    {
      name: definition.name,
      description: definition.description,
      inputSchema: definition.inputSchema,
      // Hints for the agent's own planning. They describe the tool; they do
      // not enforce anything, which is the wrapper's job either way.
      annotations: {
        readOnlyHint: policy.access === "read",
        untrustedContentHint: true,
      },
      execute,
    },
    signal,
  );
}

function summarizeArgs(tool: string, args: Record<string, unknown>): string {
  const parts = Object.entries(args).map(([k, v]) => `${k}: ${truncateForDisplay(String(v))}`);
  return parts.length ? `${tool} — ${parts.join(", ")}` : tool;
}

function truncateForDisplay(value: string): string {
  return value.length > 160 ? value.slice(0, 160) + "…" : value;
}

/** Measures a result without registering anything. Used by the preview pane. */
export function previewCost(value: unknown): number {
  const redactor = buildRedactor(getState().entities);
  return scrubAndMeasure(value, redactor).billableBytes;
}
