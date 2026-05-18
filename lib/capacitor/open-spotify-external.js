import { getNativeSpotifyBridge, isNativeCapacitor } from "./platform";
import { getSpotifyWebOpenUrl, normalizeSpotifyUri } from "../spotify-open-url";

/**
 * Open a URL in the system handler (Safari or the owning native app).
 * Avoids Capacitor Browser / WebView window.open.
 */
async function openUrlExternally(url) {
  if (!url || typeof window === "undefined") return false;
  try {
    const { App } = await import("@capacitor/app");
    await App.openUrl({ url });
    return true;
  } catch (err) {
    console.warn("[openSpotifyExternal] App.openUrl failed", err);
    return false;
  }
}

/**
 * Open Spotify outside the Snippet WebView.
 * Native: SpotifyBridge → UIApplication; then App.openUrl universal link.
 * Web: new tab to open.spotify.com.
 * Never uses @capacitor/browser — that opens an in-app browser sheet.
 * @returns {"opened-native"|"opened"|"blocked"|"failed"|"no-url"|"skipped"}
 */
export async function openSpotifyExternal(trackUri, positionMs = 0) {
  const uri = normalizeSpotifyUri(trackUri) ?? trackUri;
  const bridge = getNativeSpotifyBridge();
  if (bridge?.openSpotifyExternal) {
    try {
      await bridge.openSpotifyExternal({ uri, positionMs });
      return "opened-native";
    } catch (err) {
      console.warn("[openSpotifyExternal] native bridge failed", err);
    }
  }

  const url = getSpotifyWebOpenUrl(uri, positionMs);
  if (!url) return "no-url";

  if (isNativeCapacitor()) {
    if (await openUrlExternally(url)) return "opened-native";
    return "failed";
  }

  const win = window.open(url, "_blank", "noopener,noreferrer");
  return win == null ? "blocked" : "opened";
}
