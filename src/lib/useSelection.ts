"use client";

import { useEffect } from "react";
import { setSelection } from "./store";

/**
 * Watches what is selected inside the document surface.
 *
 * It listens on the document rather than on the pane, because a mouseup that
 * lands outside the pane never reaches the pane: dragging past the edge of the
 * text was losing the selection entirely. selectionchange also covers keyboard
 * selection and double-click, which a mouseup handler misses.
 */
const SURFACE_ATTRIBUTE = "data-document-surface";

function withinSurface(node: Node | null): boolean {
  let current: Node | null = node;
  while (current) {
    if (current instanceof HTMLElement && current.hasAttribute(SURFACE_ATTRIBUTE)) return true;
    current = current.parentNode;
  }
  return false;
}

export function useDocumentSelection() {
  useEffect(() => {
    let frame = 0;

    const read = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const selection = window.getSelection();
        const text = selection?.toString() ?? "";
        if (!selection || selection.isCollapsed || text.trim().length < 2) {
          setSelection(null);
          return;
        }
        if (!withinSurface(selection.anchorNode) || !withinSurface(selection.focusNode)) {
          setSelection(null);
          return;
        }
        setSelection(text.replace(/\s+/g, " ").trim());
      });
    };

    document.addEventListener("selectionchange", read);
    document.addEventListener("mouseup", read);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("selectionchange", read);
      document.removeEventListener("mouseup", read);
    };
  }, []);
}

export function clearBrowserSelection() {
  window.getSelection()?.removeAllRanges();
  setSelection(null);
}
