"use client";

import { useEffect, useRef } from "react";
import { formatBytes, formatClock } from "@/lib/format";
import type { AuditEvent, TransmittedChunk } from "@/lib/types";

/**
 * Everything that has actually left the tab, served in order.
 *
 * Refusals are served too, on the same strip, in the brown of the stone. A gap
 * would be the one thing a person could not audit, so there are no gaps: a
 * call that returned nothing still leaves a mark.
 */
export function Strip({ chunks, audit }: { chunks: TransmittedChunk[]; audit: AuditEvent[] }) {
  const trackRef = useRef<HTMLDivElement>(null);

  const refusals = audit.filter((event) => event.decision === "cancelled");

  const cells = [
    ...chunks.map((chunk) => ({
      key: `t${chunk.seq}`,
      ts: chunk.ts,
      tool: chunk.tool,
      body: chunk.text,
      meta: formatBytes(chunk.bytes),
      withheld: false,
    })),
    ...refusals.map((event) => ({
      key: `a${event.seq}`,
      ts: event.ts,
      tool: event.tool,
      body: "Declined by you. Nothing was returned.",
      meta: "0 B",
      withheld: true,
    })),
  ].sort((a, b) => a.ts.localeCompare(b.ts));

  useEffect(() => {
    const track = trackRef.current;
    if (track) track.scrollLeft = track.scrollWidth;
  }, [cells.length]);

  return (
    <div className="strip h-full">
      <div ref={trackRef} className="strip-track">
        {cells.length === 0 ? (
          <div className="mono w-full self-center px-6 text-center text-[0.6875rem] text-text-faint">
            Nothing has left this tab yet.
          </div>
        ) : (
          cells.map((cell) => (
            <div key={cell.key} className={`strip-cell ${cell.withheld ? "strip-cell-withheld" : ""}`}>
              <div
                className={`mb-2 flex items-center gap-2 font-display text-[0.5625rem] font-semibold tracking-[0.12em] uppercase ${
                  cell.withheld ? "text-stone-text/75" : "text-text-faint"
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
