/** Total saved snippet rows across all tracks. */
export function countTotalSnippets(allTimestamps) {
  if (!allTimestamps || typeof allTimestamps !== "object") return 0;
  let total = 0;
  for (const tss of Object.values(allTimestamps)) {
    if (Array.isArray(tss)) total += tss.length;
  }
  return total;
}

/** Tracks that have at least one saved snippet. */
export function countTracksWithSnippets(allTimestamps) {
  if (!allTimestamps || typeof allTimestamps !== "object") return 0;
  return Object.values(allTimestamps).filter((tss) => Array.isArray(tss) && tss.length > 0).length;
}

/**
 * Group snippets by song for the library view (sorted A→Z by title, then artist).
 * @returns {Array<{ trackId, track, title, artists, albumArt, tss, snippetCount }>}
 */
export function buildSnippetGroups(allTimestamps, trackLookup = {}, snippetTrackMeta = {}) {
  if (!allTimestamps || typeof allTimestamps !== "object") return [];

  return Object.entries(allTimestamps)
    .filter(([, tss]) => Array.isArray(tss) && tss.length > 0)
    .map(([trackId, tss]) => {
      const saved = snippetTrackMeta[trackId];
      const live = trackLookup[trackId];
      const track =
        live?.name
          ? live
          : saved?.name
            ? {
                id: trackId,
                name: saved.name,
                artists: saved.artists ?? "",
                albumArt: saved.albumArt ?? null,
                uri: saved.uri ?? `spotify:track:${trackId}`,
                durationMs: saved.durationMs,
              }
            : live ?? null;
      const title = track?.name || saved?.name || "Unknown track";
      const artists = track?.artists || saved?.artists || "";
      const sorted = [...tss].sort((a, b) => a.positionMs - b.positionMs);
      return {
        trackId,
        track,
        title,
        artists,
        albumArt: track?.albumArt ?? saved?.albumArt ?? null,
        uri: track?.uri ?? saved?.uri ?? `spotify:track:${trackId}`,
        tss: sorted,
        snippetCount: sorted.length,
        sortTitle: title.toLocaleLowerCase(),
        sortArtists: artists.toLocaleLowerCase(),
      };
    })
    .sort(
      (a, b) =>
        a.sortTitle.localeCompare(b.sortTitle) ||
        a.sortArtists.localeCompare(b.sortArtists) ||
        a.trackId.localeCompare(b.trackId)
    );
}

/** Minimal track object for playback / player when lookup is incomplete. */
export function trackStubFromSnippetGroup(group) {
  if (group.track?.id) return group.track;
  return {
    id: group.trackId,
    name: group.title,
    artists: group.artists,
    uri: group.uri,
    albumArt: group.albumArt,
  };
}
