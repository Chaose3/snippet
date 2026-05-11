"use client";

import { memo } from "react";
import { s } from "./homeStyles";
import { ThemedLoader } from "./ThemedLoader";

export const HomePlaylistsSection = memo(function HomePlaylistsSection({
  playlists,
  prioritizedPlaylists,
  remainingPlaylists,
  playlistsOpen,
  setPlaylistsOpen,
  openPlaylistId,
  playlistTracks,
  loadingPlaylistId,
  playlistErrors,
  handleTogglePlaylist,
  handleQuickPlayPlaylist,
  playTrackWithMode,
}) {
  return (
    <section style={s.sectionBlock}>
      <button style={s.sectionHeader} onClick={() => setPlaylistsOpen((v) => !v)}>
        <div>
          <p style={s.sectionTitle}>Playlists</p>
          <p style={s.sectionSubtle}>Most recent playlists first</p>
        </div>
        <div style={s.sectionHeaderRight}>
          <span style={s.sectionMeta}>{playlists.length}</span>
          <span style={{ ...s.chevron, fontSize: "0.85rem" }}>{playlistsOpen ? "▲" : "▼"}</span>
        </div>
      </button>
      {prioritizedPlaylists.length === 0 ? (
        <p style={{ ...s.muted, padding: "0.25rem 0.35rem 0.4rem" }}>
          {playlists.length === 0 ? "No playlists found yet." : "Loading playlists…"}
        </p>
      ) : (
        <>
          <div style={s.playlistGrid}>
            {[...prioritizedPlaylists, ...(playlistsOpen ? remainingPlaylists : [])].map((pl) => (
                <div
                  key={pl.id}
                  style={{ ...s.playlistGridCard, ...(openPlaylistId === pl.id ? s.playlistGridCardActive : {}) }}
                >
                  <button
                    style={s.playlistGridMain}
                    onClick={() => handleTogglePlaylist(pl.id)}
                  >
                    {pl.coverArt ? (
                      <img src={pl.coverArt} alt="" style={s.playlistGridArt} />
                    ) : (
                      <div style={s.playlistGridArtFallback} />
                    )}
                    <div style={s.playlistGridMeta}>
                      <span style={s.playlistGridName}>{pl.name}</span>
                    </div>
                  </button>
                  <button
                    style={s.playlistQuickPlayBtn}
                    onClick={() => handleQuickPlayPlaylist(pl)}
                    title="Shuffle play playlist"
                    aria-label={`Shuffle play ${pl.name}`}
                  >
                    <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                </div>
            ))}
          </div>
          {openPlaylistId && (() => {
            const currentPlaylist = playlists.find((pl) => pl.id === openPlaylistId);
            const tracks = playlistTracks[openPlaylistId] || [];
            const loading = loadingPlaylistId === openPlaylistId;
            return (
              <div style={s.expandedPlaylistPanel}>
                <p style={s.expandedPlaylistTitle}>{currentPlaylist?.name ?? "Playlist"}</p>
                {loading ? (
                  <div style={s.sectionLoader}>
                    <ThemedLoader size={0.34} label="Loading playlist" inline />
                  </div>
                ) : playlistErrors[openPlaylistId] ? (
                  <p style={s.muted}>{playlistErrors[openPlaylistId]}</p>
                ) : tracks.length === 0 ? (
                  <p style={s.muted}>No tracks found.</p>
                ) : (
                  <div style={s.compactTrackList}>
                    {tracks.map((track) => (
                      <div key={track.id} style={s.compactTrackRow}>
                        <div style={s.compactTrackMeta} onClick={() => playTrackWithMode(track)}>
                          {track.albumArt ? (
                            <img src={track.albumArt} alt="" style={s.compactTrackArt} />
                          ) : (
                            <div style={s.compactTrackArtFallback} />
                          )}
                          <div style={{ minWidth: 0 }}>
                            <span style={s.compactTrackName}>{track.name}</span>
                            <span style={s.compactTrackArtist}>{track.artists}</span>
                          </div>
                        </div>
                        <button
                          style={s.trackOptionsBtn}
                          onClick={(event) => {
                            event.stopPropagation();
                          }}
                          title="Track options"
                          aria-label="Track options"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="5" r="1.8" />
                            <circle cx="12" cy="12" r="1.8" />
                            <circle cx="12" cy="19" r="1.8" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </>
      )}
    </section>
  );
});
