import { NextResponse } from "next/server";

const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI ?? "http://127.0.0.1:3000/callback";
const ALLOWED_REDIRECT_URIS = new Set([REDIRECT_URI, "snippet://callback"]);

/**
 * Exchange authorization code for tokens (PKCE — no client secret).
 * Expects { code, code_verifier } in the JSON body.
 */
export async function POST(request) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "SPOTIFY_CLIENT_ID missing on server" },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const code = body?.code;
  const codeVerifier = body?.code_verifier;
  const redirectUri = body?.redirect_uri ?? REDIRECT_URI;

  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }
  if (!codeVerifier || typeof codeVerifier !== "string") {
    return NextResponse.json({ error: "Missing code_verifier" }, { status: 400 });
  }
  if (!ALLOWED_REDIRECT_URIS.has(redirectUri)) {
    return NextResponse.json({ error: "Invalid redirect_uri" }, { status: 400 });
  }

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: codeVerifier,
  });

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const text = await tokenRes.text();
  console.log("[api/token] Spotify token response status", tokenRes.status);

  if (!tokenRes.ok) {
    console.error("[api/token] Spotify error", text);
    return NextResponse.json(
      { error: "Token exchange failed", detail: text },
      { status: tokenRes.status }
    );
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid token response" }, { status: 502 });
  }

  return NextResponse.json({
    access_token: data.access_token,
    token_type: data.token_type,
    expires_in: data.expires_in,
    refresh_token: data.refresh_token ?? null,
    scope: data.scope,
  });
}
