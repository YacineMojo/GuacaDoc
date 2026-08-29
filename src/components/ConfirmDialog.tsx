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
export function ConfirmDialog({ tool, summary }: { tool: string; summary: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") answerConfirmation(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-rind/45 p-6 backdrop-blur-[2px]">
      <div className="panel w-full max-w-md overflow-hidden border-guac shadow-xl">
        <header className="border-b border-line-soft bg-guac-wash px-5 py-3">
          <h2 className="label text-leaf">Your approval is needed</h2>
        </header>
        <div className="px-5 py-4">
          <p className="text-sm text-text">
            The agent wants to run <span className="mono text-guac-dark">{tool}</span>.
          </p>
          <p className="mono mt-3 rounded-[4px] border-l-[3px] border-line bg-guac-wash px-3 py-2 text-xs break-words text-text-dim">
            {summary}
          </p>
          <p className="mt-3 text-xs leading-relaxed text-text-faint">
            Write actions never run without you. Declining returns a plain refusal to the agent and
            changes nothing here.
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
