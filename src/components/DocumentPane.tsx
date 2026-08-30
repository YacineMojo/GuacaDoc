"use client";

import { forwardRef, useMemo } from "react";
import { TYPE_LABELS } from "@/lib/detect/index";
import { setEntityLevel } from "@/lib/store";
import type { Entity, EntityLevel } from "@/lib/types";

const NEXT_LEVEL: Record<EntityLevel, EntityLevel> = {
  visible: "pseudonymized",
  pseudonymized: "blocked",
  blocked: "visible",
};

const LEVEL_WORD: Record<EntityLevel, string> = {
  visible: "sent as written",
  pseudonymized: "sent as a token",
  blocked: "never sent",
};

interface Segment {
  text: string;
  entity?: Entity;
}

/** Flattens entity spans into a non-overlapping list of renderable segments. */
function buildSegments(text: string, entities: Entity[]): Segment[] {
  const spans: Array<{ start: number; end: number; entity: Entity }> = [];
  for (const entity of entities) {
    for (const [start, end] of entity.spans) spans.push({ start, end, entity });
  }
  // Longest first at the same offset, so an address wins over the town inside it.
  spans.sort((a, b) => a.start - b.start || b.end - a.end);

  const segments: Segment[] = [];
  let cursor = 0;
  for (const span of spans) {
    if (span.start < cursor) continue;
    if (span.start > cursor) segments.push({ text: text.slice(cursor, span.start) });
    segments.push({ text: text.slice(span.start, span.end), entity: span.entity });
    cursor = span.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) });
  return segments;
}

export const DocumentPane = forwardRef<
  HTMLDivElement,
  { text: string; entities: Entity[]; onScroll?: () => void }
>(function DocumentPane({ text, entities, onScroll }, ref) {
  const segments = useMemo(() => buildSegments(text, entities), [text, entities]);

  return (
    <div
      ref={ref}
      onScroll={onScroll}
      data-document-surface
      className="paper h-full overflow-auto px-8 py-7 whitespace-pre-wrap"
    >
      {segments.map((segment, i) =>
        segment.entity ? (
          <span
            key={i}
            className={`mark mark-${segment.entity.level}`}
            title={`${TYPE_LABELS[segment.entity.type]} · ${LEVEL_WORD[segment.entity.level]} · click to change`}
            onClick={() => setEntityLevel(segment.entity!.id, NEXT_LEVEL[segment.entity!.level])}
          >
            {segment.text}
          </span>
        ) : (
          <span key={i}>{segment.text}</span>
        ),
      )}
    </div>
  );
});
