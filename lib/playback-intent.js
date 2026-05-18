/** While a play request is in flight, block polls from reverting UI to the previous Spotify track. */
let pendingTrackId = null;
/** Minimal track metadata for optimistic UI when polls still report the previous track. */
let pendingTrackMeta = null;
let clearTimer = null;

const HOLD_MS = 15_000;

export function setPlaybackIntent(trackId, trackMeta = null) {
  if (!trackId) return;
  pendingTrackId = trackId;
  pendingTrackMeta =
    trackMeta?.id === trackId
      ? {
          id: trackMeta.id,
          name: trackMeta.name ?? "",
          uri: trackMeta.uri ?? null,
          artists: trackMeta.artists ?? "",
          albumArt: trackMeta.albumArt ?? null,
          durationMs: trackMeta.durationMs ?? 0,
        }
      : pendingTrackMeta?.id === trackId
        ? pendingTrackMeta
        : null;
  if (clearTimer) clearTimeout(clearTimer);
  clearTimer = setTimeout(() => {
    pendingTrackId = null;
    pendingTrackMeta = null;
    clearTimer = null;
  }, HOLD_MS);
}

export function getPlaybackIntent() {
  return pendingTrackId;
}

export function getPlaybackIntentMeta() {
  return pendingTrackMeta;
}

export function clearPlaybackIntent(trackId) {
  if (trackId && pendingTrackId !== trackId) return;
  pendingTrackId = null;
  pendingTrackMeta = null;
  if (clearTimer) {
    clearTimeout(clearTimer);
    clearTimer = null;
  }
}
