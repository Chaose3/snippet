"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playSnippet, getPlayerState } from "../lib/snippet";
import { getTimestamps, saveTimestamp, deleteTimestamp, formatMs } from "../lib/timestamps";

const STORAGE_KEY = "spotify_access_token";

function getStoredToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

export default function Home() {
  const [token, setToken] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const [urlError, setUrlError] = useState(null);
  const [playerState, setPlayerState] = useState(null);
  const [timestamps, setTimestamps] = useState([]);
  const [labelInput, setLabelInput] = useState("");
  const [estimatedPos, setEstimatedPos] = useState(0);
  const lastPollRef = useRef(null);

  useEffect(() => {
    setHydrated(true);
    const t = getStoredToken();
    setToken(t);
    if (t) setUrlError(null);

    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    const detail = params.get("detail");
    if (err) {
      // Only show the error if the user isn't already logged in
      if (!t) setUrlError(detail || err);
      window.history.replaceState({}, "", "/");
    }
  }, []);

  // Poll Spotify player state every 3s
  useEffect(() => {
    if (!token) return;

    const poll = async () => {
      const state = await getPlayerState(token);
      if (state) {
        setPlayerState(state);
        setEstimatedPos(state.positionMs);
        lastPollRef.current = {
          time: Date.now(),
          positionMs: state.positionMs,
          isPlaying: state.isPlaying,
        };
        setTimestamps(getTimestamps(state.id));
      } else {
        setPlayerState(null);
        lastPollRef.current = null;
      }
    };

    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, [token]);

  // Smooth position estimate between polls (updates every 500ms)
  useEffect(() => {
    const id = setInterval(() => {
      if (!lastPollRef.current?.isPlaying) return;
      const elapsed = Date.now() - lastPollRef.current.time;
      setEstimatedPos(lastPollRef.current.positionMs + elapsed);
    }, 500);
    return () => clearInterval(id);
  }, []);

  const handleSaveTimestamp = useCallback(() => {
    if (!playerState) return;
    const label = labelInput.trim() || null;
    const updated = saveTimestamp(playerState.id, Math.floor(estimatedPos), label);
    setTimestamps(updated);
    setLabelInput("");
  }, [playerState, estimatedPos, labelInput]);

  const handleJump = useCallback(async (positionMs) => {
    const t = getStoredToken();
    if (!t || !playerState) return;
    const res = await playSnippet(t, { trackUri: playerState.uri, positionMs });
    if (res.status === 401) {
      localStorage.removeItem(STORAGE_KEY);
      setToken(null);
    }
    if (res.ok || res.status === 204) {
      lastPollRef.current = { time: Date.now(), positionMs, isPlaying: true };
      setEstimatedPos(positionMs);
    }
  }, [playerState]);

  const handleDelete = useCallback((index) => {
    if (!playerState) return;
    const updated = deleteTimestamp(playerState.id, index);
    setTimestamps(updated);
  }, [playerState]);

  const goLogin = () => { window.location.href = "/api/login"; };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setPlayerState(null);
    lastPollRef.current = null;
  };

  if (!hydrated) return <main style={s.main}><p style={s.muted}>Loading…</p></main>;

  const progressPct = playerState
    ? Math.min(100, (estimatedPos / playerState.durationMs) * 100)
    : 0;

  return (
    <main style={s.main}>
      <header style={s.header}>
        <h1 style={s.h1}>Snippet</h1>
        <div style={s.headerRight}>
          {token ? (
            <button style={s.btnGhost} onClick={handleLogout}>Log out</button>
          ) : (
            <button style={s.btnPrimary} onClick={goLogin}>Login with Spotify</button>
          )}
        </div>
      </header>

      {urlError && <p style={s.error}>Login issue: {urlError}</p>}

      {!token ? (
        <div style={s.empty}>
          <p style={s.emptyTitle}>Jump to the best parts.</p>
          <p style={s.muted}>
            Connect Spotify, start any track, and save the moments worth jumping back to.
          </p>
          <button style={s.btnPrimaryLg} onClick={goLogin}>Login with Spotify</button>
        </div>
      ) : !playerState ? (
        <p style={s.muted}>Nothing playing — open Spotify and start a track.</p>
      ) : (
        <div style={s.card}>
          {/* Now Playing */}
          <div style={s.nowPlaying}>
            {playerState.albumArt && (
              <img src={playerState.albumArt} alt="Album art" style={s.albumArt} />
            )}
            <div style={s.trackInfo}>
              <p style={s.trackName}>{playerState.name}</p>
              <p style={s.artist}>{playerState.artists}</p>
              <div style={s.progressBar}>
                <div style={{ ...s.progressFill, width: `${progressPct}%` }} />
              </div>
              <div style={s.times}>
                <span>{formatMs(estimatedPos)}</span>
                <span>{formatMs(playerState.durationMs)}</span>
              </div>
            </div>
          </div>

          {/* Save moment */}
          <div style={s.saveRow}>
            <input
              style={s.input}
              placeholder={`Label (optional) — currently at ${formatMs(estimatedPos)}`}
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveTimestamp()}
            />
            <button style={s.btnPrimary} onClick={handleSaveTimestamp}>
              Save moment
            </button>
          </div>

          {/* Saved timestamps */}
          {timestamps.length > 0 ? (
            <ul style={s.list}>
              {timestamps.map((ts, i) => (
                <li key={i} style={s.listItem}>
                  <button style={s.jumpBtn} onClick={() => handleJump(ts.positionMs)}>
                    <span style={s.playIcon}>▶</span>
                    <span style={s.tsLabel}>{ts.label}</span>
                  </button>
                  <span style={s.tsTime}>{formatMs(ts.positionMs)}</span>
                  <button
                    style={s.deleteBtn}
                    onClick={() => handleDelete(i)}
                    title="Remove"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ ...s.muted, marginTop: "0.75rem" }}>
              No saved moments for this song yet.
            </p>
          )}
        </div>
      )}
    </main>
  );
}

const s = {
  main: { padding: "1.5rem", maxWidth: 540, margin: "0 auto" },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "1.75rem",
  },
  h1: { margin: 0, fontSize: "1.4rem", fontWeight: 700, letterSpacing: "-0.02em" },
  headerRight: { display: "flex", gap: "0.5rem" },
  muted: { color: "#6b7280", fontSize: "0.9rem", lineHeight: 1.6, margin: 0 },
  error: { color: "#fca5a5", marginBottom: "1rem", fontSize: "0.85rem" },

  empty: { marginTop: "3rem", textAlign: "center" },
  emptyTitle: { fontSize: "1.25rem", fontWeight: 600, margin: "0 0 0.5rem" },

  card: {
    background: "#111827",
    borderRadius: 14,
    padding: "1.25rem",
    border: "1px solid #1f2937",
  },

  nowPlaying: { display: "flex", gap: "1rem", marginBottom: "1.25rem" },
  albumArt: {
    width: 76,
    height: 76,
    borderRadius: 8,
    flexShrink: 0,
    objectFit: "cover",
    background: "#1f2937",
  },
  trackInfo: { flex: 1, minWidth: 0 },
  trackName: {
    margin: "0 0 0.2rem",
    fontWeight: 600,
    fontSize: "1rem",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  artist: { margin: "0 0 0.75rem", color: "#9ca3af", fontSize: "0.82rem" },
  progressBar: {
    height: 4,
    background: "#374151",
    borderRadius: 2,
    marginBottom: "0.35rem",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "#1db954",
    borderRadius: 2,
    transition: "width 0.5s linear",
  },
  times: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.72rem",
    color: "#6b7280",
  },

  saveRow: {
    display: "flex",
    gap: "0.5rem",
    marginBottom: "1rem",
  },
  input: {
    flex: 1,
    padding: "0.5rem 0.75rem",
    borderRadius: 8,
    border: "1px solid #374151",
    background: "#1f2937",
    color: "#f9fafb",
    fontSize: "0.82rem",
    outline: "none",
  },

  list: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: "0.35rem",
  },
  listItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    background: "#1f2937",
    borderRadius: 8,
    padding: "0.5rem 0.75rem",
  },
  jumpBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    background: "none",
    border: "none",
    color: "#f9fafb",
    cursor: "pointer",
    fontSize: "0.88rem",
    padding: 0,
    textAlign: "left",
    minWidth: 0,
  },
  playIcon: { color: "#1db954", fontSize: "0.7rem", flexShrink: 0 },
  tsLabel: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  tsTime: { color: "#6b7280", fontSize: "0.78rem", flexShrink: 0 },
  deleteBtn: {
    background: "none",
    border: "none",
    color: "#4b5563",
    cursor: "pointer",
    fontSize: "0.8rem",
    padding: "0 0.15rem",
    flexShrink: 0,
    lineHeight: 1,
  },

  btnPrimary: {
    padding: "0.5rem 0.9rem",
    borderRadius: 8,
    border: "none",
    background: "#1db954",
    color: "#041109",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "0.82rem",
    whiteSpace: "nowrap",
  },
  btnPrimaryLg: {
    marginTop: "1.25rem",
    padding: "0.65rem 1.5rem",
    borderRadius: 10,
    border: "none",
    background: "#1db954",
    color: "#041109",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "1rem",
  },
  btnGhost: {
    padding: "0.4rem 0.75rem",
    borderRadius: 8,
    border: "1px solid #374151",
    background: "transparent",
    color: "#9ca3af",
    cursor: "pointer",
    fontSize: "0.82rem",
  },
};