"use client";

import { useRef, useState } from "react";
import { openDemo, openFile } from "@/lib/actions";
import { ACCEPTED_EXTENSIONS } from "@/lib/extract/index";
import { Button } from "./ui";

export function DropZone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      await openFile(file);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handle(e.dataTransfer.files[0]);
        }}
        className={`flex flex-wrap items-center gap-3 rounded-[5px] border-2 border-dashed px-5 py-5 transition-colors ${
          dragging ? "border-guac bg-guac-wash" : "border-line bg-white"
        }`}
      >
        <Button tone="primary" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? "Reading…" : "Choose a file"}
        </Button>
        <Button onClick={openDemo} disabled={busy}>
          Try the sample contract
        </Button>
        <span className="mono text-[0.6875rem] text-text-faint">
          or drop one here · {ACCEPTED_EXTENSIONS.join(" ")}
        </span>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(",")}
          className="hidden"
          onChange={(e) => void handle(e.target.files?.[0])}
        />
      </div>

      {error && (
        <p className="mono mt-3 rounded-[4px] border border-stone-soft bg-stone-soft/30 px-4 py-3 text-xs leading-relaxed text-stone">
          {error}
        </p>
      )}
    </div>
  );
}
