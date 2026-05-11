export const STORAGE_KEY = "spotify_access_token";
export const STORAGE_REFRESH = "spotify_refresh_token";
export const STORAGE_EXPIRES = "spotify_token_expires_at";
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
