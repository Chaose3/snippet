"use client";

import { memo, useCallback, useRef } from "react";
import { s } from "./homeStyles";

/**
 * Isolated search field — only re-renders when query changes, not on playback polls.
 * pointerdown → focus() avoids iOS WKWebView tap delay before keyboard.
 */
export const SearchInputOrb = memo(function SearchInputOrb({ value, onChange }) {
  const inputRef = useRef(null);

  const focusInput = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    try {
      el.focus({ preventScroll: true });
    } catch {
      el.focus();
    }
  }, []);

  const handlePointerDown = useCallback(
    (e) => {
      if (e.target === inputRef.current) return;
      e.preventDefault();
      focusInput();
    },
    [focusInput]
  );

  return (
    <div style={s.searchOrbWrap}>
      <div className="search-orb-container" onPointerDown={handlePointerDown}>
        <div className="gooey-background-layer" aria-hidden>
          <div className="blob blob-1" />
          <div className="blob blob-2" />
          <div className="blob blob-3" />
          <div className="blob-bridge" />
        </div>
        <div className="input-overlay">
          <div className="search-icon-wrapper" aria-hidden>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="search-icon"
            >
              <circle cx={11} cy={11} r={8} />
              <line x1={21} y1={21} x2="16.65" y2="16.65" />
            </svg>
          </div>
          <input
            ref={inputRef}
            id="spotify-search-input"
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="modern-input"
            placeholder="Search songs or artists on Spotify"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          {value ? (
            <button
              type="button"
              className="search-orb-clear"
              aria-label="Clear search"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange("");
                focusInput();
              }}
            >
              ×
            </button>
          ) : null}
          <div className="focus-indicator" aria-hidden />
        </div>
        <svg className="gooey-svg-filter" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <defs>
            <filter id="snippet-search-goo">
              <feGaussianBlur in="SourceGraphic" stdDeviation={12} result="blur" />
              <feColorMatrix
                in="blur"
                mode="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10"
                result="goo"
              />
              <feComposite in="SourceGraphic" in2="goo" operator="atop" />
            </filter>
          </defs>
        </svg>
      </div>
    </div>
  );
});
