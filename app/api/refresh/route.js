import { NextResponse } from "next/server";

export async function POST(request) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
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

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
  });

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const text = await tokenRes.text();

  if (!tokenRes.ok) {
    console.error("[api/refresh] Spotify error", tokenRes.status, text);
    return NextResponse.json(
      { error: "Refresh failed", detail: text },
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
    // Spotify rotates the refresh token occasionally — pass it through if present
    refresh_token: data.refresh_token ?? null,
  });
}
