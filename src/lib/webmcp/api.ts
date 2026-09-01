"use client";

/**
 * Thin adapter over the WebMCP browser API.
 *
 * Two things happen on every registration: the tool goes to
 * document.modelContext when the browser exposes it, and it also goes into a
 * local registry. The local registry backs the in-page agent console, which
 * calls the exact same wrapped handlers. There is no separate "demo mode"
 * code path, so what the console shows is what a real agent gets.
 *
 * The two registries are never assumed to agree. registerTool() rejects for
 * reasons a page cannot predict — the name is already taken, the document is
 * not origin-isolated, the "tools" permission policy is off — and the worst
 * failure this project can have is a header that reads "live · 5 tools" while
 * the browser holds none: the agent then falls back to reading the screen and
 * the record stays empty, which looks exactly like the policy layer doing
 * nothing. So every outcome is captured, and where the browser offers
 * getTools() the count shown is the browser's answer, not our own hope.
 */

export interface McpToolResult {
  content: Array<{ type: "text"; text: string }>;
}

/** Spec: ToolAnnotations. Hints only, never a substitute for the wrapper. */
export interface McpToolAnnotations {
  readOnlyHint?: boolean;
  untrustedContentHint?: boolean;
}

/** Spec: ToolExecuteCallbackOptions. The signal aborts when the agent gives up. */
export interface McpExecuteOptions {
  signal?: AbortSignal;
}

export interface McpToolDescriptor {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: McpToolAnnotations;
  execute: (
    args: Record<string, unknown>,
    options?: McpExecuteOptions,
  ) => Promise<McpToolResult>;
}

export interface RegistrationOutcome {
  name: string;
  accepted: boolean;
  reason?: string;
}

interface RegisteredToolLike {
  name?: string;
}

interface ModelContextLike {
  registerTool?: (
    tool: McpToolDescriptor,
    options?: { signal?: AbortSignal },
  ) => Promise<unknown> | unknown;
  provideContext?: (context: { tools: McpToolDescriptor[] }) => Promise<unknown> | unknown;
  getTools?: (options?: unknown) => Promise<RegisteredToolLike[]>;
  requestUserInteraction?: (reason?: unknown) => Promise<unknown> | unknown;
}

declare global {
  interface Document {
    modelContext?: ModelContextLike;
  }
  interface Navigator {
    modelContext?: ModelContextLike;
  }
}

function modelContext(): ModelContextLike | null {
  if (typeof document === "undefined") return null;
  return document.modelContext ?? navigator.modelContext ?? null;
}

export function isWebMcpAvailable(): boolean {
  const ctx = modelContext();
  return Boolean(ctx && (ctx.registerTool || ctx.provideContext));
}

const localRegistry = new Map<string, McpToolDescriptor>();

export function localTools(): McpToolDescriptor[] {
  return [...localRegistry.values()];
}

export async function callLocalTool(
  name: string,
  args: Record<string, unknown>,
): Promise<McpToolResult> {
  const tool = localRegistry.get(name);
  if (!tool) throw new Error(`Unknown tool: ${name}`);
  return tool.execute(args);
}

/**
 * Registration is generational.
 *
 * The API has no unregisterTool(): a tool is withdrawn by aborting the signal
 * it was registered with. Each generation owns one controller, and starting a
 * generation aborts the one before it. Without that, a second mount re-offers
 * five names the browser already holds, every call is rejected with
 * InvalidStateError, and the page keeps claiming five live tools while the
 * browser is answering an older set of closures.
 */
let generation: AbortController | null = null;

export function beginRegistration(): AbortSignal {
  withdrawRegistration();
  generation = new AbortController();
  return generation.signal;
}

export function withdrawRegistration(): void {
  generation?.abort(new DOMException("Superseded by a new registration.", "AbortError"));
  generation = null;
  localRegistry.clear();
}

export async function registerWithBrowser(
  tool: McpToolDescriptor,
  signal: AbortSignal,
): Promise<RegistrationOutcome> {
  localRegistry.set(tool.name, tool);
  const ctx = modelContext();
  if (!ctx) {
    return { name: tool.name, accepted: false, reason: "no WebMCP in this browser" };
  }
  try {
    if (ctx.registerTool) {
      await ctx.registerTool(tool, { signal });
    } else if (ctx.provideContext) {
      await ctx.provideContext({ tools: localTools() });
    }
    return { name: tool.name, accepted: true };
  } catch (error) {
    if (signal.aborted) return { name: tool.name, accepted: false, reason: "withdrawn" };
    const reason =
      error instanceof DOMException
        ? `${error.name}: ${error.message}`
        : error instanceof Error
          ? error.message
          : String(error);
    return { name: tool.name, accepted: false, reason };
  }
}

/**
 * Asks the browser which tools it is actually holding.
 *
 * getTools() is the only answer that cannot be wrong, so it wins over our own
 * outcomes whenever the browser implements it.
 */
export async function toolsHeldByBrowser(): Promise<string[] | null> {
  const ctx = modelContext();
  if (!ctx?.getTools) return null;
  try {
    const tools = await ctx.getTools();
    return tools.map((tool) => String(tool?.name ?? "")).filter(Boolean);
  } catch {
    return null;
  }
}

/**
 * Asks the agent runtime to hand control back to the user.
 *
 * The browser API only brings the tab forward; the actual decision is taken
 * in our own modal, which is what the policy layer waits on. If the API is
 * missing the modal still runs, so consent never depends on the runtime.
 */
export async function requestUserInteraction(reason: string): Promise<void> {
  const ctx = modelContext();
  if (!ctx?.requestUserInteraction) return;
  try {
    await ctx.requestUserInteraction({ reason });
  } catch {
    // A runtime that refuses to yield does not change what happens next:
    // the modal is still shown and still blocks.
  }
}
