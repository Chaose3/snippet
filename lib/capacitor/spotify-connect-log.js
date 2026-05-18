import { getNativeSpotifyBridge, isNativeCapacitor, NATIVE_OAUTH_REDIRECT_URI } from "./platform";

const PREFIX = "[spotifyConnect]";

function redactPkce(value) {
  if (!value || typeof value !== "string") return value;
  if (value.length <= 10) return `${value.slice(0, 4)}…`;
  return `${value.slice(0, 8)}…(${value.length} chars)`;
}

/** Structured logs for Connect Spotify — filter Safari/Web Inspector console by `spotifyConnect`. */
export function spotifyConnectLog(phase, detail = {}) {
  const payload =
    detail && typeof detail === "object" && !Array.isArray(detail)
      ? { ts: new Date().toISOString(), ...detail }
      : { ts: new Date().toISOString(), value: detail };
  console.log(PREFIX, phase, payload);
}

export function spotifyConnectWarn(phase, detail = {}) {
  const payload =
    detail && typeof detail === "object" && !Array.isArray(detail)
      ? { ts: new Date().toISOString(), ...detail }
      : { ts: new Date().toISOString(), value: detail };
  console.warn(PREFIX, phase, payload);
}

export function spotifyConnectError(phase, detail = {}) {
  const err = detail?.error ?? detail;
  const message = err?.message ?? String(err);
  console.error(PREFIX, phase, {
    ts: new Date().toISOString(),
    message,
    ...(detail && typeof detail === "object" ? detail : { detail }),
  });
}

/** Snapshot native/web capabilities before starting OAuth. */
export async function probeSpotifyConnectEnvironment() {
  const cap = typeof window !== "undefined" ? window.Capacitor : null;
  const platform =
    cap && typeof cap.getPlatform === "function" ? cap.getPlatform() : "unknown";
  const isNative = isNativeCapacitor();
  const bridge = getNativeSpotifyBridge();
  const bridgeMethodNames = bridge
    ? Object.keys(bridge).filter((k) => typeof bridge[k] === "function")
    : [];

  let spotifyAppInstalled = null;
  let spotifyProbeError = null;
  if (bridge?.checkSpotifyInstalled) {
    try {
      const res = await bridge.checkSpotifyInstalled();
      spotifyAppInstalled = Boolean(res?.installed);
    } catch (e) {
      spotifyProbeError = e?.message ?? String(e);
    }
  }

  let browserPluginAvailable = false;
  let browserProbeError = null;
  try {
    const { Browser } = await import("@capacitor/browser");
    browserPluginAvailable = Boolean(Browser?.open);
  } catch (e) {
    browserProbeError = e?.message ?? String(e);
  }

  const snapshot = {
    isNative,
    platform,
    origin: typeof window !== "undefined" ? window.location.origin : null,
    href: typeof window !== "undefined" ? window.location.href : null,
    nativeRedirectUri: NATIVE_OAUTH_REDIRECT_URI,
    hasSpotifyBridge: Boolean(bridge),
    bridgeMethods: bridgeMethodNames,
    spotifyAppInstalled,
    spotifyProbeError,
    browserPluginAvailable,
    browserProbeError,
    expectedNativeFlow:
      "1) SpotifyBridge.authorize → Spotify app → snippet://callback token. 2) Browser PKCE sheet. 3) WebView HTTP /callback.",
  };

  spotifyConnectLog("environment.probe", snapshot);
  return snapshot;
}

export { redactPkce, PREFIX };
