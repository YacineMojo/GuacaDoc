"use client";

import { useCallback, useRef } from "react";
import { AvocadoWhole, GuacamoleBowl } from "./Avocado";
import { AgentPane } from "./AgentPane";
import { DocumentPane } from "./DocumentPane";
import type { Entity } from "@/lib/types";

/**
 * The two documents, side by side, scrolled together.
 *
 * Side by side wherever there is room: the whole point is comparison, and a
 * comparison you have to scroll between is not one. Below lg there is no room,
 * so they stack at a fixed fraction of the small viewport, which keeps both
 * documents and both scrollbars on screen at once. Because substitution
 * changes the length of the text, the panes are synchronised on scroll ratio
 * rather than on pixel offset, so the same clause stays roughly opposite
 * itself either way.
 */
export function SplitDocument({ text, entities }: { text: string; entities: Entity[] }) {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const driver = useRef<"left" | "right" | null>(null);

  const sync = useCallback((from: "left" | "right") => {
    if (driver.current && driver.current !== from) return;
    driver.current = from;

    const source = from === "left" ? leftRef.current : rightRef.current;
    const target = from === "left" ? rightRef.current : leftRef.current;
    if (source && target) {
      const sourceRange = source.scrollHeight - source.clientHeight;
      const targetRange = target.scrollHeight - target.clientHeight;
      const ratio = sourceRange > 0 ? source.scrollTop / sourceRange : 0;
      target.scrollTop = ratio * targetRange;
    }

    requestAnimationFrame(() => {
      driver.current = null;
    });
  }, []);

  return (
    <div className="grid min-h-0 grid-cols-1 gap-px bg-line lg:h-full lg:grid-cols-2">
      <section className="flex min-h-0 flex-col bg-white">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line-soft px-4 py-2.5">
          <div className="flex items-center gap-2">
            <AvocadoWhole size={17} />
            <h2 className="label">Your document</h2>
          </div>
          <span className="label">click a mark to change it</span>
        </header>
        <div className="h-[45svh] min-h-0 lg:h-auto lg:flex-1">
          <DocumentPane
            ref={leftRef}
            text={text}
            entities={entities}
            onScroll={() => sync("left")}
          />
        </div>
      </section>

      <section className="flex min-h-0 flex-col bg-dark">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-dark-line bg-dark-soft px-4 py-2.5">
          <div className="flex items-center gap-2">
            <GuacamoleBowl size={19} />
            <h2 className="label text-dark-dim">What the agent receives</h2>
          </div>
          <span className="label text-dark-dim">scrolls with your document</span>
        </header>
        <div className="h-[45svh] min-h-0 lg:h-auto lg:flex-1">
          <AgentPane
            ref={rightRef}
            text={text}
            entities={entities}
            onScroll={() => sync("right")}
          />
        </div>
      </section>
    </div>
  );
}
