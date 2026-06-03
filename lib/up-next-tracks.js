/**
 * Build a stable Up Next list: dedupe, drop now-playing, prefer rich queue metadata.
 */
export function dedupeUpNextTracks(tracks, { excludeId = null, limit = 6 } = {}) {
  const seen = new Set();
  const out = [];
  for (const track of tracks) {
    if (!track?.id) continue;
    if (excludeId && track.id === excludeId) continue;
    if (seen.has(track.id)) continue;
    seen.add(track.id);
    out.push(track);
    if (out.length >= limit) break;
  }
  return out;
}

import { pickPlaybackContextFields } from "./playback-context";

export function enrichUpNextTrack(track, trackLookup) {
  const fromLookup = trackLookup?.[track.id];
  if (fromLookup?.id === track.id && fromLookup.name) {
    return {
      ...track,
      name: fromLookup.name,
      artists: fromLookup.artists ?? track.artists,
      albumArt: fromLookup.albumArt ?? track.albumArt,
      durationMs: fromLookup.durationMs ?? track.durationMs,
      uri: fromLookup.uri ?? track.uri,
      ...pickPlaybackContextFields(fromLookup),
    };
  }
  return track;
}
