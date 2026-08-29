"use client";

import { useMemo, useState } from "react";
import { TYPE_LABELS } from "@/lib/detect/index";
import { removeEntity, setEntityLevel, setTypeLevel } from "@/lib/store";
import type { Entity, EntityLevel, EntityType } from "@/lib/types";
import { Empty } from "./ui";

const LEVELS: Array<{ value: EntityLevel; short: string; hint: string }> = [
  { value: "visible", short: "Show", hint: "Sent to the agent as written" },
  { value: "pseudonymized", short: "Token", hint: "Sent as a stable token" },
  { value: "blocked", short: "Block", hint: "Never sent, in any form" },
];

const LEVEL_CLASS: Record<EntityLevel, string> = {
  visible: "bg-pass text-ink-900 border-pass",
  pseudonymized: "bg-marker text-paper-ink border-marker",
  blocked: "bg-stamp text-paper border-stamp",
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
    <div className="flex shrink-0 border border-line">
      {LEVELS.map((level) => (
        <button
          key={level.value}
          title={level.hint}
          onClick={() => onChange(level.value)}
          className={`border-r border-line px-1.5 font-display font-semibold uppercase tracking-wider last:border-r-0 ${
            size === "sm" ? "py-px text-[0.5625rem]" : "py-0.5 text-[0.625rem]"
          } ${
            value === level.value
              ? LEVEL_CLASS[level.value]
              : "bg-ink-800 text-text-faint hover:text-text"
          }`}
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
    return <Empty>Local detection found nothing. Select text in the document to mark it by hand.</Empty>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-line-soft p-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter entities"
          className="mono w-full border border-line bg-ink-900 px-2.5 py-1.5 text-xs text-text placeholder:text-text-faint focus:border-marker focus:outline-none"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {groups.map(([type, list]) => (
          <div key={type} className="border-b border-line-soft last:border-b-0">
            <div className="flex items-center justify-between gap-2 bg-ink-800 px-3 py-1.5">
              <span className="label">
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
                <li
                  key={entity.id}
                  className="group flex items-center gap-2 px-3 py-1.5 hover:bg-ink-800"
                >
                  <div className="min-w-0 flex-1">
                    <div className="mono truncate text-xs text-text" title={entity.value}>
                      {entity.value}
                    </div>
                    <div className="mono mt-px flex items-center gap-1.5 text-[0.625rem] text-text-faint">
                      <span className={entity.level === "blocked" ? "text-stamp" : "text-marker/70"}>
                        {entity.level === "blocked" ? "withheld" : entity.token}
                      </span>
                      <span>·</span>
                      <span>{entity.spans.length}×</span>
                      {entity.aliases.length > 0 && (
                        <span title={`Also covers: ${entity.aliases.join(", ")}`}>
                          · +{entity.aliases.length} form{entity.aliases.length > 1 ? "s" : ""}
                        </span>
                      )}
                      {entity.source === "manual" && <span className="text-pass">· manual</span>}
                    </div>
                  </div>

                  <LevelSwitch
                    value={entity.level}
                    onChange={(level) => setEntityLevel(entity.id, level)}
                  />
                  <button
                    onClick={() => removeEntity(entity.id)}
                    title="Stop tracking this entity"
                    className="text-text-faint opacity-0 transition-opacity group-hover:opacity-100 hover:text-stamp"
                  >
                    <span className="mono text-sm leading-none">×</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
