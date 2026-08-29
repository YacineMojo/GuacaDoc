"use client";

import { useMemo, useState } from "react";
import { buildRedactor } from "@/lib/redact";
import type { Entity } from "@/lib/types";

/**
 * The return path.
 *
 * The agent answers in tokens because that is all it ever saw. Pasting its
 * answer here puts the real names back, locally, so the person gets a readable
 * result without the document having been readable to anyone else.
 */
export function DecodePanel({ entities }: { entities: Entity[] }) {
  const [input, setInput] = useState("");
  const redactor = useMemo(() => buildRedactor(entities), [entities]);
  const decoded = useMemo(() => redactor.decode(input), [redactor, input]);
  const substitutions = useMemo(() => {
    const matches = input.match(/\[[A-Z]+_\d{2,}\]/g) ?? [];
    return new Set(matches).size;
  }, [input]);

  return (
    <div className="flex h-full flex-col gap-2 p-3">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Paste the agent's answer here to put the real names back."
        className="mono min-h-24 flex-1 resize-none border border-line bg-ink-900 px-3 py-2.5 text-xs leading-relaxed text-text placeholder:text-text-faint focus:border-marker focus:outline-none"
      />
      <div className="min-h-0 flex-1 overflow-auto border border-line-soft bg-ink-800 px-3 py-2.5">
        {input ? (
          <p className="mono text-xs leading-relaxed whitespace-pre-wrap text-text">{decoded}</p>
        ) : (
          <p className="mono text-[0.6875rem] text-text-faint">
            The decoded text appears here. It is produced in this tab from the
            mapping above.
          </p>
        )}
      </div>
      <p className="label shrink-0">
        {substitutions} token{substitutions === 1 ? "" : "s"} recognised
        {input.includes("[BLOCKED_") && " · withheld values cannot be restored"}
      </p>
    </div>
  );
}
