"use client";

import { useMemo } from "react";
import { buildRedactor } from "@/lib/redact";
import type { Entity } from "@/lib/types";
import { Empty } from "./ui";

const SPLIT = /(\[[A-Z]+_\d{2,}\]|\[BLOCKED_[A-Z]+\])/g;

/**
 * The right-hand mirror: the same document as the agent would receive it.
 *
 * It is rendered from the same redactor the tools use, not from a separate
 * preview routine, so what is shown here cannot drift from what is sent.
 */
export function AgentPane({ text, entities }: { text: string; entities: Entity[] }) {
  const redacted = useMemo(() => buildRedactor(entities).apply(text), [text, entities]);
  const parts = useMemo(() => redacted.split(SPLIT), [redacted]);

  if (!text) return <Empty>Nothing loaded.</Empty>;

  return (
    <div className="mono h-full overflow-auto bg-ink-900 px-6 py-6 text-xs leading-relaxed whitespace-pre-wrap text-text-dim">
      {parts.map((part, i) => {
        if (/^\[BLOCKED_[A-Z]+\]$/.test(part)) {
          return (
            <span key={i} className="bg-stamp px-1 font-medium text-paper">
              {part}
            </span>
          );
        }
        if (/^\[[A-Z]+_\d{2,}\]$/.test(part)) {
          return (
            <span key={i} className="bg-marker/20 px-1 font-medium text-marker">
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
}
