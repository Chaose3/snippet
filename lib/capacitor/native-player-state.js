import { getNativeSpotifyBridge } from "./platform";

function trackIdFromUri(uri) {
  if (!uri || typeof uri !== "string") return null;
  const match = uri.match(/^spotify:track:([a-zA-Z0-9]+)/);
  return match?.[1] ?? null;
}

/** Map SpotifyBridge getPlayerState → same shape as lib/snippet getPlayerState. */
export function mapNativePlayerStatePayload(payload) {
  if (!payload?.connected) return null;
  const track = payload.track;
  if (!track?.uri) return null;
  const id = track.id || trackIdFromUri(track.uri);
  if (!id) return null;
  return {
    id,
    name: track.name || "Unknown",
    uri: track.uri,
    artists: track.artists || "",
    albumArt: track.albumArt ?? null,
    durationMs: track.durationMs ?? 0,
    positionMs: payload.positionMs ?? 0,
    isPlaying: Boolean(payload.isPlaying),
    shuffle: false,
    repeatMode: "off",
    volumePercent: null,
    deviceName: "Spotify",
    deviceType: "smartphone",
  };
}

export async function fetchNativePlayerState() {
  const bridge = getNativeSpotifyBridge();
  if (!bridge?.getPlayerState) return null;
  try {
    const payload = await bridge.getPlayerState();
    return mapNativePlayerStatePayload(payload);
  } catch {
    return null;
  }
}

/** True when Spotify App Remote is connected (in-app transport without opening Spotify UI). */
export async function isAppRemoteConnected() {
  const bridge = getNativeSpotifyBridge();
  if (!bridge?.getPlayerState) return false;
  try {
    const payload = await bridge.getPlayerState();
    return Boolean(payload?.connected);
  } catch {
    return false;
  }
}
