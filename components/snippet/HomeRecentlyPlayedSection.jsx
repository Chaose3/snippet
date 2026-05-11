"use client";

import { memo } from "react";
import { s } from "./homeStyles";

export const HomeRecentlyPlayedSection = memo(function HomeRecentlyPlayedSection({
  recentlyPlayedTracks,
  prioritizedRecentlyPlayed,
  remainingRecentlyPlayed,
  recentlyPlayedOpen,
  setRecentlyPlayedOpen,
  setSelectedTrack,
}) {
  return (
    <section style={s.sectionBlock}>
      <button style={s.sectionHeader} onClick={() => setRecentlyPlayedOpen((v) => !v)}>
        <div>
          <p style={s.sectionTitle}>Recently Played</p>
          <p style={s.sectionSubtle}>Jump back into your latest tracks</p>
        </div>
        <div style={s.sectionHeaderRight}>
          <span style={s.sectionMeta}>{recentlyPlayedTracks.length}</span>
          <span style={{ ...s.chevron, fontSize: "0.85rem" }}>{recentlyPlayedOpen ? "▲" : "▼"}</span>
        </div>
      </button>
      {recentlyPlayedTracks.length === 0 ? (
        <p style={{ ...s.muted, padding: "0.25rem 0.35rem 0.4rem" }}>Start listening and your recent songs will appear here.</p>
      ) : (
        <div style={s.recentlyPlayedGrid}>
          {[...prioritizedRecentlyPlayed, ...(recentlyPlayedOpen ? remainingRecentlyPlayed : [])].map((track) => (
            <button key={track.id} style={s.recentCard} onClick={() => setSelectedTrack(track)}>
              {track.albumArt ? (
                <img src={track.albumArt} alt="" style={s.recentCardArt} />
              ) : (
                <div style={s.recentCardArtFallback} />
              )}
              <div style={s.recentCardMeta}>
                <span style={s.recentCardName}>{track.name}</span>
                <span style={s.recentCardArtist}>{track.artists}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
});
