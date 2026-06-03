import { registerPlugin } from "@capacitor/core";
import { isNativeCapacitor } from "./platform";

const WidgetBridgePlugin = registerPlugin("WidgetBridge");

export function getWidgetBridge() {
  if (typeof window === "undefined") return null;
  const capacitor = window.Capacitor;
  const isNative =
    typeof capacitor?.isNativePlatform === "function"
      ? capacitor.isNativePlatform()
      : false;
  if (!isNative) return null;
  return capacitor?.Plugins?.WidgetBridge ?? WidgetBridgePlugin ?? null;
}

const WIDGET_IDLE = {
  trackId: null,
  trackName: "Not playing",
  artistName: "Open Snippet",
  albumArtUrl: null,
  isPlaying: false,
  positionMs: 0,
};

/**
 * Push now-playing snapshot to the iOS WidgetKit extension (App Group).
 * Widget shows last written state only — no Spotify network from the extension.
 * Writes idle snapshot when nothing is playing so the widget can disable Snip.
 */
export async function syncWidgetNowPlaying(playerState, positionMs) {
  if (!isNativeCapacitor()) return;
  const bridge = getWidgetBridge();
  if (!bridge?.syncNowPlaying) return;

  const payload = playerState?.name
    ? {
        trackId: playerState.id ?? null,
        trackName: playerState.name,
        artistName: playerState.artists ?? "",
        albumArtUrl: playerState.albumArt ?? null,
        isPlaying: Boolean(playerState.isPlaying),
        positionMs: Math.max(0, Math.round(positionMs ?? playerState.positionMs ?? 0)),
      }
    : WIDGET_IDLE;

  try {
    await bridge.syncNowPlaying(payload);
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[widget] syncNowPlaying failed:", err?.message ?? err);
    }
  }
}
