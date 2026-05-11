"use client";

import { memo } from "react";
import { formatMs } from "../../lib/timestamps";
import { s } from "./homeStyles";

export const MiniPlayerBar = memo(function MiniPlayerBar({
  playerState,
  trackLookup,
  snippetModeEnabled,
  setSnippetModeEnabled,
  selectedNowPlayingSnippet,
  jump,
  handlePlayPause,
  handleSkipNext,
  onOpenNowPlaying,
  onPrefetchPlayer,
}) {
  return (
    <div style={s.miniPlayerShell}>
      <div style={s.miniPlayerBar}>
        <button
          type="button"
          style={s.miniModeToggle}
          onClick={() => setSnippetModeEnabled((value) => !value)}
          aria-label={snippetModeEnabled ? "Disable snippet mode" : "Enable snippet mode"}
          title={snippetModeEnabled ? "Snippet Mode On" : "Snippet Mode Off"}
        >
          <span style={s.miniModeToggleInner} aria-hidden="true">
            <span
              style={{
                ...s.miniModeBar,
                ...(snippetModeEnabled ? s.miniModeBarTopActive : s.miniModeBarTop),
              }}
            />
            <span
              style={{
                ...s.miniModeBar,
                ...(snippetModeEnabled ? s.miniModeBarMiddleActive : s.miniModeBarMiddle),
              }}
            />
            <span
              style={{
                ...s.miniModeBar,
                ...(snippetModeEnabled ? s.miniModeBarBottomActive : s.miniModeBarBottom),
              }}
            />
          </span>
        </button>
        <button
          type="button"
          className="player-open-target"
          style={s.miniPlayerMeta}
          onPointerEnter={() => onPrefetchPlayer?.(playerState.id)}
          onClick={() => onOpenNowPlaying(trackLookup[playerState.id] ?? playerState)}
        >
          {playerState.albumArt ? (
            <img src={playerState.albumArt} alt="" style={s.miniPlayerArt} />
          ) : (
            <div style={s.miniPlayerArtFallback} />
          )}
          <div style={{ minWidth: 0 }}>
            <span style={s.miniPlayerTrack}>{playerState.name}</span>
            <span style={s.miniPlayerArtist}>
              {snippetModeEnabled && selectedNowPlayingSnippet
                ? `Snippet ${
                    selectedNowPlayingSnippet.label
                      ? `• ${selectedNowPlayingSnippet.label}`
                      : `• ${formatMs(selectedNowPlayingSnippet.positionMs)}`
                  }`
                : playerState.artists}
            </span>
          </div>
        </button>
        <div style={s.miniPlayerActions}>
          <div style={s.miniControlCluster}>
            {snippetModeEnabled && selectedNowPlayingSnippet && (
              <button
                type="button"
                style={s.miniSecondaryControl}
                onClick={() =>
                  jump(
                    trackLookup[playerState.id] ?? playerState,
                    selectedNowPlayingSnippet.positionMs,
                    trackLookup[playerState.id] ?? playerState
                  )
                }
                aria-label="Jump to selected snippet"
                title="Jump to selected snippet"
              >
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 4v16" />
                  <path d="M19 12 9 19V5l10 7Z" fill="currentColor" stroke="none" />
                </svg>
              </button>
            )}
            <button type="button" style={s.miniPrimaryControl} onClick={handlePlayPause} aria-label={playerState.isPlaying ? "Pause" : "Play"}>
              {playerState.isPlaying ? (
                <span style={{ letterSpacing: "2px", fontSize: "0.96rem" }}>❙❙</span>
              ) : (
                <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <button type="button" style={s.miniSecondaryControl} onClick={handleSkipNext} aria-label="Next track" title="Next track">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 5h2v14h-2zM6 5l9.5 7L6 19z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
