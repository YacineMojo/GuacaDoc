"use client";

import { useState } from "react";
import { TYPE_LABELS } from "@/lib/detect/index";
import type { Entity } from "@/lib/types";
import { Empty, Field } from "./ui";

/**
 * The key to the pseudonyms, readable while the agent works.
 *
 * It never leaves the tab, which is the whole point: the agent reasons about
 * PERSON_01 and the person reading its answer knows who that is.
 */
export function TokenMap({ entities }: { entities: Entity[] }) {
  const [query, setQuery] = useState("");
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
      <div className="shrink-0 border-b border-line-soft p-2">
        <Field value={query} onChange={setQuery} placeholder="Find a token or a name" />
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
                  {entity.value}
                  {entity.aliases.length > 0 && (
                    <span className="text-text-faint"> · {entity.aliases.join(", ")}</span>
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
              traced back to them.
            </p>
            <ul className="mono mt-2 space-y-0.5 text-[0.6875rem] text-text-faint">
              {withheld.map((entity) => (
                <li key={entity.id} className="truncate">
                  {TYPE_LABELS[entity.type].toLowerCase()} · {entity.value}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
