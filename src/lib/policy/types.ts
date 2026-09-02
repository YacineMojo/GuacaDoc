/** How a single tool is allowed to answer. */
export interface ToolPolicy {
  /** Read tools return content. Write tools change state and need consent. */
  access: "read" | "write";
  /**
   * Hard ceiling on served bytes for one call. Responses above it are
   * truncated rather than refused, so the agent still gets something usable.
   */
  maxBytesPerCall: number;
  /** Outbound substitution. Kept explicit so the audit trail can show it. */
  substitute: boolean;
  /** Route through requestUserInteraction() before doing anything. */
  requireConfirmation: boolean;
  /**
   * Extra response keys this tool may return without being counted as
   * document text that left the tab.
   *
   * Only for fields that are structure rather than content: section titles in
   * the outline, or the query string echoed back to the agent that sent it.
   * Declared per tool, in the open, so the exemption is auditable. Everything
   * not listed here or in the global structural set is counted as served.
   */
  freeKeys?: string[];
}

export interface ToolDefinition<Args = Record<string, unknown>> {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: Args) => Promise<unknown> | unknown;
}

/** The shape every tool answers with, success or refusal. */
export interface ToolEnvelope {
  ok: boolean;
  [key: string]: unknown;
}
