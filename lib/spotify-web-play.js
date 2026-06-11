import {
  getCurrentlyPlaying,
  getDevices,
  getPlayerState,
  playSnippet,
  transferPlayback,
} from "./snippet";

export function trackIdFromSpotifyUri(uri) {
  if (!uri || typeof uri !== "string") return null;
  const match = uri.match(/^spotify:track:([a-zA-Z0-9]+)/i);
  return match?.[1] ?? null;
}

/** Prefer the phone Spotify app when nothing is marked active. */
export function pickNativePlaybackDevice(devices) {
  if (!devices?.length) return null;
  const active = devices.find((d) => d.isActive);
  if (active) return active.id;
  const phone = devices.find((d) => (d.type || "").toLowerCase() === "smartphone");
  if (phone) return phone.id;
  return devices[0]?.id ?? null;
}

function buildPlayRequest(trackUri, positionMs, contextSource, deviceId = null) {
  const useContext = Boolean(
    contextSource?.contextUri &&
      (contextSource?.offsetUri || contextSource?.offsetPosition != null)
  );
  return {
    trackUri,
    positionMs,
    deviceId,
    contextUri: useContext ? contextSource.contextUri : null,
    offsetUri: useContext ? contextSource.offsetUri : null,
    offsetPosition: useContext ? contextSource.offsetPosition : undefined,
  };
}

/** Spotify reports a controllable player (not just a dormant phone in the device list). */
export async function hasActiveSpotifyPlayback(accessToken) {
  const devices = await getDevices(accessToken);
  if (devices.some((d) => d.isActive)) return true;

  const state = await getPlayerState(accessToken);
  if (state?.id) return true;

  const current = await getCurrentlyPlaying(accessToken);
  if (current?.id) return true;

  return false;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Poll Spotify until the requested track is actually reported as playing (or give up). */
export async function confirmPlaybackStarted(
  accessToken,
  targetTrackId,
  { attempts = 5, delayMs = 450 } = {}
) {
  if (!targetTrackId) return false;

  for (let i = 0; i < attempts; i += 1) {
    if (i > 0) await delay(delayMs);

    const state = await getPlayerState(accessToken);
    if (state?.id === targetTrackId) return true;

    const current = await getCurrentlyPlaying(accessToken);
    if (current?.id === targetTrackId) return true;
  }

  return false;
}

/**
 * Start or switch playback via Spotify Web API (no App Remote / no opening Spotify UI).
 * @returns {Promise<{ ok: boolean, status?: number, verified?: boolean }>}
 */
export async function playViaSpotifyWebApi(accessToken, trackUri, positionMs = 0, contextSource = null) {
  const targetTrackId = trackIdFromSpotifyUri(trackUri);
  const requestForDevice = (deviceId) =>
    buildPlayRequest(trackUri, positionMs, contextSource, deviceId);

  const devices = await getDevices(accessToken);
  const targetDevice = pickNativePlaybackDevice(devices);

  const tryPlay = async (deviceId) => {
    const res = await playSnippet(accessToken, requestForDevice(deviceId));
    if (res.status !== 204 && !res.ok) {
      return { ok: false, status: res.status };
    }
    const verified = await confirmPlaybackStarted(accessToken, targetTrackId);
    return { ok: true, status: res.status, verified };
  };

  if (targetDevice) {
    const device = devices.find((d) => d.id === targetDevice);
    if (device && !device.isActive) {
      await transferPlayback(accessToken, targetDevice, true);
    }
    const result = await tryPlay(targetDevice);
    if (result.ok) return result;
    if (result.status !== 404 && result.status !== 0) {
      return result;
    }
  }

  const fallback = await tryPlay(null);
  if (fallback.ok) return fallback;
  return fallback;
}
