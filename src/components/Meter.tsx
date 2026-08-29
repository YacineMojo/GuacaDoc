"use client";

import { AvocadoMeter } from "./Avocado";
import { formatBytes, formatPercent } from "@/lib/format";

/**
 * The disclosure meter.
 *
 * The percentage is of the budget, because that is the number that decides
 * whether the next call succeeds. The share of the whole file sits underneath,
 * because that is the number a person actually worries about. The stone in the
 * middle of the drawing never fills and carries the count of values withheld
 * outright: the one part of the document that is never served.
 */
export function Meter({
  usedRatio,
  bytesSpent,
  budget,
  documentRatio,
  withheldCount,
}: {
  usedRatio: number;
  bytesSpent: number;
  budget: number;
  documentRatio: number;
  withheldCount: number;
}) {
  const exhausted = usedRatio >= 1;
  const tight = usedRatio >= 0.75;

  return (
    <div className="flex items-center gap-5 p-5">
      <div className="shrink-0 text-center">
        <AvocadoMeter spentRatio={usedRatio} withheldCount={withheldCount} size={116} />
        <p className="label mt-1.5 text-stone">
          {withheldCount} withheld
        </p>
      </div>

      <div className="min-w-0 flex-1">
        <div className="label">Budget spent</div>
        <div
          className={`font-display text-5xl leading-none font-semibold tracking-[-0.03em] tabular-nums ${
            exhausted ? "text-stone" : tight ? "text-guac-dark" : "text-rind"
          }`}
        >
          {formatPercent(usedRatio, 1)}
        </div>

        <dl className="mono mt-3 space-y-0.5 text-[0.6875rem] text-text-dim">
          <div>
            <span className="text-text">{formatBytes(bytesSpent)}</span> of {formatBytes(budget)}{" "}
            allowed
          </div>
          <div className="text-text-faint">{formatPercent(documentRatio, 1)} of the whole file</div>
        </dl>

        {exhausted && (
          <p className="mt-3 rounded-[4px] border-l-[3px] border-stone bg-stone-soft/35 px-3 py-2 text-[0.6875rem] leading-relaxed text-stone">
            Nothing more can be served. Raise the budget in the header, or start again with a new
            file.
          </p>
        )}
      </div>
    </div>
  );
}
