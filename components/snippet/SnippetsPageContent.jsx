"use client";

import { memo, useCallback } from "react";
import { formatMs } from "../../lib/timestamps";
import { trackStubFromSnippetGroup } from "../../lib/snippet-aggregates";
import { useAppPlayback } from "../../contexts/AppPlaybackContext";
import { s } from "./homeStyles";

const SnippetRow = memo(function SnippetRow({ trackId, index, ts, onPlay, onDelete }) {
  return (
    <li style={s.listItem}>
      <span className="snippet-label" style={{ flex: 1, minWidth: 0 }}>
        {ts.label || `Snippet ${index + 1}`}
        <span className="snippet-meta">{formatMs(ts.positionMs)}</span>
      </span>
      <button type="button" style={s.homeSnippetPlayBtn} onClick={onPlay} title="Play snippet" aria-label="Play snippet">
        ▶
      </button>
      <span style={s.tsTime}>{formatMs(ts.positionMs)}</span>
      <button
        type="button"
        style={s.deleteBtn}
        onClick={onDelete}
        title="Remove snippet"
        aria-label="Remove snippet"
      >
        ✕
      </button>
    </li>
  );
});

const SnippetSongGroup = memo(function SnippetSongGroup({
  group,
  onOpenTrack,
  onPrefetchPlayer,
  onPlaySnippet,
  onDeleteSnippet,
  onDeleteGroup,
}) {
  const stub = trackStubFromSnippetGroup(group);

  const handleDeleteGroupClick = (e) => {
    e.stopPropagation();
    const label = group.title === "Unknown track" ? "this song" : `"${group.title}"`;
    const count = group.snippetCount;
    if (
      !window.confirm(
        `Delete all ${count} snippet${count === 1 ? "" : "s"} for ${label}? This cannot be undone.`
      )
    ) {
      return;
    }
    void onDeleteGroup(group.trackId);
  };

  return (
    <section style={s.snippetGroupCard}>
      <div style={s.snippetGroupHeaderRow}>
        <button
          type="button"
          className="player-open-target"
          style={s.snippetGroupHeader}
          onPointerEnter={() => onPrefetchPlayer?.(group.trackId)}
          onClick={() => onOpenTrack(stub)}
        >
          {group.albumArt ? (
            <img src={group.albumArt} alt="" style={s.trackArt} />
          ) : (
            <div style={s.trackArtFallback} />
          )}
          <div style={{ minWidth: 0, flex: 1, textAlign: "left" }}>
            <span style={s.trackRowName}>{group.title}</span>
            {group.artists ? <span style={s.trackRowArtist}>{group.artists}</span> : null}
          </div>
          <span style={s.sectionMeta}>{group.snippetCount}</span>
        </button>
        <button
          type="button"
          style={s.snippetGroupDeleteBtn}
          onClick={handleDeleteGroupClick}
          title="Delete all snippets for this song"
          aria-label={`Delete all snippets for ${group.title}`}
        >
          Delete all
        </button>
      </div>
      <ul style={s.list}>
        {group.tss.map((ts, index) => (
          <SnippetRow
            key={`${group.trackId}-${index}-${ts.positionMs}`}
            trackId={group.trackId}
            index={index}
            ts={ts}
            onPlay={() => onPlaySnippet(stub, ts.positionMs)}
            onDelete={() => onDeleteSnippet(group.trackId, index)}
          />
        ))}
      </ul>
    </section>
  );
});

export const SnippetsPageContent = memo(function SnippetsPageContent() {
  const {
    token,
    snippetGroups,
    totalSnippetCount,
    tracksWithSnippetsCount,
    openPlayerForTrack,
    prefetchPlayerRoute,
    jump,
    handleDelete,
    handleDeleteTrackGroup,
  } = useAppPlayback();

  const onPlaySnippet = useCallback(
    (track, positionMs) => {
      jump(track, positionMs, track);
    },
    [jump]
  );

  if (!token) return null;

  return (
    <div style={s.searchPage}>
      <div style={s.sectionHeaderStatic}>
        <div style={{ minWidth: 0 }}>
          <p style={s.tabHeading}>Snippets</p>
          <p style={s.sectionSubtle}>
            {totalSnippetCount === 0
              ? "Saved moments from any song appear here"
              : `${totalSnippetCount} saved moment${totalSnippetCount === 1 ? "" : "s"} · ${tracksWithSnippetsCount} song${tracksWithSnippetsCount === 1 ? "" : "s"}`}
          </p>
        </div>
        {totalSnippetCount > 0 && <span style={s.sectionMeta}>{totalSnippetCount}</span>}
      </div>

      {snippetGroups.length === 0 ? (
        <p style={s.searchHint}>
          No snippets yet. Play a song and tap Snip in the player or on your lock screen widget.
        </p>
      ) : (
        <div style={s.snippetsLibrary}>
          {snippetGroups.map((group) => (
            <SnippetSongGroup
              key={group.trackId}
              group={group}
              onOpenTrack={openPlayerForTrack}
              onPrefetchPlayer={prefetchPlayerRoute}
              onPlaySnippet={onPlaySnippet}
              onDeleteSnippet={handleDelete}
              onDeleteGroup={handleDeleteTrackGroup}
            />
          ))}
        </div>
      )}
    </div>
  );
});
