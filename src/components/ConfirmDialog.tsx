"use client";

import { useEffect } from "react";
import { answerConfirmation } from "@/lib/policy/confirm";
import { Button } from "./ui";

/**
 * Consent for write actions.
 *
 * The tool call is suspended on an open promise until this resolves. There is
 * no timeout and no default: an unanswered prompt simply never returns, which
 * is the safe failure mode.
 */
export function ConfirmDialog({
  tool,
  summary,
}: {
  tool: string;
  summary: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") answerConfirmation(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/85 p-6">
      <div className="panel w-full max-w-md border-marker">
        <header className="border-b border-line-soft px-5 py-3">
          <h2 className="label text-marker">Approval required</h2>
        </header>
        <div className="px-5 py-4">
          <p className="text-sm text-text">
            The agent wants to run <span className="mono text-marker">{tool}</span>.
          </p>
          <p className="mono mt-3 border-l-2 border-line bg-ink-900 px-3 py-2 text-xs break-words text-text-dim">
            {summary}
          </p>
          <p className="mt-3 text-xs leading-relaxed text-text-faint">
            Write actions never run without your approval. Declining returns a
            plain refusal to the agent and changes nothing here.
          </p>
        </div>
        <footer className="flex justify-end gap-2 border-t border-line-soft px-5 py-3">
          <Button onClick={() => answerConfirmation(false)}>Decline</Button>
          <Button tone="primary" onClick={() => answerConfirmation(true)}>
            Approve
          </Button>
        </footer>
      </div>
    </div>
  );
}
