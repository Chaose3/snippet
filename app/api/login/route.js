import { NextResponse } from "next/server";
import { SPOTIFY_WEB_API_SCOPE_STRING } from "../../../lib/spotify-scopes";

const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI ?? "http://127.0.0.1:3000/callback";
const NATIVE_REDIRECT_URI = "snippet://callback";

const SCOPES = SPOTIFY_WEB_API_SCOPE_STRING;

export async function GET(request) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;

  if (!clientId) {
    console.error("[api/login] SPOTIFY_CLIENT_ID is missing");
    return NextResponse.json(
      { error: "Server missing SPOTIFY_CLIENT_ID. Add it to .env.local" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const codeChallenge = searchParams.get("code_challenge");
  const verifier = searchParams.get("verifier");
  const redirectOverride = searchParams.get("redirect_uri");
  const redirectUri = redirectOverride || REDIRECT_URI;
  console.log("[spotifyConnect][api/login] request", {
    redirectOverride: redirectOverride || null,
    redirectUri,
    isNativeRedirect: redirectUri === NATIVE_REDIRECT_URI,
    hasCodeChallenge: Boolean(codeChallenge),
    hasVerifier: Boolean(verifier),
    userAgent: request.headers.get("user-agent")?.slice(0, 120) ?? null,
  });

  if (!codeChallenge || !verifier) {
    return NextResponse.json(
      { error: "Missing code_challenge or verifier. Use the Login button — do not navigate here directly." },
      { status: 400 }
    );
  }

  // const redirectUri = isNative ? NATIVE_REDIRECT_URI : REDIRECT_URI;

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: SCOPES,
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
    state: verifier,
    // Native redirect must re-approve scopes; web can skip dialog when already consented.
    show_dialog: redirectUri === NATIVE_REDIRECT_URI ? "true" : "false",
  });

  const url = `https://accounts.spotify.com/authorize?${params.toString()}`;
  console.log("[spotifyConnect][api/login] redirect → accounts.spotify.com", {
    redirectUri,
    scopeCount: SCOPES.split(" ").length,
    authorizeHost: "accounts.spotify.com",
    note: "Spotify login page opens in whatever WebView/Browser loaded /api/login — not spotify:// by design",
  });
  return NextResponse.redirect(url);
}
