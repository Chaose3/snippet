export const STORAGE_KEY = "spotify_access_token";
export const STORAGE_REFRESH = "spotify_refresh_token";
export const STORAGE_EXPIRES = "spotify_token_expires_at";
export const STORAGE_SCOPE = "spotify_token_scope";
export const STORAGE_AUTH_MODE = "spotify_auth_mode";
/** Spotify iOS App Remote login — now playing via native SDK, not Web API. */
export const AUTH_MODE_APP_REMOTE = "app_remote";
/** PKCE / web OAuth — full Web API scopes. */
export const AUTH_MODE_WEB_API = "web_api";
export const STORAGE_SNIPPET_MODE = "snippet_playback_mode";

export function getStoredToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function getStoredRefreshToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_REFRESH);
}

export function getStoredExpiry() {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(STORAGE_EXPIRES);
  return v ? Number(v) : null;
}

/** Persist tokens after OAuth, native Spotify app auth, or refresh. */
export function persistSpotifySession({
  access_token,
  refresh_token = null,
  expires_in = 3600,
  scope = null,
  auth_mode = null,
}) {
  if (typeof window === "undefined" || !access_token) return;
  localStorage.setItem(STORAGE_KEY, access_token);
  if (refresh_token) localStorage.setItem(STORAGE_REFRESH, refresh_token);
  else if (auth_mode === AUTH_MODE_APP_REMOTE) localStorage.removeItem(STORAGE_REFRESH);
  localStorage.setItem(STORAGE_EXPIRES, String(Date.now() + expires_in * 1000));
  // Refresh responses often omit `scope`; keep the granted scopes from the initial login.
  if (scope) localStorage.setItem(STORAGE_SCOPE, scope);
  if (auth_mode) localStorage.setItem(STORAGE_AUTH_MODE, auth_mode);
}

export function getStoredAuthMode() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_AUTH_MODE);
}

export function isAppRemoteAuthMode() {
  return getStoredAuthMode() === AUTH_MODE_APP_REMOTE;
}

export function getStoredScope() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_SCOPE);
}

export function clearSpotifySession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_REFRESH);
  localStorage.removeItem(STORAGE_EXPIRES);
  localStorage.removeItem(STORAGE_SCOPE);
  localStorage.removeItem(STORAGE_AUTH_MODE);
}

/** App Remote tokens in localStorage block Web API — clear so user can Connect with PKCE. */
export function clearLegacyAppRemoteSession() {
  if (typeof window === "undefined") return false;
  if (getStoredAuthMode() !== AUTH_MODE_APP_REMOTE) return false;
  clearSpotifySession();
  return true;
}
