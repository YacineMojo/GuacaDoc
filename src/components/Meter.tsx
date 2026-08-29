"use client";

import { formatBytes, formatPercent } from "@/lib/format";

const SEGMENTS = 40;

/**
 * The disclosure meter.
 *
 * The large number is the share of the budget spent, because that is the
 * number that decides whether the next call succeeds. The share of the whole
 * document sits underneath in bytes, because that is the number a person
 * actually worries about.
 */
export function Meter({
  usedRatio,
  bytesSpent,
  budget,
  documentRatio,
}: {
  usedRatio: number;
  bytesSpent: number;
  budget: number;
  documentRatio: number;
}) {
  const filled = Math.round(usedRatio * SEGMENTS);
  const exhausted = usedRatio >= 1;
  const tight = usedRatio >= 0.75;

  return (
    <div className="p-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="label">Budget spent</div>
          <div
            className={`font-display text-6xl leading-none font-semibold tracking-tighter tabular-nums ${
              exhausted ? "text-stamp" : tight ? "text-marker" : "text-text"
            }`}
          >
            {formatPercent(usedRatio, 1)}
          </div>
        </div>
        <div className="mono space-y-0.5 pb-1 text-right text-[0.6875rem] text-text-dim">
          <div>
            <span className="text-text">{formatBytes(bytesSpent)}</span> sent
          </div>
          <div>of {formatBytes(budget)} allowed</div>
          <div className="text-text-faint">
            {formatPercent(documentRatio, 1)} of the document
          </div>
        </div>
      </div>

      <div className="meter mt-4" aria-hidden>
        {Array.from({ length: SEGMENTS }, (_, i) => {
          const on = i < filled;
          const color = exhausted
            ? "var(--color-stamp)"
            : i >= SEGMENTS * 0.75
              ? "var(--color-stamp)"
              : i >= SEGMENTS * 0.5
                ? "var(--color-marker)"
                : "var(--color-pass)";
          return (
            <div
              key={i}
              className="meter-segment"
              style={{
                height: `${28 + (i / SEGMENTS) * 72}%`,
                backgroundColor: on ? color : undefined,
                opacity: on ? 1 : 0.35,
              }}
            />
          );
        })}
      </div>

      {exhausted && (
        <p className="mono mt-3 border-l-2 border-stamp bg-stamp/10 px-3 py-2 text-[0.6875rem] text-stamp">
          Budget spent. Read tools now refuse and say so. Raise the budget or
          start a new session to continue.
        </p>
      )}
    </div>
  );
}
