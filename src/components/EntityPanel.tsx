"use client";

import { useMemo, useState } from "react";
import { TYPE_LABELS } from "@/lib/detect/index";
import { removeEntity, setEntityLevel, setTypeLevel } from "@/lib/store";
import type { Entity, EntityLevel, EntityType } from "@/lib/types";
import { Empty, Field } from "./ui";

/**
 * Three levels, named for what happens rather than for how it is implemented.
 * "Withheld" is the stone: taken out, with no token, so it cannot be decoded
 * back from anything the agent says.
 */
const LEVELS: Array<{ value: EntityLevel; short: string; hint: string }> = [
  { value: "visible", short: "Shown", hint: "Sent to the agent as written" },
  { value: "pseudonymized", short: "Token", hint: "Sent as a stable token, the same one every time" },
  { value: "blocked", short: "Withheld", hint: "Never sent, in any form" },
];

const LEVEL_CLASS: Record<EntityLevel, string> = {
  visible: "bg-guac text-white border-guac",
  pseudonymized: "bg-flesh text-rind border-flesh",
  blocked: "bg-stone text-stone-text border-stone",
};

function LevelSwitch({
  value,
  onChange,
  size = "md",
}: {
  value: EntityLevel;
  onChange: (level: EntityLevel) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="flex shrink-0 overflow-hidden rounded-[3px] border border-line">
      {LEVELS.map((level) => (
        <button
          key={level.value}
          title={level.hint}
          onClick={() => onChange(level.value)}
          className={`border-r border-line px-1.5 font-display font-semibold tracking-[0.04em] uppercase last:border-r-0 ${
            size === "sm" ? "py-px text-[0.5625rem]" : "py-0.5 text-[0.625rem]"
          } ${value === level.value ? LEVEL_CLASS[level.value] : "bg-white text-text-faint hover:text-text"}`}
        >
          {level.short}
        </button>
      ))}
    </div>
  );
}

export function EntityPanel({ entities }: { entities: Entity[] }) {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const filtered = query.trim()
      ? entities.filter(
          (e) =>
            e.value.toLowerCase().includes(query.toLowerCase()) ||
            e.token.toLowerCase().includes(query.toLowerCase()),
        )
      : entities;
    const map = new Map<EntityType, Entity[]>();
    for (const entity of filtered) {
      const list = map.get(entity.type) ?? [];
      list.push(entity);
      map.set(entity.type, list);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [entities, query]);

  if (entities.length === 0) {
    return (
      <Empty>
        Nothing was detected here. Select text in the document to mark it yourself.
      </Empty>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-line-soft p-2">
        <Field value={query} onChange={setQuery} placeholder="Filter what was found" />
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {groups.map(([type, list]) => (
          <div key={type} className="border-b border-line-soft last:border-b-0">
            <div className="flex items-center justify-between gap-2 bg-guac-wash px-3 py-1.5">
              <span className="label text-leaf">
                {TYPE_LABELS[type]} <span className="text-text-faint">· {list.length}</span>
              </span>
              <LevelSwitch
                size="sm"
                value={list.every((e) => e.level === list[0].level) ? list[0].level : "visible"}
                onChange={(level) => setTypeLevel(type, level)}
              />
            </div>

            <ul>
              {list.map((entity) => (
                <li key={entity.id} className="group px-3 py-2 hover:bg-guac-wash/60">
                  <div className="flex items-start gap-2">
                    <span className="mono min-w-0 flex-1 truncate text-xs text-text" title={entity.value}>
                      {entity.value}
                    </span>
                    <button
                      onClick={() => removeEntity(entity.id)}
                      title="Stop tracking this value"
                      className="-mt-0.5 shrink-0 text-text-faint opacity-0 transition-opacity group-hover:opacity-100 hover:text-stone"
                    >
                      <span className="mono text-sm leading-none">×</span>
                    </button>
                  </div>

                  <div className="mt-1 flex items-center gap-2">
                    <span className="mono flex min-w-0 flex-1 items-center gap-1.5 truncate text-[0.625rem] text-text-faint">
                      <span className={entity.level === "blocked" ? "text-stone" : "text-guac-dark"}>
                        {entity.level === "blocked" ? "withheld" : entity.token}
                      </span>
                      <span>·</span>
                      <span>{entity.spans.length}×</span>
                      {entity.aliases.length > 0 && (
                        <span title={`Also covers: ${entity.aliases.join(", ")}`}>
                          · +{entity.aliases.length}
                        </span>
                      )}
                      {entity.source === "manual" && <span className="text-leaf">· yours</span>}
                    </span>
                    <LevelSwitch value={entity.level} onChange={(level) => setEntityLevel(entity.id, level)} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
