"use client";

import { formatBytes, formatClock } from "@/lib/format";
import type { AuditEvent, PolicyDecision } from "@/lib/types";
import { Empty } from "./ui";

/**
 * There is no red in this interface. A refusal is not a failure, it is the
 * policy working, so it wears the brown of the stone rather than an alarm
 * colour.
 */
const DECISION_STYLE: Record<PolicyDecision, string> = {
  allowed: "text-guac-dark border-guac/45 bg-guac-wash",
  truncated: "text-leaf border-leaf/35 bg-flesh/45",
  budget_exceeded: "text-stone-text border-stone bg-stone",
  denied: "text-stone-text border-stone bg-stone",
  cancelled: "text-stone border-stone-soft bg-stone-soft/40",
  error: "text-stone-text border-stone bg-stone",
};

export function AuditLog({ audit }: { audit: AuditEvent[] }) {
  if (audit.length === 0) {
    return <Empty>No tool has been called yet.</Empty>;
  }

  return (
    <ul className="mono divide-y divide-line-soft text-[0.6875rem]">
      {[...audit].reverse().map((event) => {
        if (event.boundary) {
          // Not a call: the seam where a document was opened and the budget
          // and tokens restarted. Calls either side of it are not comparable,
          // and hiding the seam would be worse than showing it.
          return (
            <li key={event.seq} className="flex items-center gap-2 bg-guac-wash px-3 py-1.5">
              <span className="text-text-faint tabular-nums">
                {String(event.seq).padStart(3, "0")}
              </span>
              <span className="text-text-faint">{formatClock(event.ts)}</span>
              <span className="h-px flex-1 bg-guac/40" />
              <span className="truncate text-guac-dark">{event.tool}</span>
            </li>
          );
        }
        const refused = event.decision !== "allowed" && event.decision !== "truncated";
        return (
          <li key={event.seq} className={`px-3 py-2 ${refused ? "bg-stone-soft/20" : ""}`}>
            <div className="flex items-center gap-2">
              <span className="text-text-faint tabular-nums">
                {String(event.seq).padStart(3, "0")}
              </span>
              <span className="text-text-faint">{formatClock(event.ts)}</span>
              <span className="flex-1 truncate text-text">{event.tool}</span>
              <span className="text-text-dim tabular-nums">{formatBytes(event.bytes)}</span>
              <span
                className={`rounded-[3px] border px-1.5 py-px font-display text-[0.5625rem] font-semibold tracking-[0.06em] uppercase ${DECISION_STYLE[event.decision]}`}
              >
                {event.decision.replace(/_/g, " ")}
              </span>
            </div>
            {(Object.keys(event.args ?? {}).length > 0 || event.detail) && (
              <div className="mt-1 truncate pl-6 text-text-faint">
                {Object.keys(event.args ?? {}).length > 0 && <span>{JSON.stringify(event.args)}</span>}
                {event.detail && <span className="text-stone"> — {event.detail}</span>}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
