import { NextResponse } from "next/server";

const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI ?? "http://127.0.0.1:3000/callback";
const NATIVE_REDIRECT_URI = "snippet://callback";

const SCOPES = [
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "user-read-recently-played",
  "streaming",
  "user-library-read",
  "playlist-read-private",
  "playlist-read-collaborative",
].join(" ");

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
  const isNative = searchParams.get("native") === "1";

  if (!codeChallenge || !verifier) {
    return NextResponse.json(
      { error: "Missing code_challenge or verifier. Use the Login button — do not navigate here directly." },
      { status: 400 }
    );
  }

  const redirectUri = isNative ? NATIVE_REDIRECT_URI : REDIRECT_URI;

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: SCOPES,
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
    state: verifier,
    show_dialog: "false",
  });

  const url = `https://accounts.spotify.com/authorize?${params.toString()}`;
  console.log("[api/login] redirecting to Spotify (client-side PKCE)");
  return NextResponse.redirect(url);
}
