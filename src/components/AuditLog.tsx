"use client";

import { formatBytes, formatClock } from "@/lib/format";
import type { AuditEvent, PolicyDecision } from "@/lib/types";
import { Empty } from "./ui";

const DECISION_STYLE: Record<PolicyDecision, string> = {
  allowed: "text-pass border-pass-dim",
  truncated: "text-marker border-marker-dim",
  budget_exceeded: "text-stamp border-stamp-dim",
  denied: "text-stamp border-stamp-dim",
  cancelled: "text-marker border-marker-dim",
  error: "text-stamp border-stamp-dim",
};

export function AuditLog({ audit }: { audit: AuditEvent[] }) {
  if (audit.length === 0) {
    return <Empty>No tool has been called yet.</Empty>;
  }

  return (
    <ul className="mono divide-y divide-line-soft text-[0.6875rem]">
      {[...audit].reverse().map((event) => {
        const refused = event.decision !== "allowed" && event.decision !== "truncated";
        return (
          <li
            key={event.seq}
            className={`px-3 py-2 ${refused ? "bg-stamp/[0.06]" : ""}`}
          >
            <div className="flex items-center gap-2">
              <span className="text-text-faint tabular-nums">
                {String(event.seq).padStart(3, "0")}
              </span>
              <span className="text-text-faint">{formatClock(event.ts)}</span>
              <span className="flex-1 truncate text-text">{event.tool}</span>
              <span className="text-text-dim tabular-nums">{formatBytes(event.bytes)}</span>
              <span
                className={`border px-1.5 py-px text-[0.5625rem] font-semibold tracking-wider uppercase ${DECISION_STYLE[event.decision]}`}
              >
                {event.decision.replace(/_/g, " ")}
              </span>
            </div>
            {(Object.keys(event.args ?? {}).length > 0 || event.detail) && (
              <div className="mt-1 truncate pl-6 text-text-faint">
                {Object.keys(event.args ?? {}).length > 0 && (
                  <span>{JSON.stringify(event.args)}</span>
                )}
                {event.detail && <span className="text-stamp"> — {event.detail}</span>}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
