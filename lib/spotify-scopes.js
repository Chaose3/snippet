/** Must match app/api/login/route.js — used to validate tokens after OAuth. */
export const SPOTIFY_WEB_API_SCOPES = [
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "user-read-recently-played",
  "streaming",
  "user-library-read",
  "playlist-read-private",
  "playlist-read-collaborative",
];

export const SPOTIFY_WEB_API_SCOPE_STRING = SPOTIFY_WEB_API_SCOPES.join(" ");

export function grantedScopesIncludeRequired(grantedScope) {
  if (!grantedScope || typeof grantedScope !== "string") return false;
  const granted = new Set(grantedScope.trim().split(/\s+/).filter(Boolean));
  return SPOTIFY_WEB_API_SCOPES.every((scope) => granted.has(scope));
}
