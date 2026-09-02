"use client";

import { useMemo, useState } from "react";
import { buildRedactor } from "@/lib/redact";
import type { Entity } from "@/lib/types";
import { useAutoHide } from "@/lib/useAutoHide";
import { Button } from "./ui";

/**
 * The return path.
 *
 * The agent answers in tokens because tokens are all it ever saw. Pasting the
 * answer here puts the real names back, in this tab, so you get a readable
 * result without the document having been readable to anyone else.
 *
 * The restored text is the same secret as the key, in prose, so it is bounded
 * the same way: it hides itself when the countdown ends or the window loses
 * focus, and it does not assemble at all while an agent is attached. Reading
 * the answer in clear is the last step of the round trip and it belongs to the
 * person, alone in the tab. What you pasted is never touched. It is tokens, it
 * is not sensitive, and throwing away something a person typed to protect
 * something they can restore with one click would be the wrong trade.
 */
const REVEAL_SECONDS = 120;

export function DecodePanel({
  entities,
  agentAttached,
}: {
  entities: Entity[];
  agentAttached: boolean;
}) {
  const [input, setInput] = useState("");
  const { revealed, remaining, reveal, blocked } = useAutoHide(REVEAL_SECONDS, agentAttached);
  const redactor = useMemo(() => buildRedactor(entities), [entities]);
  // Decoding is skipped rather than hidden while blocked. A string that exists
  // in the render tree is a string an agent can be handed by a framework hook
  // or a devtools bridge, and there is no reason to build it before it can be
  // shown.
  const decoded = useMemo(
    () => (blocked ? "" : redactor.decode(input)),
    [redactor, input, blocked],
  );
  const recognised = useMemo(() => {
    const matches = input.match(/\[[A-Z]+_\d{2,}\]/g) ?? [];
    return new Set(matches).size;
  }, [input]);

  return (
    <div className="flex h-full flex-col gap-2 p-3">
      <textarea
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          // Typing or pasting is the person asking to read it, and it restarts
          // the clock rather than only starting it.
          reveal();
        }}
        placeholder="Paste the agent's answer here to put the real names back."
        className="mono min-h-24 flex-1 resize-none rounded-[4px] border border-line bg-white px-3 py-2.5 text-xs leading-relaxed text-text placeholder:text-text-faint focus:border-guac focus:outline-none"
      />
      <div className="min-h-0 flex-1 overflow-auto rounded-[4px] border border-line-soft bg-guac-wash px-3 py-2.5">
        {blocked ? (
          <p className="mono text-[0.6875rem] leading-relaxed text-text-faint">
            An agent is attached to this tab. The readable version is not put together while
            something that reads the screen is watching. Detach it and the answer resolves here.
          </p>
        ) : !input ? (
          <p className="mono text-[0.6875rem] leading-relaxed text-text-faint">
            The readable version appears here, put together in this tab from your key.
          </p>
        ) : revealed ? (
          <p className="mono text-xs leading-relaxed whitespace-pre-wrap text-text">{decoded}</p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <p className="mono text-[0.6875rem] leading-relaxed text-text-faint">
              Put away. The real names are off the page again.
            </p>
            <Button size="sm" onClick={reveal} title="Show the readable version again">
              Read it again
            </Button>
          </div>
        )}
      </div>
      <p className="label shrink-0">
        {recognised} token{recognised === 1 ? "" : "s"} recognised
        {input.includes("[BLOCKED_") && " · withheld values cannot be restored"}
        {blocked && " · locked while an agent is attached"}
        {input && revealed && ` · hides itself in ${remaining}s`}
      </p>
    </div>
  );
}
