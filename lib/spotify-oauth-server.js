/**
 * Server-only Spotify token endpoint helpers (Authorization Code / PKCE).
 * @see https://developer.spotify.com/documentation/web-api/tutorials/refreshing-tokens
 */

export function getSpotifyOAuthCredentials() {
  const clientId = process.env.SPOTIFY_CLIENT_ID?.trim();
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim() || "";
  return { clientId, clientSecret };
}

/** POST body + headers for https://accounts.spotify.com/api/token */
export function buildSpotifyTokenRequest(params) {
  const { clientId, clientSecret } = getSpotifyOAuthCredentials();
  if (!clientId) {
    return { error: "SPOTIFY_CLIENT_ID missing" };
  }

  const body = new URLSearchParams(params);
  const headers = { "Content-Type": "application/x-www-form-urlencoded" };

  if (clientSecret) {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    headers.Authorization = `Basic ${basic}`;
  } else {
    body.set("client_id", clientId);
  }

  return { body: body.toString(), headers };
}
