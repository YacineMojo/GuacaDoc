"use client";

import { getState, setState } from "../store";
import { requestUserInteraction } from "../webmcp/api";

/**
 * Blocks a tool call until the person sitting in front of the tab decides.
 * The promise is held open; there is no timeout and no default answer.
 */
export async function requestConfirmation(tool: string, summary: string): Promise<boolean> {
  if (getState().pendingConfirmation) return false;

  await requestUserInteraction(`${tool} needs your approval`);

  return new Promise<boolean>((resolve) => {
    setState({
      pendingConfirmation: {
        id: `c${Date.now()}`,
        tool,
        summary,
        resolve,
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
