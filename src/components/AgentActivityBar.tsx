"use client";

import { formatBytes } from "@/lib/format";
import type { AuditEvent } from "@/lib/types";
import { Button } from "./ui";

/**
 * What an agent has done while you are looking at the document itself.
 *
 * This view is the one place the file is rendered in full, so it is the one
 * place where being told is worth an interruption. It follows that the bar
 * only appears when there is something to tell: an attached agent that has
 * called nothing is not news, and a strip of chrome that is always there is
 * one people stop reading. Silence means nothing has happened.
 *
 * Two facts are shown and nothing is implied beyond them:
 *
 *  - that an agent is attached, which is knowable from the browser exposing
 *    document.modelContext and accepting the tools;
 *  - which calls it has made that you have not looked at yet, which is the
 *    audit trail read against what the agent view has already shown you.
 *
 * What it deliberately does not claim is that the page is being read. A DOM
 * snapshot, an accessibility-tree dump and a screenshot are all invisible to
 * the page, and a bar that lit up for them would be guessing. So the wording
 * says what an attached agent *can* do, and only the call counts are stated
 * as fact.
 *
 * Colour follows the rest of the system: a call that was answered is green
 * because the policy served it, a refusal is the stone. Neither is an error,
 * so neither gets an alarm.
 */
export function AgentActivityBar({
  attached,
  unseen,
  onOpenRecord,
}: {
  attached: boolean;
  unseen: AuditEvent[];
  onOpenRecord: () => void;
}) {
  if (unseen.length === 0) return null;

  const served = unseen.filter((event) => event.decision === "allowed" || event.decision === "truncated");
  const refused = unseen.filter((event) => !served.includes(event));
  const bytes = served.reduce((total, event) => total + event.bytes, 0);
  const latest = unseen[unseen.length - 1];

  return (
    <div className="mono flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-line-soft bg-guac-wash px-4 py-2 text-[0.6875rem] text-text-dim">
      {attached && (
        <span className="flex items-center gap-1.5">
          <span className="block h-1.5 w-1.5 rounded-full bg-guac" />
          <span className="text-text">An agent is attached to this tab.</span>
        </span>
      )}

      <span>
        {served.length > 0 && (
          <span className="text-guac-dark">
            {served.length} call{served.length > 1 ? "s" : ""} answered · {formatBytes(bytes)}
          </span>
        )}
        {served.length > 0 && refused.length > 0 && " · "}
        {refused.length > 0 && <span className="text-stone-text">{refused.length} refused</span>}
        {" since you last looked at the record."}
      </span>
      <span className="text-text-faint">Latest: {latest.tool}</span>
      <span className="ml-auto">
        <Button size="sm" onClick={onOpenRecord} title="Open the agent view and its record">
          See what left
        </Button>
      </span>
    </div>
  );
}
