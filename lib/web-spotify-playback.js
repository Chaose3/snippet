/**
 * Whether the Spotify Web Playback SDK in this tab reports active (unpaused) playback.
 *
 * This reflects the SDK’s playback graph / stream state, not OS-level “sound is audible”
 * (muted tab, volume at zero, Bluetooth, etc. are not detectable from the web platform).
 *
 * @param {{ current: { getCurrentState?: () => Promise<unknown> } | null }} sdkPlayerRef
 * @returns {Promise<boolean>}
 */
export async function webSdkReportsPlaying(sdkPlayerRef) {
  const player = sdkPlayerRef?.current;
  if (!player || typeof player.getCurrentState !== "function") return false;
  try {
    const state = await player.getCurrentState();
    if (!state || state.paused !== false) return false;
    const track = state.track_window?.current_track;
    return Boolean(track);
  } catch {
    return false;
  }
}
