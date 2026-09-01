"use client";

import { setBudgetRatio } from "@/lib/actions";
import { PRODUCT_NAME } from "@/lib/branding";
import { downloadAuditLog } from "@/lib/export";
import { formatBytes, formatPercent } from "@/lib/format";
import { resetSession } from "@/lib/store";
import type { AppState } from "@/lib/store";
import { GuacaMark } from "./Avocado";
import { MarkBar } from "./MarkBar";
import { Button } from "./ui";

export function Header({
  state,
  webmcp,
  toolCount,
  tab,
  onTab,
  entitiesOpen,
  onToggleEntities,
  unseenCount,
}: {
  state: AppState;
  webmcp: boolean;
  toolCount: number;
  tab: string;
  onTab: (tab: string) => void;
  entitiesOpen: boolean;
  onToggleEntities: () => void;
  /** Calls answered since the record was last on screen. */
  unseenCount: number;
}) {
  const tabs = ["Document", "Agent"];
  // The dot answers one question: can an agent call anything? A page reporting
  // "live" while the browser holds none of these tools is the exact failure
  // this indicator exists to make impossible.
  const reachable = webmcp && toolCount > 0;

  return (
    <header className="z-30 shrink-0">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line bg-white px-4 py-2.5">
        <a href="/" className="flex items-center gap-2.5" title="Back to the front page">
          <GuacaMark size={23} />
          <span className="font-display text-sm font-semibold tracking-tight text-rind">
            {PRODUCT_NAME}
          </span>
        </a>

        <div
          className="flex items-center gap-1.5"
          title={
            reachable
              ? "This browser exposes document.modelContext and is holding these tools, so an agent can call them directly. It can also read what is on screen."
              : webmcp
                ? "This browser exposes document.modelContext but is holding none of these tools, so an agent has nothing to call and its work cannot appear in the record."
                : "No WebMCP in this browser. The tools are registered locally and the console calls them the same way."
          }
        >
          <span className={`block h-1.5 w-1.5 rounded-full ${reachable ? "bg-guac" : "bg-line"}`} />
          <span className="label">
            webmcp {webmcp ? "live" : "absent"} · {toolCount} tools
          </span>
        </div>

        {state.doc && (
          <div className="mono flex min-w-0 items-center gap-2 text-[0.6875rem] text-text-dim">
            <span className="truncate text-text">{state.doc.name}</span>
            <span className="text-text-faint">
              {formatBytes(state.doc.byteLength)} · {state.doc.sections.length} sections
            </span>
          </div>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-4">
          {state.doc && (
            <label
              className="flex items-center gap-2"
              title="Share of the file an agent may consume this session"
            >
              <span className="label">Budget</span>
              <input
                type="range"
                min={5}
                max={100}
                step={5}
                value={Math.round(state.budgetRatio * 100)}
                onChange={(e) => setBudgetRatio(Number(e.target.value) / 100)}
                className="w-24 accent-guac-dark"
              />
              <span className="mono w-9 text-[0.6875rem] tabular-nums">
                {formatPercent(state.budgetRatio, 0)}
              </span>
            </label>
          )}

          {state.doc && (
            <nav className="flex overflow-hidden rounded-[4px] border border-line">
              {tabs.map((name) => (
                <button
                  key={name}
                  onClick={() => onTab(name)}
                  className={`flex items-center gap-1.5 border-r border-line px-3.5 py-1.5 font-display text-[0.6875rem] font-semibold tracking-[0.08em] uppercase last:border-r-0 ${
                    tab === name ? "bg-rind text-white" : "bg-white text-text-faint hover:text-text"
                  }`}
                >
                  {name}
                  {/*
                    The count sits on the tab that holds the record, so the way
                    to clear it is to go and read it. It is never a red dot:
                    a call the policy answered is the system working.
                  */}
                  {name === "Agent" && unseenCount > 0 && tab !== "Agent" && (
                    <span
                      title={`${unseenCount} call${unseenCount > 1 ? "s" : ""} you have not looked at`}
                      className="mono rounded-full bg-guac px-1.5 text-[0.625rem] leading-[1.4] font-normal tracking-normal text-white"
                    >
                      {unseenCount}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          )}

          {state.doc && tab === "Document" && (
            <Button
              size="sm"
              tone={entitiesOpen ? "primary" : "neutral"}
              onClick={onToggleEntities}
              title="Show or hide everything detected in this file"
            >
              Found {state.entities.length}
            </Button>
          )}

          {state.doc && (
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={downloadAuditLog} title="Download the session record as JSON">
                Export record
              </Button>
              <Button
                size="sm"
                tone="ghost"
                onClick={resetSession}
                title="Discard the document and every trace of it"
              >
                Clear
              </Button>
            </div>
          )}
        </div>
      </div>

      {state.doc && tab === "Document" && <MarkBar state={state} />}
    </header>
  );
}
