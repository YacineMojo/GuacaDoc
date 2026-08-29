"use client";

import { setBudgetRatio } from "@/lib/actions";
import { PRODUCT_NAME } from "@/lib/branding";
import { downloadAuditLog } from "@/lib/export";
import { formatBytes, formatPercent } from "@/lib/format";
import { resetSession } from "@/lib/store";
import type { AppState } from "@/lib/store";
import { Button } from "./ui";

export function Header({
  state,
  webmcp,
  toolCount,
  tab,
  onTab,
}: {
  state: AppState;
  webmcp: boolean;
  toolCount: number;
  tab: string;
  onTab: (tab: string) => void;
}) {
  const tabs = ["Redaction", "Agent"];

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ink-900/95 backdrop-blur">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="block h-4 w-4 bg-stamp" aria-hidden />
          <span className="font-display text-sm font-semibold tracking-tight text-text">
            {PRODUCT_NAME}
          </span>
        </div>

        <div className="flex items-center gap-1.5" title={
          webmcp
            ? "This browser exposes document.modelContext, so the tools are live for an agent."
            : "No WebMCP in this browser. The tools are registered locally and the console below calls them the same way."
        }>
          <span className={`block h-1.5 w-1.5 rounded-full ${webmcp ? "bg-pass" : "bg-text-faint"}`} />
          <span className="label">
            webmcp {webmcp ? "live" : "absent"} · {toolCount} tools
          </span>
        </div>

        {state.doc && (
          <div className="mono flex min-w-0 items-center gap-2 text-[0.6875rem] text-text-dim">
            <span className="truncate text-text">{state.doc.name}</span>
            <span className="text-text-faint">
              {formatBytes(state.doc.byteLength)} · {state.doc.sections.length} sections ·{" "}
              {state.entities.length} entities
            </span>
          </div>
        )}

        <div className="ml-auto flex items-center gap-4">
          {state.doc && (
            <label className="flex items-center gap-2" title="Share of the extracted text an agent may consume this session">
              <span className="label">Budget</span>
              <input
                type="range"
                min={5}
                max={100}
                step={5}
                value={Math.round(state.budgetRatio * 100)}
                onChange={(e) => setBudgetRatio(Number(e.target.value) / 100)}
                className="w-24 accent-marker"
              />
              <span className="mono w-9 text-[0.6875rem] text-text tabular-nums">
                {formatPercent(state.budgetRatio, 0)}
              </span>
            </label>
          )}

          {state.doc && (
            <nav className="flex border border-line">
              {tabs.map((name) => (
                <button
                  key={name}
                  onClick={() => onTab(name)}
                  className={`border-r border-line px-3 py-1 font-display text-[0.6875rem] font-semibold tracking-[0.1em] uppercase last:border-r-0 ${
                    tab === name
                      ? "bg-text text-ink-900"
                      : "bg-ink-800 text-text-faint hover:text-text"
                  }`}
                >
                  {name}
                </button>
              ))}
            </nav>
          )}

          {state.doc && (
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={downloadAuditLog} title="Download the session record as JSON">
                Export log
              </Button>
              <Button size="sm" tone="ghost" onClick={resetSession} title="Discard the document and every trace of it">
                Clear
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
