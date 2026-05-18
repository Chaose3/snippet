"use client";

import { createContext, useContext } from "react";

/** Search-only slice — avoids re-rendering the input when playback state polls. */
export const AppSearchContext = createContext(null);

export function useAppSearch() {
  const ctx = useContext(AppSearchContext);
  if (!ctx) {
    throw new Error("useAppSearch must be used within AppShell");
  }
  return ctx;
}
