"use client";

/**
 * Thin adapter over the WebMCP browser API.
 *
 * Two things happen on every registration: the tool goes to
 * document.modelContext when the browser exposes it, and it also goes into a
 * local registry. The local registry backs the in-page agent console, which
 * calls the exact same wrapped handlers. There is no separate "demo mode"
 * code path, so what the console shows is what a real agent gets.
 */

export interface McpToolResult {
  content: Array<{ type: "text"; text: string }>;
}

export interface McpToolDescriptor {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<McpToolResult>;
}

interface ModelContextLike {
  registerTool?: (tool: McpToolDescriptor, options?: unknown) => Promise<unknown> | unknown;
  provideContext?: (context: { tools: McpToolDescriptor[] }) => Promise<unknown> | unknown;
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

export async function registerWithBrowser(tool: McpToolDescriptor): Promise<void> {
  localRegistry.set(tool.name, tool);
  const ctx = modelContext();
  if (!ctx) return;
  try {
    if (ctx.registerTool) {
      await ctx.registerTool(tool);
    } else if (ctx.provideContext) {
      await ctx.provideContext({ tools: localTools() });
    }
  } catch (error) {
    console.warn(`[webmcp] registration failed for ${tool.name}`, error);
  }
}

export function clearLocalRegistry() {
  localRegistry.clear();
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
