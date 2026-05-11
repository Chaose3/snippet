"use client";

import { createContext, useContext } from "react";

/** Playback + library + UI state shared by `/` and `/player/[trackId]` (single hook tree in AppShell). */
export const AppPlaybackContext = createContext(null);

export function useAppPlayback() {
  const ctx = useContext(AppPlaybackContext);
  if (!ctx) {
    throw new Error("useAppPlayback must be used within AppShell");
  }
  return ctx;
}
