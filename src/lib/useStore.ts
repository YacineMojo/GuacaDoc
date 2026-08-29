"use client";

import { useSyncExternalStore } from "react";
import { getState, subscribe, type AppState } from "./store";

export function useStore(): AppState {
  return useSyncExternalStore(subscribe, getState, getState);
}
