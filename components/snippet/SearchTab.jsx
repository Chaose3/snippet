"use client";

import { memo } from "react";
import { formatMs } from "../../lib/timestamps";
import { s } from "./homeStyles";
import { ThemedLoader } from "./ThemedLoader";

/** Results list only — pair with {@link SearchInputOrb} on the search page. */
export const SearchTab = memo(function SearchTab({
  searchQuery,
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
  );
});
