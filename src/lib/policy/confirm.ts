"use client";

import { getState, setState } from "../store";
import { requestUserInteraction } from "../webmcp/api";

/**
 * What came back from asking the person sitting in front of the tab.
 *
 * "busy" is not a refusal and must never be reported as one. Agents batch
 * their calls: the browser extension that drove this app issued two tools in a
 * single turn, twice, so two write calls arriving together is the ordinary
 * case rather than an edge one. Only one modal can be on screen, and the
 * second call used to resolve to the same `false` as a decline — which put
 * "user declined" in the record for a prompt nobody was ever shown. In a
 * project whose whole claim is that the record does not lie, that was the
 * costliest bug in the layer.
 */
export type ConfirmationOutcome = "approved" | "declined" | "busy";

/**
 * Blocks a tool call until the person sitting in front of the tab decides.
 * The promise is held open; there is no timeout and no default answer.
 */
export async function requestConfirmation(
  tool: string,
  summary: string,
): Promise<ConfirmationOutcome> {
  if (getState().pendingConfirmation) return "busy";

  await requestUserInteraction(`${tool} needs your approval`);

  // Another write may have opened the modal while we were awaiting the
  // runtime above. Checking once more keeps the second one from replacing a
  // prompt the user is already reading, and from stranding its promise.
  if (getState().pendingConfirmation) return "busy";

  return new Promise<ConfirmationOutcome>((resolve) => {
    setState({
      pendingConfirmation: {
        id: `c${Date.now()}`,
        tool,
        summary,
        resolve: (approved) => resolve(approved ? "approved" : "declined"),
      },
    });
  });
}

export function answerConfirmation(approved: boolean) {
  const pending = getState().pendingConfirmation;
  if (!pending) return;
  setState({ pendingConfirmation: null });
  pending.resolve(approved);
}
