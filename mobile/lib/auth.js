import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

// Required so the in-app browser dismisses itself after the OAuth redirect
WebBrowser.maybeCompleteAuthSession();

export const SPOTIFY_CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID;

export const SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'user-library-read',
  'playlist-read-private',
];

export const discovery = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

/**
 * Returns the redirect URI for the current environment.
 * - Expo Go (dev): proxied exp:// URI
 * - Standalone build: snippet://callback
 *
 * Register BOTH in your Spotify app's Redirect URIs on developer.spotify.com.
 */
export function makeRedirectUri() {
  return AuthSession.makeRedirectUri({
    scheme: 'snippet',
    path: 'callback',
  });
}

/**
 * Exchange an authorization code for access + refresh tokens.
 * Uses PKCE so no client secret is needed.
 */
export async function exchangeCodeForTokens(code, codeVerifier, redirectUri) {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: SPOTIFY_CLIENT_ID,
    code_verifier: codeVerifier,
  });

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }

  return res.json();
}

/**
 * Use a refresh token to get a new access token.
 */
export async function refreshAccessToken(refreshToken) {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: SPOTIFY_CLIENT_ID,
  });

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed (${res.status}): ${text}`);
  }

  return res.json();
}
