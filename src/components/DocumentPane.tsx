"use client";

import { useMemo, useRef, useState } from "react";
import { addManualEntity } from "@/lib/actions";
import { TYPE_LABELS } from "@/lib/detect/index";
import { setEntityLevel } from "@/lib/store";
import type { Entity, EntityLevel, EntityType } from "@/lib/types";
import { Empty } from "./ui";

const NEXT_LEVEL: Record<EntityLevel, EntityLevel> = {
  visible: "pseudonymized",
  pseudonymized: "blocked",
  blocked: "visible",
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

const MANUAL_TYPES: EntityType[] = ["person", "org", "location", "reference", "id", "custom"];

export function DocumentPane({ text, entities }: { text: string; entities: Entity[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<{ value: string; x: number; y: number } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const segments = useMemo(() => buildSegments(text, entities), [text, entities]);

  function captureSelection() {
    const sel = window.getSelection();
    const value = sel?.toString() ?? "";
    if (!sel || value.trim().length < 2 || !containerRef.current) {
      setSelection(null);
      return;
    }
    if (!containerRef.current.contains(sel.anchorNode)) {
      setSelection(null);
      return;
    }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    const host = containerRef.current.getBoundingClientRect();
    setSelection({
      value: value.trim(),
      x: rect.left - host.left + rect.width / 2,
      y: rect.top - host.top + containerRef.current.scrollTop,
    });
  }

  function add(type: EntityType) {
    if (!selection) return;
    const ok = addManualEntity(selection.value, type);
    setNotice(
      ok
        ? `Added "${truncate(selection.value)}" as ${TYPE_LABELS[type].toLowerCase()}.`
        : `"${truncate(selection.value)}" is already covered.`,
    );
    setSelection(null);
    window.getSelection()?.removeAllRanges();
    window.setTimeout(() => setNotice(null), 3200);
  }

  if (!text) return <Empty>Nothing loaded.</Empty>;

  return (
    <div className="relative h-full">
      <div
        ref={containerRef}
        onMouseUp={captureSelection}
        className="paper h-full overflow-auto px-8 py-7 whitespace-pre-wrap"
      >
        {segments.map((segment, i) =>
          segment.entity ? (
            <span
              key={i}
              className={`mark mark-${segment.entity.level}`}
              title={`${TYPE_LABELS[segment.entity.type]} · ${segment.entity.level} · click to change`}
              onClick={() => setEntityLevel(segment.entity!.id, NEXT_LEVEL[segment.entity!.level])}
            >
              {segment.text}
            </span>
          ) : (
            <span key={i}>{segment.text}</span>
          ),
        )}

        {selection && (
          <div
            className="absolute z-20 -translate-x-1/2 -translate-y-full pb-2"
            style={{ left: selection.x, top: selection.y }}
          >
            <div className="panel flex items-center gap-1 px-2 py-1.5 shadow-lg">
              <span className="label mr-1">Mark as</span>
              {MANUAL_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => add(type)}
                  className="mono rounded-[3px] border border-line bg-white px-1.5 py-0.5 text-[0.6875rem] text-text hover:bg-guac-wash"
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {notice && (
        <p className="mono absolute right-3 bottom-3 rounded-[4px] border border-line bg-white px-3 py-1.5 text-[0.6875rem] text-text-dim shadow-sm">
          {notice}
        </p>
      )}
    </div>
  );
}

function truncate(s: string): string {
  return s.length > 40 ? s.slice(0, 40) + "…" : s;
}
