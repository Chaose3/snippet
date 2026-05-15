"use client";

import { createContext, useContext } from "react";

/** High-frequency playback position — keep separate from AppPlaybackContext to limit re-renders. */
export const PlaybackPositionContext = createContext(null);

export function usePlaybackPosition() {
  const ctx = useContext(PlaybackPositionContext);
  if (!ctx) {
    throw new Error("usePlaybackPosition must be used within AppShell");
  }
  return ctx;
}
