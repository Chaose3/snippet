"use client";

import { memo } from "react";
import { formatMs } from "../../lib/timestamps";
import { s } from "./homeStyles";

export const TrackDetailModalQueue = memo(function TrackDetailModalQueue({
  upcomingTracks,
  setModalMenuOpen,
  setModalMenuSnippetsOpen,
  setSelectedTrack,
  playTrackWithMode,
}) {
  if (upcomingTracks.length === 0) return null;

  return (
    <div style={s.modalQueuePanel}>
      <div style={s.modalQueueHeader}>
        <p style={s.modalQueueHeading}>Up Next</p>
        <button
          style={s.modalQueueMenuBtn}
          aria-label="More options"
          onClick={() => {
            setModalMenuOpen((value) => {
              if (value) {
                setModalMenuSnippetsOpen(false);
                return false;
              }
              return true;
            });
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="12" cy="19" r="1.8" />
          </svg>
        </button>
      </div>
      <div style={s.modalQueueList}>
        {upcomingTracks.map((track, index) => (
          <button
            key={`${track.id}-${index}`}
            style={s.modalQueueRow}
            onClick={() => {
              setSelectedTrack(track);
              playTrackWithMode(track);
            }}
          >
            {track.albumArt ? (
              <img src={track.albumArt} alt="" style={s.modalQueueArt} />
            ) : (
              <div style={s.modalQueueArtFallback} />
            )}
            <div style={s.modalQueueMeta}>
              <span style={s.modalQueueName}>{track.name}</span>
              <span style={s.modalQueueArtist}>{track.artists}</span>
            </div>
            <span style={s.modalQueueDuration}>{formatMs(track.durationMs)}</span>
          </button>
        ))}
      </div>
    </div>
  );
});
