"use client";

import { memo } from "react";
import { s } from "./homeStyles";

export const AppHeader = memo(function AppHeader() {
  return (
    <header style={s.header}>
      <div style={s.brandLockup}>
        <img src="/snippet-logo.png" alt="Snippet" style={s.brandIcon} />
        <div style={s.brandTextWrap}>
          <p style={s.brandTitle}>Snippet</p>
          <p style={s.brandSubtitle}>Jump to the best parts</p>
        </div>
      </div>
    </header>
  );
});
