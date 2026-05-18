import { getNativeSpotifyBridge, isNativeCapacitor, NATIVE_OAUTH_REDIRECT_URI } from "./platform";
import { redactPkce, spotifyConnectLog, spotifyConnectWarn } from "./spotify-connect-log";

const SPOTIFY_APP_AUTH_TIMEOUT_MS = 120_000;

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label}_TIMEOUT`)), ms);
    }),
  ]);
}

/** Backup PKCE verifier if Spotify drops `state` on redirect. */
export const PKCE_VERIFIER_SESSION_KEY = "snippet_oauth_pkce_verifier";

export function stashPkceVerifier(verifier) {
  try {
    sessionStorage.setItem(PKCE_VERIFIER_SESSION_KEY, verifier);
  } catch {
    /* ignore */
  }
}

export function takePkceVerifier() {
  try {
    const v = sessionStorage.getItem(PKCE_VERIFIER_SESSION_KEY);
    sessionStorage.removeItem(PKCE_VERIFIER_SESSION_KEY);
    return v;
  } catch {
    return null;
  }
}

/**
 * PKCE in Capacitor Browser sheet — Snippet session (Web API scopes).
 */
export async function startNativeSpotifyLoginInBrowser({ challenge, verifier, redirectUri }) {
  spotifyConnectLog("browser.start", { redirectUri });
  stashPkceVerifier(verifier);
  const qs = new URLSearchParams({
    code_challenge: challenge,
    verifier,
    redirect_uri: redirectUri,
  });
  const loginUrl = `${window.location.origin}/api/login?${qs.toString()}`;
  const { Browser } = await import("@capacitor/browser");
  await Browser.open({ url: loginUrl, presentationStyle: "fullscreen" });
}

/**
 * PKCE in main WebView — last-resort fallback.
 */
export function startNativeSpotifyLoginInWebView({ challenge, verifier }) {
  stashPkceVerifier(verifier);
  const qs = new URLSearchParams({ code_challenge: challenge, verifier });
  window.location.assign(`${window.location.origin}/api/login?${qs.toString()}`);
}

/**
 * Optional: link App Remote in the Spotify app without returning a token to JS.
 * Spotify keeps this authorization; Snippet uses PKCE for Web API only.
 */
export async function linkNativeSpotifyPlayback() {
  const bridge = getNativeSpotifyBridge();
  if (!bridge?.authorize) return { linked: false };

  let installed = false;
  if (bridge.checkSpotifyInstalled) {
    const probe = await bridge.checkSpotifyInstalled();
    installed = Boolean(probe?.installed);
  }
  if (!installed) return { linked: false, reason: "SPOTIFY_NOT_INSTALLED" };

  spotifyConnectLog("spotifyApp.linkPlayback.start", {});
  try {
    await withTimeout(
      bridge.authorize.call(bridge),
      SPOTIFY_APP_AUTH_TIMEOUT_MS,
      "spotify_app_link"
    );
    spotifyConnectLog("spotifyApp.linkPlayback.done", {});
    return { linked: true };
  } catch (e) {
    spotifyConnectWarn("spotifyApp.linkPlayback.failed", { message: e?.message ?? String(e) });
    return { linked: false, reason: e?.message ?? String(e) };
  }
}

/** Fire-and-forget silent reconnect when Spotify already authorized App Remote. */
export function warmNativeSpotifyConnection() {
  const bridge = getNativeSpotifyBridge();
  if (!bridge?.connect) return;
  bridge.connect().catch((err) => {
    spotifyConnectWarn("spotifyApp.warmConnect.failed", { message: err?.message ?? String(err) });
  });
}

/**
 * Native Snippet login: PKCE only (full Web API token in localStorage).
 * App Remote auth stays in the Spotify SDK — not stored as the Snippet session.
 */
export async function startNativeSpotifyLogin({ challenge, verifier }) {
  spotifyConnectLog("native.entry", { flow: "pkce_first" });

  try {
    await startNativeSpotifyLoginInBrowser({
      challenge,
      verifier,
      redirectUri: NATIVE_OAUTH_REDIRECT_URI,
    });
    return { mode: "browser" };
  } catch (e) {
    spotifyConnectWarn("native.browser.failed", { message: e?.message ?? String(e) });
  }

  startNativeSpotifyLoginInWebView({ challenge, verifier });
  return { mode: "webview" };
}

export function isNativeLoginContext() {
  return isNativeCapacitor();
}
