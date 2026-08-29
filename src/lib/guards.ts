"use client";

import { recordViolation } from "./store";

/**
 * Runtime enforcement of the two architectural rules that the user cannot
 * verify by reading the source: no outbound requests, no persistence.
 *
 * The Content-Security-Policy in the page head is the real barrier. These
 * traps sit behind it and make an attempt visible in the interface instead of
 * silent in a console nobody opens. They are installed in production builds
 * only, because the dev server needs its websocket to reload the page.
 */

let installed = false;

export function installGuards() {
  if (installed || typeof window === "undefined") return;
  if (process.env.NODE_ENV !== "production") return;
  installed = true;

  const blocked = (api: string, detail: string): never => {
    recordViolation(api, detail);
    throw new Error(`[blocked] ${api} is disabled in this application: ${detail}`);
  };

  window.fetch = ((input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    return Promise.reject(blocked("fetch", url));
  }) as typeof window.fetch;

  const OriginalXhr = window.XMLHttpRequest;
  class GuardedXhr extends OriginalXhr {
    open(method: string, url: string | URL, ...rest: unknown[]) {
      blocked("XMLHttpRequest", `${method} ${String(url)}`);
      // @ts-expect-error unreachable, kept so the signature stays compatible
      return super.open(method, url, ...rest);
    }
  }
  window.XMLHttpRequest = GuardedXhr as unknown as typeof XMLHttpRequest;

  window.WebSocket = function GuardedWebSocket(url: string | URL) {
    return blocked("WebSocket", String(url));
  } as unknown as typeof WebSocket;

  if (navigator.sendBeacon) {
    navigator.sendBeacon = ((url: string) => {
      recordViolation("sendBeacon", String(url));
      return false;
    }) as typeof navigator.sendBeacon;
  }

  for (const [name, storage] of [
    ["localStorage", window.localStorage],
    ["sessionStorage", window.sessionStorage],
  ] as const) {
    try {
      const setItem = storage.setItem.bind(storage);
      storage.setItem = (key: string, value: string) => {
        recordViolation(name, `write to key "${key}" refused`);
        void setItem;
        void value;
      };
    } catch {
      // Storage can be unavailable entirely, which is the desired state anyway.
    }
  }

  if (window.indexedDB) {
    const open = window.indexedDB.open.bind(window.indexedDB);
    window.indexedDB.open = ((name: string, version?: number) => {
      recordViolation("indexedDB", `open("${name}") refused`);
      void open;
      void version;
      throw new Error("[blocked] indexedDB is disabled in this application");
    }) as typeof window.indexedDB.open;
  }
}
