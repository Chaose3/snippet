# Snippet manual regression checklist

Run after refactors touching auth, playback, search, or Capacitor.

## Invariants (do not change without updating Spotify dashboard / iOS URL schemes)

| Item | Value |
|------|--------|
| Access token localStorage key | `spotify_access_token` |
| Refresh token key | `spotify_refresh_token` |
| Expiry key | `spotify_token_expires_at` |
| Snippet mode key | `snippet_playback_mode` |
| Native OAuth redirect | `snippet://callback` (must match Spotify app settings and iOS URL types) |
| Web OAuth redirect | `SPOTIFY_REDIRECT_URI` / default `http://127.0.0.1:3000/callback` |

## Web (browser)

- [ ] Cold load `/` shows landing; no console errors.
- [ ] Connect Spotify → Spotify authorize → `/callback` → app shows logged-in UI; tokens in localStorage.
- [ ] Now playing appears when something plays on an active device; position updates while playing.
- [ ] Seek slider and transport (shuffle, repeat, skip) behave as before.
- [ ] Save snippet / label / delete snippet; data survives refresh (Upstash `/api/timestamps`).
- [ ] Search tab: query returns results; no runaway network (many playlists).
- [ ] Open playlist loads tracks; play from playlist works.
- [ ] Logout clears tokens and resets library UI.
- [ ] Token refresh: leave app open past expiry minus buffer; playback API still works.

## Capacitor iOS (or native WebView)

- [ ] For live reload: set `CAP_SERVER_URL` (or `CAPACITOR_SERVER_URL`) to your machine’s LAN IP and Next port when running `npx cap sync` from `mobile/` (see comments in [`mobile/capacitor.config.ts`](../mobile/capacitor.config.ts)). If unset, the app uses bundled `www` only.
- [ ] Connect Spotify opens in-app browser; after approve, returns via `snippet://callback`; browser closes; logged in.
- [ ] Cold start: open app via deep link callback if applicable — `getLaunchUrl` path still receives code.
- [ ] If `SpotifyBridge` is present: play from Snippet invokes native playback; pause/resume/seek work.
- [ ] With Spotify installed but idle: play opens **Spotify app** via Branch content link (not `open.spotify.com` in-app browser).
- [ ] Without bridge: REST playback path still behaves (external device).

## Performance smoke

- [ ] With music playing, UI stays responsive (no long jank when typing in search).
- [ ] Search with large library: no hundreds of simultaneous Spotify requests.
