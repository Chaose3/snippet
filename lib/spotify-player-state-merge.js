import { getPlaybackIntent, getPlaybackIntentMeta } from "./playback-intent";

/** Avoid queue list rerenders when Spotify returns the same ids in the same order. */
export function queueTracksShallowEqual(a, b) {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i]?.id !== b[i]?.id) return false;
  }
  return true;
}

/** Map GET /me/player/currently-playing into the same shape as getPlayerState. */
export function playerStateFromCurrentlyPlaying(data) {
  if (!data?.id) return null;
  return {
    id: data.id,
    name: data.name,
    uri: data.uri,
    artists: data.artists,
    albumArt: data.albumArt ?? null,
    durationMs: data.durationMs ?? 0,
    positionMs: data.progressMs ?? 0,
    isPlaying: data.isPlaying ?? true,
    shuffle: false,
    repeatMode: "off",
    volumePercent: null,
    deviceName: null,
    deviceType: null,
  };
}

/** Skip React updates when poll diff is only minor position drift on the same track. */
export function playerStatePollEquivalent(prev, next) {
  if (prev === next) return true;
  if (!prev || !next || prev.id !== next.id) return false;
  if (prev.isPlaying !== next.isPlaying) return false;
  if (prev.name !== next.name || prev.artists !== next.artists) return false;
  if (prev.shuffle !== next.shuffle || prev.repeatMode !== next.repeatMode) return false;
  if (Math.abs((prev.positionMs ?? 0) - (next.positionMs ?? 0)) > 2500) return false;
  return true;
}

function optimisticStateFromIntent(prev) {
  const intentTrackId = getPlaybackIntent();
  const meta = getPlaybackIntentMeta();
  if (!intentTrackId || meta?.id !== intentTrackId) return prev ?? null;
  return {
    id: meta.id,
    name: meta.name ?? prev?.name ?? "",
    uri: meta.uri ?? prev?.uri ?? null,
    artists: meta.artists ?? prev?.artists ?? "",
    albumArt: meta.albumArt ?? prev?.albumArt ?? null,
    durationMs: meta.durationMs || prev?.durationMs || 0,
    positionMs: prev?.positionMs ?? 0,
    isPlaying: true,
    shuffle: prev?.shuffle ?? false,
    repeatMode: prev?.repeatMode ?? "off",
    volumePercent: prev?.volumePercent ?? 100,
    deviceName: prev?.deviceName ?? null,
    deviceType: prev?.deviceType ?? null,
  };
}

/** Merge poll snapshot into existing state to reduce hero/queue flicker. */
export function mergePlayerState(prev, next, { intentTrackId = getPlaybackIntent() } = {}) {
  if (!next) return prev?.isPlaying ? prev : null;
  if (intentTrackId && next.id !== intentTrackId) {
    if (prev?.id === intentTrackId) return prev;
    const fromIntent = optimisticStateFromIntent(prev);
    if (fromIntent?.id === intentTrackId) return fromIntent;
    return prev;
  }
  if (!prev || prev.id !== next.id) return next;
  return {
    ...prev,
    ...next,
    name: next.name || prev.name,
    artists: next.artists || prev.artists,
    albumArt: next.albumArt ?? prev.albumArt,
    durationMs: next.durationMs || prev.durationMs,
    contextUri: next.contextUri ?? prev.contextUri ?? null,
    contextType: next.contextType ?? prev.contextType ?? null,
  };
}
