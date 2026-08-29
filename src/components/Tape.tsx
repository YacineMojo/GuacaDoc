"use client";

import { useEffect, useRef } from "react";
import { formatBytes, formatClock } from "@/lib/format";
import type { AuditEvent, TransmittedChunk } from "@/lib/types";
import { Empty } from "./ui";

/**
 * Everything that has actually left the tab, printed in order.
 *
 * Refusals are printed too, in red, on the same strip. A gap in the tape would
 * be the one thing a person could not audit, so there are no gaps: a call that
 * returned nothing still leaves a mark.
 */
export function Tape({
  chunks,
  audit,
}: {
  chunks: TransmittedChunk[];
  audit: AuditEvent[];
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  const refusals = audit.filter(
    (event) => event.decision === "budget_exceeded" || event.decision === "cancelled",
  );

  const cells = [
    ...chunks.map((chunk) => ({
      key: `t${chunk.seq}`,
      ts: chunk.ts,
      tool: chunk.tool,
      body: chunk.text,
      meta: formatBytes(chunk.bytes),
      blocked: false,
    })),
    ...refusals.map((event) => ({
      key: `a${event.seq}`,
      ts: event.ts,
      tool: event.tool,
      body:
        event.decision === "cancelled"
          ? "Declined by the user. Nothing was returned."
          : "Refused: the answer would not fit the remaining budget. Nothing was returned.",
      meta: "0 B",
      blocked: true,
    })),
  ].sort((a, b) => a.ts.localeCompare(b.ts));

  useEffect(() => {
    const track = trackRef.current;
    if (track) track.scrollLeft = track.scrollWidth;
  }, [cells.length]);

  return (
    <div className="tape relative">
      <div ref={trackRef} className="tape-track py-2.5">
        {cells.length === 0 ? (
          <div className="w-full py-6 text-center font-mono text-[0.6875rem] text-paper-ink/45">
            Nothing has left this tab yet.
          </div>
        ) : (
          cells.map((cell) => (
            <div
              key={cell.key}
              className={`tape-cell ${cell.blocked ? "tape-cell-blocked" : ""}`}
            >
              <div
                className={`mb-1.5 flex items-center gap-2 text-[0.5625rem] font-semibold tracking-[0.14em] uppercase ${
                  cell.blocked ? "text-paper/75" : "text-paper-ink/45"
                }`}
              >
                <span>{formatClock(cell.ts)}</span>
                <span>{cell.tool}</span>
                <span>{cell.meta}</span>
              </div>
              {cell.body}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function TapeEmpty() {
  return <Empty>No transmissions yet.</Empty>;
}
