/**
 * Capacitor / native WebView helpers. Keep in sync with iOS URL scheme and Spotify redirect URIs.
 */
export const NATIVE_OAUTH_REDIRECT_URI = "snippet://callback";

export function getNativeSpotifyBridge() {
  if (typeof window === "undefined") return null;
  const capacitor = window.Capacitor;
  const isNative =
    typeof capacitor?.isNativePlatform === "function"
      ? capacitor.isNativePlatform()
      : false;
  if (!isNative) return null;
  return capacitor?.Plugins?.SpotifyBridge ?? null;
}

export function isNativeCapacitor() {
  if (typeof window === "undefined") return false;
  const c = window.Capacitor;
  if (!c) return false;
  if (typeof c.isNativePlatform === "function") return Boolean(c.isNativePlatform());
  if (typeof c.getPlatform === "function") return c.getPlatform() !== "web";
  return Boolean(c.Plugins);
}
