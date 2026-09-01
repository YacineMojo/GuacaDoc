"use client";

import { useState } from "react";
import { TYPE_LABELS } from "@/lib/detect/index";
import type { Entity } from "@/lib/types";
import { useAutoHide } from "@/lib/useAutoHide";
import { Button, Empty, Field } from "./ui";

/**
 * The key to the pseudonyms, hidden by default.
 *
 * An agent driving this tab can read the page, not just call the tools. A
 * table of token-to-real-value sitting in the DOM would hand back everything
 * the substitution just took away, so the values are not rendered at all until
 * you ask for them, and hiding is a real absence rather than a CSS blur.
 *
 * Revealing is bounded by useAutoHide: it lasts under a minute, and it ends
 * the moment the window loses focus or the page is hidden. Leaving the key up
 * on a tab nobody is watching is the only way this panel can hurt you.
 */
const MASK = "••••••••";
const REVEAL_SECONDS = 45;

export function TokenMap({ entities, agentAttached }: { entities: Entity[]; agentAttached: boolean }) {
  const [query, setQuery] = useState("");
  const { revealed, remaining, reveal, hide } = useAutoHide(REVEAL_SECONDS);

  const pseudonymized = entities.filter((e) => e.level === "pseudonymized");
  const withheld = entities.filter((e) => e.level === "blocked");

  const visible = query.trim()
    ? pseudonymized.filter(
        (e) =>
          e.value.toLowerCase().includes(query.toLowerCase()) ||
          e.token.toLowerCase().includes(query.toLowerCase()),
      )
    : pseudonymized;

  if (pseudonymized.length === 0 && withheld.length === 0) {
    return <Empty>Nothing is being substituted, so there is no key to keep.</Empty>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 space-y-2 border-b border-line-soft p-2">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <Field value={query} onChange={setQuery} placeholder="Find a token" />
          </div>
          <Button
            size="sm"
            tone={revealed ? "stone" : "neutral"}
            onClick={revealed ? hide : reveal}
            title={
              revealed
                ? "Hide now. It hides itself anyway when the countdown ends or the window loses focus."
                : `Show the real values for ${REVEAL_SECONDS} seconds`
            }
          >
            {revealed ? `Hide · ${remaining}s` : "Reveal"}
          </Button>
        </div>

        <p className="text-[0.6875rem] leading-relaxed text-text-faint">
          {revealed
            ? agentAttached
              ? `An agent is attached to this tab and can read what is on screen. This hides itself in ${remaining}s, or the moment you look away.`
              : `Real values are on screen. This hides itself in ${remaining}s, or the moment you look away.`
            : "Values are kept off the page so nothing reading this tab can lift them."}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="mono w-full text-[0.6875rem]">
          <tbody className="divide-y divide-line-soft">
            {visible.map((entity) => (
              <tr key={entity.id} className="hover:bg-guac-wash/60">
                <td className="w-32 px-3 py-1.5 align-top whitespace-nowrap text-guac-dark">
                  {entity.token}
                </td>
                <td className="px-3 py-1.5 align-top text-text">
                  {revealed ? (
                    <>
                      {entity.value}
                      {entity.aliases.length > 0 && (
                        <span className="text-text-faint"> · {entity.aliases.join(", ")}</span>
                      )}
                    </>
                  ) : (
                    <span className="text-text-faint select-none">{MASK}</span>
                  )}
                </td>
                <td className="w-20 px-3 py-1.5 text-right align-top text-text-faint">
                  {TYPE_LABELS[entity.type].toLowerCase()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {withheld.length > 0 && (
          <div className="border-t border-line bg-stone-soft/25 px-3 py-2.5">
            <div className="label text-stone">Withheld · {withheld.length}</div>
            <p className="mt-1 text-[0.6875rem] leading-relaxed text-text-dim">
              These were never sent and have no token, so nothing in the agent&apos;s answer can be
              traced back to them. They are not listed here either.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
