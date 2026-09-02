"use client";

import { useState } from "react";
import { callLocalTool, isWebMcpAvailable, localTools } from "@/lib/webmcp/api";
import { Button } from "./ui";

/**
 * An agent's seat at the table, inside the page.
 *
 * It calls the same registered tools through the same policy wrapper that a
 * browser agent goes through. There is no privileged path here: if the console
 * cannot see a value, neither can ChatGPT.
 *
 * It exists because WebMCP still needs a specific browser, and a reviewer
 * should be able to watch the policy layer work without one.
 */
export function AgentConsole() {
  const tools = localTools();
  const [selected, setSelected] = useState(tools[0]?.name ?? "");
  const [args, setArgs] = useState<Record<string, string>>({});
  const [response, setResponse] = useState<string>("");
  const [running, setRunning] = useState(false);

  const tool = tools.find((t) => t.name === selected) ?? tools[0];
  const properties = (tool?.inputSchema?.properties ?? {}) as Record<
    string,
    { type?: string; description?: string }
  >;

  async function run(name: string, callArgs: Record<string, unknown>) {
    setRunning(true);
    try {
      const result = await callLocalTool(name, callArgs);
      setResponse(result.content.map((c) => c.text).join("\n"));
    } catch (error) {
      setResponse(String(error));
    } finally {
      setRunning(false);
    }
  }

  function runSelected() {
    if (!tool) return;
    const parsed: Record<string, unknown> = {};
    for (const [key, raw] of Object.entries(args)) {
      if (raw === "") continue;
      parsed[key] = properties[key]?.type === "number" ? Number(raw) : raw;
    }
    void run(tool.name, parsed);
  }

  /**
   * Reads every section, one after another, and stops at nothing.
   *
   * That is the demonstration: there is no quota to hit. An agent may take the
   * whole document and still never learn a name, because what it receives was
   * substituted on the way out. The strip fills, the record grows, and the key
   * stays in the tab.
   */
  async function readEverySection() {
    setRunning(true);
    try {
      const outline = await callLocalTool("get_document_outline", {});
      const payload = JSON.parse(outline.content[0]?.text ?? "{}") as {
        sections?: Array<{ id: string }>;
      };
      for (const section of payload.sections ?? []) {
        const result = await callLocalTool("get_section", { id: section.id });
        setResponse(result.content.map((c) => c.text).join("\n"));
      }
    } catch (error) {
      setResponse(String(error));
    } finally {
      setRunning(false);
    }
  }

  /** A short scripted run, the way an agent would actually work a document. */
  async function runScenario() {
    setRunning(true);
    try {
      await callLocalTool("get_document_outline", {});
      const search = await callLocalTool("search_document", { query: "liability", limit: 3 });
      const payload = JSON.parse(search.content[0]?.text ?? "{}") as {
        hits?: Array<{ section_id: string }>;
      };
      for (const hit of (payload.hits ?? []).slice(0, 2)) {
        await callLocalTool("get_section", { id: hit.section_id });
      }
      const metrics = await callLocalTool("get_metrics", {});
      setResponse(metrics.content.map((c) => c.text).join("\n"));
    } catch (error) {
      setResponse(String(error));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 space-y-2.5 border-b border-line-soft p-3">
        <div className="flex items-center gap-2">
          <select
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              setArgs({});
              setResponse("");
            }}
            className="mono min-w-0 flex-1 rounded-[4px] border border-line bg-white px-2.5 py-1.5 text-xs text-text focus:border-guac focus:outline-none"
          >
            {tools.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>
          <Button onClick={runSelected} disabled={running || !tool} tone="primary">
            {running ? "…" : "Call"}
          </Button>
        </div>

        {tool && <p className="text-[0.6875rem] leading-relaxed text-text-faint">{tool.description}</p>}

        {Object.entries(properties).map(([key, schema]) => (
          <input
            key={key}
            value={args[key] ?? ""}
            onChange={(e) => setArgs((a) => ({ ...a, [key]: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Enter") runSelected();
            }}
            placeholder={`${key} — ${schema.description ?? schema.type ?? ""}`}
            className="mono w-full rounded-[4px] border border-line bg-white px-2.5 py-1.5 text-xs text-text placeholder:text-text-faint focus:border-guac focus:outline-none"
          />
        ))}

        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <Button size="sm" onClick={runScenario} disabled={running}>
            Sample investigation
          </Button>
          <Button size="sm" tone="stone" onClick={readEverySection} disabled={running}>
            Read every section
          </Button>
          <span className="label ml-auto">
            {isWebMcpAvailable() ? "browser agent connected" : "browser agent absent"}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-guac-wash p-3">
        {response ? (
          <pre className="mono text-[0.6875rem] leading-relaxed whitespace-pre-wrap text-text-dim">
            {response}
          </pre>
        ) : (
          <p className="mono text-[0.6875rem] leading-relaxed text-text-faint">
            Call a tool to see exactly what an agent would receive, after
            substitution and after the policy layer has had its say.
          </p>
        )}
      </div>
    </div>
  );
}
