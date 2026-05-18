import { NextResponse } from "next/server";
import { buildSpotifyTokenRequest, getSpotifyOAuthCredentials } from "../../../lib/spotify-oauth-server";

export async function POST(request) {
  const { clientId, clientSecret } = getSpotifyOAuthCredentials();
  if (!clientId) {
    return NextResponse.json({ error: "SPOTIFY_CLIENT_ID missing" }, { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const refreshToken = body?.refresh_token;
  if (!refreshToken || typeof refreshToken !== "string") {
    return NextResponse.json({ error: "Missing refresh_token" }, { status: 400 });
  }

  const tokenRequest = buildSpotifyTokenRequest({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  if (tokenRequest.error) {
    return NextResponse.json({ error: tokenRequest.error }, { status: 500 });
  }

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: tokenRequest.headers,
    body: tokenRequest.body,
  });

  const text = await tokenRes.text();

  if (!tokenRes.ok) {
    console.error("[api/refresh] Spotify error", tokenRes.status, text);
    const hint =
      tokenRes.status === 400 && text.includes("invalid_client") && !clientSecret
        ? "Add SPOTIFY_CLIENT_SECRET from the Spotify Developer Dashboard to .env.local (or clear stored tokens and log in again)."
        : null;
    return NextResponse.json(
      { error: "Refresh failed", detail: text, hint },
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
    expires_in: data.expires_in ?? 3600,
    refresh_token: data.refresh_token ?? null,
    scope: data.scope ?? null,
  });
}
