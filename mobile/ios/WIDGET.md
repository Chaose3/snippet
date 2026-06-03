# Snippet iOS Now Playing Widget

## Lock screen: WidgetKit vs system Now Playing

| What you want | What it is | How you get it |
|---------------|------------|----------------|
| **Custom Snippet UI** (track title under the clock, tap to open app) | **WidgetKit** accessory widget | User must **manually add** it once (see below). Apple does **not** allow apps to install lock screen widgets on first launch. |
| **Spotify-style player on the lock screen** (play/pause, skip, album art from iOS) | **MPNowPlayingInfoCenter** / system Now Playing | Updates automatically while Snippet is playing and syncing playback (no manual widget add). This is what Spotify uses for “it just shows up when music plays” — not WidgetKit. |

If you expected the widget to appear by itself after install, that expectation applies to **system Now Playing**, not the Snippet WidgetKit extension.

## “Please adopt co……” on the widget

That truncated text is **not** from Snippet code. iOS 17+ shows a system placeholder when a widget view omits the required **`containerBackground(for: .widget)`** API. The extension now applies `containerBackground` (with `AccessoryWidgetBackground` for lock screen families). Rebuild and reinstall; the widget should show track title / artist from App Group data instead.

## App Group

- **Identifier:** `group.com.snippet-nick.app`
- Shared `UserDefaults` key: `snippet.nowPlaying.v1` (JSON snapshot)

### Apple Developer portal

1. **Identifiers → App Groups** → create `group.com.snippet-nick.app` (if missing).
2. **Identifiers → App ID** `com.snippet-nick.app` → enable **App Groups** → check `group.com.snippet-nick.app`.
3. **Identifiers → App ID** `com.snippet-nick.app.SnippetWidget` → enable **App Groups** → check the **same** group.
4. Regenerate **provisioning profiles** for both App IDs (or use Automatic Signing in Xcode after the above).

Both targets must list the group in entitlements:

- `App/AppDebug.entitlements` (Debug)
- `App/App.entitlements` (Release)
- `SnippetWidget/SnippetWidget.entitlements`

## Targets

| Target | Bundle ID | Role |
|--------|-----------|------|
| App | `com.snippet-nick.app` | Main app; writes widget + Now Playing via `WidgetBridgePlugin` |
| SnippetWidgetExtension | `com.snippet-nick.app.SnippetWidget` | WidgetKit extension (embedded in `App.app/PlugIns/`) |

Lock screen families: `.accessoryInline`, `.accessoryCircular`, `.accessoryRectangular` (iOS 16+). Extension deployment target: **iOS 17.0**.

## Build and install

1. From repo root: `npm run ios:sync` (or `cd mobile && npm run sync:ios`).
2. Open `mobile/ios/App/App.xcodeproj` in Xcode.
3. Select the **App** scheme (not only the widget scheme).
4. Build & run on a **physical iPhone** (iOS 17+ recommended for lock screen accessories).
5. Confirm the extension is embedded: after build, `App.app/PlugIns/SnippetWidgetExtension.appex` must exist (Xcode does this via **Embed Foundation Extensions** + target dependency).

If you added the widget target recently, **delete Snippet from the device and reinstall** so iOS registers the extension.

## Add the lock screen widget (optional, manual)

1. Open Snippet, log in, and **play a track** (so the app can write App Group state).
2. Lock the phone.
3. **Long-press the lock screen** → **Customize** → select the lock screen → **Lock Screen** widgets area (below the clock).
4. Tap **+** and find **Snippet For Spotify** (host app name in the widget gallery).
5. Choose **Snippet** and pick **inline**, **circular**, or **rectangular**.
6. Tap **Done**.

Home Screen: long-press home screen → **+** → search **Snippet For Spotify** → add the small **Snippet** widget.

## System Now Playing (automatic lock screen player)

When playback sync runs, the app sets `MPNowPlayingInfoCenter` (title, artist, elapsed time, artwork URL when available) and registers lock-screen remote commands (play/pause/skip) via `MPRemoteCommandCenter`, forwarded to Spotify App Remote when connected.

**How to test**

1. Build & run on a physical iPhone with Spotify installed and App Remote connected.
2. Play a track in Snippet (foreground for a few seconds so `syncWidgetNowPlaying` runs).
3. Lock the device — you should see the **system** Now Playing card (not only the custom widget).
4. Use play/pause/skip on the lock screen; requires App Remote connected to Spotify.

**Caveats:** Audio is played by the Spotify app via App Remote. Snippet publishes metadata for the lock screen UI; Spotify may also update Now Playing. Skip/next/prev only work when App Remote is connected. Snippet-mode skip logic in the WebView is not applied to hardware remote commands (native skip goes to Spotify).

## Verify WidgetKit data is syncing

1. With music playing in Snippet, keep the app in the foreground for a few seconds.
2. The widget should show the track title (not “Please adopt…”, “Not playing / Open Snippet”, or placeholder truncation).
3. If sync fails (App Group misconfigured), the JS bridge rejects with  
   `App Group unavailable. Enable group.com.snippet-nick.app on App and SnippetWidgetExtension targets.`

## Manual Xcode steps (signing)

1. Open `mobile/ios/App/App.xcodeproj`.
2. **App** target → **Signing & Capabilities** → **+ Capability** → **App Groups** → enable `group.com.snippet-nick.app`.
3. **SnippetWidgetExtension** target → same App Group.
4. **App** target → **General** → **Frameworks, Libraries, and Embedded Content** / embed phase → **SnippetWidgetExtension** should be listed (Embed Foundation Extensions).

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| “Please adopt co……” on widget | Missing `containerBackground` (fixed in current code) | Rebuild App scheme, reinstall, remove and re-add widget. |
| Nothing new on lock screen after locking | Only WidgetKit added / nothing playing | Play music for **system Now Playing**; or add widget manually for custom UI. |
| Cannot find widget in gallery | Wrong search name / old install | Search **Snippet For Spotify**; delete app, clean build, reinstall. |
| Widget shows “Not playing” | App Group or no playback yet | Fix App Groups; play a track with app open. |
| Widget gallery missing entirely | Extension not embedded | Build **App** scheme; check `PlugIns/SnippetWidgetExtension.appex`. |
| Build errors on Release | Missing `App.entitlements` | Ensure `App/App.entitlements` exists and is in the App target signing settings. |
| Lock screen controls do nothing | App Remote disconnected | Open Snippet, ensure Spotify login / connection, play again. |

## Snip button (widget)

Widget families show **one** Snip control each (no duplicate `widgetURL` + `Link` on the same family). Snip is **enabled** only when App Group `isPlaying` is true and `trackId` is set; otherwise the scissors control is greyed and non-tappable (whole-widget tap opens the player instead).

| Family | UI |
|--------|-----|
| **Circular** (lock screen) | Scissors icon (Link when playing) |
| **Rectangular** (lock screen) | Track + artist + scissors on the right |
| **Inline** (lock screen) | Track line + scissors; row tap → Snip when playing |
| **Small** (home screen) | **Snip** label top-right; prev/play/next below track |

Deep link (enabled only): **`snippet://player/snip`**

1. Widget opens Snippet (briefly).
2. App refreshes player snapshot, then calls `handleModalClip` → `saveTimestamp` at `estimatedPos`.
3. Deep-link handling dedupes the same URL (`getLaunchUrl` + `appUrlOpen`) and debounces Snip (~2.5s) so one widget tap saves one clip.

**Test on iPhone 15 Pro Max (or any iOS 17+ device)**

1. Build & run **App** scheme; log in and play a track (foreground a few seconds so widget data syncs).
2. Add the lock screen widget (inline / circular / rectangular) and/or home small widget.
3. With music **playing**, tap **Snip** (scissors should look active). Pause Spotify — scissors should grey out and not open Snip.
4. Unlock → Snippet should flash open; confirm the clip appears on the track (home card or player modal).

**Snip limitations**

- Requires Snippet to open (WidgetKit cannot call your API in-process).
- User must be logged in; `playerState` and token must be available when the app handles the URL.
- Position uses `estimatedPos` after `refreshPlayerSnapshot` — accurate when App Remote / Web API polling is active; may be slightly stale if the app was suspended a long time.
- Does not require opening the full player screen; navigation is unchanged unless you use a player deep link.
- Max snippets per track still applies (`MAX_SNIPPETS_PER_TRACK`).
- Snippets are mirrored to `localStorage` (`snippet_all_timestamps_v1`) on device and merged with `/api/timestamps` on login so they survive app restarts even if the API fetch is slow or empty.

## Deep links

| URL | Behavior |
|-----|----------|
| `snippet://player` | Open app / player |
| `snippet://player/{trackId}` | Open player for track |
| `snippet://player/snip` | Save clip at current position (widget Snip) |
| `snippet://player/toggle` | Play / pause (home widget links; requires app foreground) |
| `snippet://player/next` | Skip next |
| `snippet://player/prev` | Skip previous |

**Limitations:** The widget extension cannot call Spotify APIs or refresh tokens. It only displays the last snapshot written by the main app. Lock screen accessory widgets cannot run Snip in the background—tap opens the app via `snippet://player/snip`. Control `Link`s on the small home widget open the app via deep link; playback runs in the WebView layer.

## Data flow

`useSpotifyPlayerSnapshot` → `syncWidgetNowPlaying()` → `WidgetBridgePlugin.syncNowPlaying` (native) → App Group + `WidgetCenter.reloadTimelines` + `NowPlayingManager.update` (MPNowPlayingInfoCenter).
