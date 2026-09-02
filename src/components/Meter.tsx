"use client";

import { AvocadoMeter } from "./Avocado";
import { formatBytes, formatPercent } from "@/lib/format";

/**
 * The disclosure meter.
 *
 * It measures, it does not ration. Nothing here caps what an agent may read,
 * because a document served as pseudonyms is not made safer by being served
 * in smaller pieces: what protects it is that the names never left. So the
 * percentage is of the whole file, which is the number a person actually
 * worries about, and the stone in the middle of the drawing never fills and
 * carries the count of values withheld outright — the one part of the
 * document that is never served, in the picture and in the policy alike.
 */
export function Meter({
  servedRatio,
  bytesServed,
  documentBytes,
  withheldCount,
}: {
  servedRatio: number;
  bytesServed: number;
  documentBytes: number;
  withheldCount: number;
}) {
  return (
    <div className="flex items-center gap-5 p-5">
      <div className="shrink-0 text-center">
        <AvocadoMeter servedRatio={servedRatio} withheldCount={withheldCount} size={116} />
        <p className="label mt-1.5 text-stone">{withheldCount} withheld</p>
      </div>

      <div className="min-w-0 flex-1">
        <div className="label">Of the file, served</div>
        <div className="font-display text-5xl leading-none font-semibold tracking-[-0.03em] text-rind tabular-nums">
          {formatPercent(servedRatio, 1)}
        </div>

        <dl className="mono mt-3 space-y-0.5 text-[0.6875rem] text-text-dim">
          <div>
            <span className="text-text">{formatBytes(bytesServed)}</span> of{" "}
            {formatBytes(documentBytes)} in the file
          </div>
          <div className="text-text-faint">
            {withheldCount > 0
              ? `${withheldCount} value${withheldCount > 1 ? "s" : ""} can never be part of it`
              : "every value in this file is pseudonymized, none is withheld"}
          </div>
        </dl>
      </div>
    </div>
  );
}
