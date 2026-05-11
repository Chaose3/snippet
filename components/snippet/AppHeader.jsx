"use client";

import { memo } from "react";
import { s } from "./homeStyles";

export const AppHeader = memo(function AppHeader({ token, onOpenSearch }) {
  return (
    <header style={s.header}>
      <div style={s.brandLockup}>
        <img src="/snippet-logo.png" alt="Snippet" style={s.brandIcon} />
        <div style={s.brandTextWrap}>
          <p style={s.brandTitle}>Snippet</p>
          <p style={s.brandSubtitle}>Jump to the best parts test by Neurodek</p>
        </div>
      </div>
      {token ? (
        <button type="button" style={s.headerIconBtn} onClick={onOpenSearch} aria-label="Open search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7.5" />
            <line x1="21" y1="21" x2="16.5" y2="16.5" />
          </svg>
        </button>
      ) : (
        <div style={s.headerProfilePlaceholder} aria-hidden="true">
          <div style={s.headerProfileInner} />
        </div>
      )}
    </header>
  );
});
