"use client";

import { memo } from "react";
import { formatMs } from "../../lib/timestamps";
import { s } from "./homeStyles";
import { ThemedLoader } from "./ThemedLoader";

export const SearchTab = memo(function SearchTab({
  searchQuery,
  onSearchQueryChange,
  searchLoading,
  spotifyResults,
  allTimestamps,
  snippetModeEnabled,
  onOpenTrack,
  onPrefetchPlayer,
  onPlayTrackWithMode,
  jump,
}) {
  const trimmed = searchQuery.trim();
  const showResults = Boolean(trimmed);

  return (
    <div style={s.searchPage}>
      <p style={s.tabHeading}>Search</p>

      <div style={s.searchOrbWrap}>
        <div className="search-orb-container">
          <div className="gooey-background-layer" aria-hidden>
            <div className="blob blob-1" />
            <div className="blob blob-2" />
            <div className="blob blob-3" />
            <div className="blob-bridge" />
          </div>
          <div className="input-overlay">
            <div className="search-icon-wrapper">
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
              id="spotify-search-input"
              type="text"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="modern-input"
              placeholder="Search songs or artists on Spotify"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
            />
            {searchQuery ? (
              <button
                type="button"
                className="search-orb-clear"
                aria-label="Clear search"
                onClick={() => onSearchQueryChange("")}
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

      <div style={s.searchResultsPane}>
        {!showResults ? (
          <p style={s.searchHint}>Find any track on Spotify to play or open in the player.</p>
        ) : searchLoading ? (
          <div style={s.sectionLoader}>
            <ThemedLoader size={0.38} label="Searching Spotify" />
          </div>
        ) : spotifyResults.length === 0 ? (
          <p style={s.searchEmpty}>No results for &quot;{trimmed}&quot;</p>
        ) : (
          <div style={s.libraryBody}>
            {spotifyResults.map((track) => {
              const tss = allTimestamps[track.id] || [];
              return (
                <div key={track.id} style={s.trackRow}>
                  <div
                    role="button"
                    tabIndex={0}
                    className="player-open-target"
                    style={{ ...s.trackLeft, cursor: "pointer" }}
                    onPointerEnter={() => onPrefetchPlayer?.(track.id)}
                    onClick={() => onOpenTrack(track)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onOpenTrack(track);
                      }
                    }}
                  >
                    {track.albumArt ? (
                      <img src={track.albumArt} alt="" style={s.trackArt} />
                    ) : (
                      <div style={s.trackArtFallback} />
                    )}
                    <div style={s.trackMeta}>
                      <span style={s.trackRowName}>{track.name}</span>
                      <span style={s.trackRowArtist}>{track.artists}</span>
                      {tss.length > 0 && (
                        <div style={s.chipRow}>
                          {tss.map((ts, i) => (
                            <button
                              key={i}
                              type="button"
                              style={s.chip}
                              onClick={(e) => {
                                e.stopPropagation();
                                jump(track, ts.positionMs, track);
                              }}
                              title={ts.label}
                            >
                              {ts.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={s.trackRight}>
                    <span style={s.trackDuration}>{formatMs(track.durationMs)}</span>
                    <button
                      type="button"
                      style={s.playTrackBtn}
                      onClick={() => onPlayTrackWithMode(track)}
                      title={snippetModeEnabled ? "Play selected snippet" : "Play from start"}
                    >
                      <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});
