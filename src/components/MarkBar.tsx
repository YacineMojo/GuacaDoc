"use client";

import { useEffect } from "react";
import { addManualEntity } from "@/lib/actions";
import { setNotice } from "@/lib/store";
import type { AppState } from "@/lib/store";
import { clearBrowserSelection } from "@/lib/useSelection";
import type { EntityType } from "@/lib/types";

/**
 * The marking bar lives in the top bar and never moves.
 *
 * It replaced a popover that appeared next to the selection, which failed in
 * two ways: it missed selections that ended outside the text pane, and it
 * covered the very words you were about to classify. A fixed target is slower
 * to reach and easier to trust.
 */
const TYPES: Array<{ type: EntityType; label: string }> = [
  { type: "person", label: "Person" },
  { type: "org", label: "Company" },
  { type: "location", label: "Address" },
  { type: "reference", label: "Reference" },
  { type: "id", label: "Number" },
  { type: "custom", label: "Other" },
];

export function MarkBar({ state }: { state: AppState }) {
  const { selection, notice } = state;

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function mark(type: EntityType) {
    if (!selection) return;
    const result = addManualEntity(selection, type);
    setNotice({ text: result.message, ok: result.ok });
    clearBrowserSelection();
  }

  return (
    <div className="flex min-h-9 flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-line bg-guac-wash px-4 py-1.5">
      <span className="label shrink-0">Mark selection as</span>

      {selection ? (
        <code className="mono max-w-[22rem] truncate rounded-[3px] border border-line bg-white px-2 py-0.5 text-[0.6875rem] text-rind">
          {selection}
        </code>
      ) : (
        <span className="text-[0.6875rem] text-text-faint">
          Select any text in your document, then choose what it is.
        </span>
      )}

      <div className="flex flex-wrap items-center gap-1">
        {TYPES.map(({ type, label }) => (
          <button
            key={type}
            onClick={() => mark(type)}
            disabled={!selection}
            className="rounded-[3px] border border-line bg-white px-2 py-0.5 font-display text-[0.625rem] font-semibold tracking-[0.06em] uppercase text-text-dim transition-colors enabled:hover:border-guac enabled:hover:bg-guac enabled:hover:text-white disabled:opacity-40"
          >
            {label}
          </button>
        ))}
      </div>

      {notice && (
        <span
          className={`ml-auto max-w-[36rem] truncate text-[0.6875rem] ${
            notice.ok ? "text-guac-dark" : "text-stone"
          }`}
        >
          {notice.text}
        </span>
      )}
    </div>
  );
}
