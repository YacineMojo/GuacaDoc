"use client";

import { useEffect, useState } from "react";

/**
 * A reveal that puts itself away.
 *
 * Two panels in the agent view hold the one thing the whole policy layer
 * exists to keep off the wire: the key that maps a token back to a real name,
 * and a decoded answer with the names already back in it. Both are shown on
 * purpose, by a person, for as long as that person needs them. The failure is
 * not showing them, it is leaving them showing.
 *
 * An agent attached to this tab reads what is on screen, and a window nobody
 * is looking at is the worst case: no one is there to notice. So the reveal is
 * bounded three ways, and every one of them is something the browser tells us
 * for certain rather than something we infer:
 *
 *  - the countdown, because attention ends before intent does;
 *  - losing the window focus, because the person moved on;
 *  - the page becoming hidden, which covers switching browser tab, minimising,
 *    and the tab being backgrounded by an agent driving another one.
 *
 * The remaining seconds are returned so the interface can show them. A secret
 * that vanishes without warning teaches people to reveal it again immediately,
 * which is the opposite of what this is for.
 */
export function useAutoHide(seconds: number) {
  const [remaining, setRemaining] = useState(0);
  const revealed = remaining > 0;

  useEffect(() => {
    if (!revealed) return;

    const away = () => setRemaining(0);
    // setState lives in the callbacks, never in the effect body: this
    // subscribes to the browser, it does not seed React state.
    const tick = setInterval(() => setRemaining((left) => left - 1), 1000);
    const onVisibility = () => {
      if (document.hidden) away();
    };

    window.addEventListener("blur", away);
    window.addEventListener("pagehide", away);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(tick);
      window.removeEventListener("blur", away);
      window.removeEventListener("pagehide", away);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [revealed]);

  return {
    revealed,
    remaining,
    /** Shows, or restarts the countdown on something already shown. */
    reveal: () => setRemaining(seconds),
    hide: () => setRemaining(0),
  };
}
