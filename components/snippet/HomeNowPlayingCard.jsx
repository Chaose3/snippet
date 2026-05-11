"use client";

import { memo } from "react";
import { formatMs } from "../../lib/timestamps";
import { GRAD, s } from "./homeStyles";

export const HomeNowPlayingCard = memo(function HomeNowPlayingCard({
  playerState,
  estimatedPos,
  handleSeekChange,
  handleSeekCommit,
  handleShuffle,
  handleSaveTimestamp,
  snippetModeEnabled,
  nowPlayingTimestamps,
  selectedNowPlayingSnippetIndex,
  handleSelectSnippet,
  jump,
  handleDelete,
  snippetsOpen,
  setSnippetsOpen,
  snippetTrackCount,
}) {
  return (
    <div style={s.card}>
      <div style={s.cardGradientBar} />
      <div style={s.cardInner}>
        {playerState ? (
          <div style={s.nowPlaying}>
            {playerState.albumArt && (
              <img src={playerState.albumArt} alt="Album art" style={s.albumArt} />
            )}
            <div style={s.trackInfo}>
              <div style={s.trackNameRow}>
                <p style={s.trackName}>{playerState.name}</p>
                <button style={s.saveIconBtn} onClick={handleSaveTimestamp} title={`Save moment at ${formatMs(estimatedPos)}`}>
                  <img src="/Snippet-S.png" alt="Save moment" width="19" height="19" style={{ display: "block", objectFit: "contain", filter: "brightness(0) invert(1)" }} />
                </button>
              </div>
              <p style={s.artist}>{playerState.artists}</p>
              <input
                type="range"
                min={0}
                max={playerState.durationMs}
                value={estimatedPos}
                onChange={handleSeekChange}
                onMouseUp={handleSeekCommit}
                onTouchEnd={handleSeekCommit}
                style={{
                  ...s.seekSlider,
                  background: `linear-gradient(to right, transparent 0%, transparent ${playerState.durationMs ? (estimatedPos / playerState.durationMs) * 100 : 0}%, #2a2a3a ${playerState.durationMs ? (estimatedPos / playerState.durationMs) * 100 : 0}%, #2a2a3a 100%), ${GRAD}`,
                }}
              />
              <div style={s.times}>
                <span>{formatMs(estimatedPos)}</span>
                <button
                  style={playerState.shuffle ? s.shuffleOn : s.shuffleOff}
                  onClick={handleShuffle}
                  title={playerState.shuffle ? "Shuffle on" : "Shuffle off"}
                >
                  ⇄
                </button>
                <span>{formatMs(playerState.durationMs)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ ...s.empty, minHeight: "unset", padding: "1.25rem 0 0.4rem", alignItems: "flex-start" }}>
            <p style={{ ...s.emptyTitle, fontSize: "1.05rem" }}>Start playing something in Spotify</p>
            <p style={{ ...s.muted, maxWidth: "32rem" }}>
              Snippet is connected, but there isn&apos;t an active track yet. Play a song and your now playing controls and save-snippet actions will appear here.
            </p>
          </div>
        )}

        <section style={s.sectionBlock}>
          <button style={s.sectionHeader} onClick={() => setSnippetsOpen((v) => !v)}>
            <div>
              <p style={s.sectionTitle}>Your Snippets</p>
              <p style={s.sectionSubtle}>Organized by most recent moments</p>
            </div>
            <div style={s.sectionHeaderRight}>
              <span style={s.sectionMeta}>{snippetTrackCount}</span>
              <span style={{ ...s.chevron, fontSize: "0.85rem" }}>{snippetsOpen ? "▲" : "▼"}</span>
            </div>
          </button>

          {snippetsOpen && (nowPlayingTimestamps.length > 0 ? (
            <ul style={s.list}>
              {nowPlayingTimestamps.map((ts, i) => (
                <li key={i} style={s.listItem}>
                  <label
                    className={`snippet-option${!snippetModeEnabled ? " snippet-option-dormant" : ""}`}
                    style={{ flex: 1, padding: 0, background: "transparent", border: 0, boxShadow: "none" }}
                  >
                    <input
                      type="radio"
                      name={`home-snippet-${playerState.id}`}
                      className="snippet-radio-input"
                      checked={selectedNowPlayingSnippetIndex === i}
                      onChange={() => handleSelectSnippet(playerState.id, i)}
                    />
                    <span className="snippet-label">
                      {ts.label || `Snippet ${i + 1}`}
                      <span className="snippet-meta">{formatMs(ts.positionMs)}</span>
                    </span>
                  </label>
                  <button
                    style={s.homeSnippetPlayBtn}
                    onClick={() => jump(playerState.uri, ts.positionMs)}
                    title="Play snippet"
                  >
                    ▶
                  </button>
                  <span style={s.tsTime}>{formatMs(ts.positionMs)}</span>
                  <button
                    style={s.deleteBtn}
                    onClick={() => handleDelete(playerState.id, i)}
                    title="Remove"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ ...s.muted, marginTop: "0.5rem", fontSize: "0.82rem" }}>
              No saved moments for this song yet.
            </p>
          ))}
        </section>
      </div>
    </div>
  );
});
