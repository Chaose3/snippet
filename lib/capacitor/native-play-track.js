import { getNativeSpotifyBridge } from "./platform";
import { openSpotifyExternal } from "./open-spotify-external";
import { isAppRemoteConnected } from "./native-player-state";
import { normalizeSpotifyUri } from "../spotify-open-url";
import {
  hasActiveSpotifyPlayback,
  playViaSpotifyWebApi,
  trackIdFromSpotifyUri,
} from "../spotify-web-play";

/**
 * Native playback:
 * - App Remote when connected (in-app control).
 * - Web API only when Spotify already has an active player session, verified after play.
 * - Open Spotify app when idle (no fake "playing" in Snippet without audio).
 * @returns {"remote"|"api"|"external"|"premium"|"failed"}
 */
export async function startNativeSpotifyPlayback(trackUri, positionMs = 0, options = {}) {
  const { withFreshToken, contextSource = null } = options;
  const uri = normalizeSpotifyUri(trackUri) ?? trackUri;
  if (!uri) return "failed";

  const bridge = getNativeSpotifyBridge();

  // IMPORTANT: App Remote `play(uri)` cannot start a playlist at an offset.
  // If we have playlist context+offset, prefer Web API so we don't lose context.
  const hasContextOffset = Boolean(contextSource?.contextUri && (contextSource?.offsetUri || contextSource?.offsetPosition != null));

  if (!hasContextOffset && (await isAppRemoteConnected()) && bridge?.connectAndPlay) {
    try {
      const result = await bridge.connectAndPlay({ uri, positionMs });
      if (!result?.openedExternal) return "remote";
    } catch (err) {
      console.warn("[startNativeSpotifyPlayback] App Remote play failed", err);
    }
  }

  if (withFreshToken) {
    try {
      const apiResult = await withFreshToken(async (accessToken) => {
        const active = await hasActiveSpotifyPlayback(accessToken);
        if (!active) {
          return { skipApi: true };
        }
        return playViaSpotifyWebApi(accessToken, uri, positionMs, contextSource);
      });

      if (apiResult?.skipApi) {
        console.log("[startNativeSpotifyPlayback] no active Spotify session — opening app");
      } else if (apiResult?.ok && apiResult?.verified) {
        return "api";
      } else if (apiResult?.status === 403) {
        return "premium";
      } else if (apiResult?.ok && !apiResult?.verified) {
        console.warn("[startNativeSpotifyPlayback] Web API accepted play but track not confirmed");
      }
    } catch (err) {
      console.warn("[startNativeSpotifyPlayback] Web API play failed", err);
    }
  }

  const opened = await openSpotifyExternal(uri, positionMs);
  if (opened === "opened-native" || opened === "opened") return "external";
  return "failed";
}

export { trackIdFromSpotifyUri };
