"use client";

import { useMemo } from "react";
import { buildRedactor } from "@/lib/redact";
import type { Entity } from "@/lib/types";
import { Empty } from "./ui";

const SPLIT = /(\[[A-Z]+_\d{2,}\]|\[BLOCKED_[A-Z]+\])/g;

/**
 * The mirror: the same document as an agent would receive it.
 *
 * Rendered from the same redactor the tools use, not from a separate preview
 * routine, so what is shown here cannot drift from what is sent.
 */
export function AgentPane({ text, entities }: { text: string; entities: Entity[] }) {
  const redacted = useMemo(() => buildRedactor(entities).apply(text), [text, entities]);
  const parts = useMemo(() => redacted.split(SPLIT), [redacted]);

  if (!text) return <Empty>Nothing loaded.</Empty>;

  return (
    <div className="machine h-full overflow-auto px-6 py-6 text-xs leading-relaxed whitespace-pre-wrap">
      {parts.map((part, i) => {
        if (/^\[BLOCKED_[A-Z]+\]$/.test(part)) {
          return (
            <span key={i} className="machine-stone">
              {part}
            </span>
          );
        }
        if (/^\[[A-Z]+_\d{2,}\]$/.test(part)) {
          return (
            <span key={i} className="machine-token">
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
}
