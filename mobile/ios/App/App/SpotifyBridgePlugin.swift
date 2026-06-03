import Foundation
import UIKit
import Capacitor
import SpotifyiOS

@objc(SpotifyBridgePlugin)
public class SpotifyBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SpotifyBridgePlugin"
    public let jsName = "SpotifyBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "connectAndPlay", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "connect", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "authorize", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "seek", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pause", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "resume", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkSpotifyInstalled", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openSpotifyExternal", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getPlayerState", returnType: CAPPluginReturnPromise),
    ]

    private let clientID = "9aaba07c6ffa4342a33ef523e47e1229"
    private let redirectURI = URL(string: "snippet://callback")!

    private var appRemote: SPTAppRemote?
    private var pendingCall: CAPPluginCall?
    private var pendingURI: String?
    private var pendingPositionMs: Int = 0
    /// True while `authorize` / login `connect` waits for Spotify app → snippet://callback.
    private var pendingAuthIsLogin = false
    /// `authorizeAndPlayURI` already started playback — reconnect should seek only, not play again.
    private var pendingAuthorizeAndPlay = false
    private var connectPlayTimeoutWorkItem: DispatchWorkItem?
    private let connectPlayTimeoutSeconds: TimeInterval = 10

    public override func load() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleSpotifyCallback(_:)),
            name: NSNotification.Name("SpotifyCallbackURL"),
            object: nil
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(appWillResignActive),
            name: UIApplication.willResignActiveNotification,
            object: nil
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(appDidBecomeActive),
            name: UIApplication.didBecomeActiveNotification,
            object: nil
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleNowPlayingRemoteCommand(_:)),
            name: .snippetNowPlayingRemoteCommand,
            object: nil
        )
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    // MARK: - App lifecycle (Spotify iOS guidance: disconnect inactive, reconnect active)

    @objc private func appWillResignActive() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            // Do not tear down while connect/play/auth is in flight (e.g. authorizeAndPlayURI opens Spotify).
            if self.pendingCall != nil { return }
            guard let remote = self.appRemote, remote.isConnected else { return }
            remote.disconnect()
        }
    }

    @objc private func appDidBecomeActive() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self, let remote = self.appRemote else { return }
            if remote.connectionParameters.accessToken != nil && !remote.isConnected {
                remote.connect()
            }
        }
    }

    @objc private func handleNowPlayingRemoteCommand(_ notification: Notification) {
        DispatchQueue.main.async { [weak self] in
            self?.handleNowPlayingRemoteCommandOnMain(notification)
        }
    }

    private func handleNowPlayingRemoteCommandOnMain(_ notification: Notification) {
        guard let action = notification.userInfo?["action"] as? String else { return }
        guard let playerAPI = appRemote?.playerAPI, appRemote?.isConnected == true else { return }

        switch action {
        case "play":
            playerAPI.resume { _, _ in }
        case "pause":
            playerAPI.pause { _, _ in }
        case "toggle":
            playerAPI.getPlayerState { result, _ in
                guard let state = result as? SPTAppRemotePlayerState else { return }
                if state.isPaused {
                    playerAPI.resume { _, _ in }
                } else {
                    playerAPI.pause { _, _ in }
                }
            }
        case "next":
            playerAPI.skip(toNext: { _, _ in })
        case "previous":
            playerAPI.skip(toPrevious: { _, _ in })
        default:
            break
        }
    }

    // MARK: - Plugin Methods

    @objc func connectAndPlay(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            self?.connectAndPlayOnMain(call)
        }
    }

    private func connectAndPlayOnMain(_ call: CAPPluginCall) {
        guard let rawUri = call.getString("uri"), !rawUri.isEmpty else {
            call.reject("Missing uri")
            return
        }
        let uri = Self.normalizeSpotifyUri(rawUri) ?? rawUri
        let positionMs = call.getInt("positionMs") ?? 0

        pendingCall = call
        pendingURI = uri
        pendingPositionMs = positionMs

        if appRemote == nil { appRemote = makeAppRemote() }

        guard let remote = appRemote else {
            call.reject("Spotify App Remote unavailable")
            pendingCall = nil
            return
        }

        if remote.isConnected {
            playAfterConnect()
        } else if remote.connectionParameters.accessToken != nil {
            // Spotify app already authorized App Remote — reconnect silently, then play in-app.
            pendingAuthIsLogin = false
            pendingAuthorizeAndPlay = false
            scheduleConnectPlayTimeout()
            remote.connect()
        } else {
            // No App Remote session: open the track in the Spotify app (no auth UI).
            pendingAuthIsLogin = false
            pendingAuthorizeAndPlay = false
            if openSpotifyInExternalApp(uri: uri, positionMs: positionMs) {
                call.resolve(["openedExternal": true])
            } else {
                call.reject("SPOTIFY_NOT_INSTALLED")
            }
            clearPendingPlayback()
        }
    }

    /// Opens the Spotify app for login (App Remote). Resolves with Web API access_token on callback.
    @objc func authorize(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            self?.authorizeOnMain(call)
        }
    }

    /// Reconnect App Remote when Spotify already issued a token (no login UI).
    @objc func connect(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            self?.silentConnectOnMain(call)
        }
    }

    private func silentConnectOnMain(_ call: CAPPluginCall) {
        if appRemote == nil { appRemote = makeAppRemote() }
        guard let remote = appRemote else {
            call.reject("Spotify App Remote unavailable")
            return
        }
        if remote.isConnected {
            call.resolve(["connected": true])
            return
        }
        if remote.connectionParameters.accessToken == nil {
            call.resolve(["connected": false])
            return
        }
        pendingCall = call
        pendingAuthIsLogin = false
        pendingURI = nil
        remote.connect()
    }

    private func authorizeOnMain(_ call: CAPPluginCall) {
        pendingCall = call
        pendingURI = nil
        pendingAuthIsLogin = true
        if appRemote == nil { appRemote = makeAppRemote() }
        guard appRemote != nil else {
            pendingAuthIsLogin = false
            pendingCall = nil
            call.reject("Spotify App Remote unavailable")
            return
        }
        appRemote?.authorizeAndPlayURI("")
    }

    @objc func seek(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            self?.seekOnMain(call)
        }
    }

    private func seekOnMain(_ call: CAPPluginCall) {
        guard let playerAPI = appRemote?.playerAPI else {
            call.reject("Not connected to Spotify")
            return
        }
        let positionMs = call.getInt("positionMs") ?? 0
        playerAPI.seek(toPosition: positionMs) { _, error in
            if let error = error { call.reject(error.localizedDescription) }
            else { call.resolve() }
        }
    }

    @objc func pause(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            self?.appRemote?.playerAPI?.pause { _, error in
                error != nil ? call.reject(error!.localizedDescription) : call.resolve()
            }
        }
    }

    @objc func resume(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            self?.appRemote?.playerAPI?.resume { _, error in
                error != nil ? call.reject(error!.localizedDescription) : call.resolve()
            }
        }
    }

    @objc func checkSpotifyInstalled(_ call: CAPPluginCall) {
        let spotifyURL = URL(string: "spotify://")!
        let isInstalled = UIApplication.shared.canOpenURL(spotifyURL)
        call.resolve(["installed": isInstalled])
    }

    /// Opens the Spotify app (or Safari) outside the Capacitor WebView — never the in-app browser.
    @objc func getPlayerState(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            self?.getPlayerStateOnMain(call)
        }
    }

    private func getPlayerStateOnMain(_ call: CAPPluginCall) {
        guard let remote = appRemote, remote.isConnected, let playerAPI = remote.playerAPI else {
            call.resolve(["connected": false])
            return
        }
        playerAPI.getPlayerState { result, error in
            if let error = error {
                call.reject(error.localizedDescription)
                return
            }
            guard let state = result as? SPTAppRemotePlayerState else {
                call.resolve(["connected": true, "positionMs": 0, "isPlaying": false])
                return
            }
            call.resolve(Self.playerStatePayload(from: state))
        }
    }

    private static func trackId(from uri: String) -> String? {
        let pattern = #"^spotify:track:([a-zA-Z0-9]+)"#
        guard let range = uri.range(of: pattern, options: .regularExpression) else { return nil }
        let match = String(uri[range])
        return match.split(separator: ":").last.map(String.init)
    }

    private static func artistName(from track: any SPTAppRemoteTrack) -> String {
        guard let artist = track.artist as? any SPTAppRemoteArtist else { return "" }
        return artist.name
    }

    private static func playerStatePayload(from state: SPTAppRemotePlayerState) -> [String: Any] {
        var payload: [String: Any] = [
            "connected": true,
            "positionMs": state.playbackPosition,
            "isPlaying": !state.isPaused,
        ]
        let item = state.track
        let uri = item.uri
        guard !uri.isEmpty else { return payload }
        var trackPayload: [String: Any] = [
            "uri": uri,
            "name": item.name,
            "artists": artistName(from: item),
            "durationMs": Int(item.duration),
            "albumArt": NSNull(),
        ]
        if let id = trackId(from: uri) {
            trackPayload["id"] = id
        }
        payload["track"] = trackPayload
        return payload
    }

    @objc func openSpotifyExternal(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            guard let uri = call.getString("uri"), !uri.isEmpty else {
                call.reject("Missing uri")
                return
            }
            let positionMs = call.getInt("positionMs") ?? 0
            if self.openSpotifyInExternalApp(uri: uri, positionMs: positionMs) {
                call.resolve(["opened": true])
            } else {
                call.reject("Could not open Spotify")
            }
        }
    }

    // MARK: - URL Callback (from AppDelegate)

    @objc func handleSpotifyCallback(_ notification: Notification) {
        DispatchQueue.main.async { [weak self] in
            self?.handleSpotifyCallbackOnMain(notification)
        }
    }

    private func handleSpotifyCallbackOnMain(_ notification: Notification) {
        guard let url = notification.object as? URL else { return }
        if appRemote == nil { appRemote = makeAppRemote() }
        let parameters = appRemote?.authorizationParameters(from: url)
        if let token = parameters?[SPTAppRemoteAccessTokenKey] {
            appRemote?.connectionParameters.accessToken = token
            if pendingAuthIsLogin, let call = pendingCall {
                call.resolve([
                    "access_token": token,
                    "expires_in": 3600,
                    "source": "spotify_app",
                ])
                pendingCall = nil
                pendingAuthIsLogin = false
            }
            appRemote?.connect()
        } else if let errorDesc = parameters?[SPTAppRemoteErrorDescriptionKey] {
            if let uri = pendingURI, !uri.isEmpty, openSpotifyInExternalApp(uri: uri, positionMs: pendingPositionMs) {
                pendingCall?.reject("SPOTIFY_FALLBACK_OPENED")
            } else {
                pendingCall?.reject(errorDesc)
            }
            pendingCall = nil
            pendingAuthIsLogin = false
        }
    }

    // MARK: - Private

    private func makeAppRemote() -> SPTAppRemote {
        let config = SPTConfiguration(clientID: clientID, redirectURL: redirectURI)
        let remote = SPTAppRemote(configuration: config, logLevel: .none)
        remote.delegate = self
        return remote
    }

    /// Accepts spotify:type:id or https://open.spotify.com/type/id.
    private static func normalizeSpotifyUri(_ input: String) -> String? {
        let trimmed = input.trimmingCharacters(in: .whitespacesAndNewlines)
        if let range = trimmed.range(of: #"^spotify:(track|episode|album|playlist):([a-zA-Z0-9]+)"#, options: .regularExpression) {
            let match = String(trimmed[range])
            let parts = match.split(separator: ":").map(String.init)
            guard parts.count >= 3 else { return nil }
            return "spotify:\(parts[1].lowercased()):\(parts[2])"
        }
        if let range = trimmed.range(of: #"open\.spotify\.com/(track|episode|album|playlist)/([a-zA-Z0-9]+)"#, options: .regularExpression) {
            let fragment = String(trimmed[range])
            let segments = fragment.split(separator: "/").map(String.init)
            guard segments.count >= 3 else { return nil }
            return "spotify:\(segments[1].lowercased()):\(segments[2])"
        }
        return nil
    }

    /// spotify://track/ID — opens the native Spotify app (not the Capacitor in-app browser).
    private static func makeSpotifyAppURL(uri: String) -> URL? {
        let normalized = normalizeSpotifyUri(uri) ?? uri
        let parts = normalized.split(separator: ":").map(String.init)
        guard parts.count >= 3, parts[0].lowercased() == "spotify" else { return nil }
        let kind = parts[1].lowercased()
        let rawId = parts[2]
        let id = rawId.split(separator: "?").first.map(String.init) ?? ""
        guard !id.isEmpty else { return nil }
        switch kind {
        case "track", "episode", "album", "playlist":
            return URL(string: "spotify://\(kind)/\(id)")
        default:
            return nil
        }
    }

    /// HTTPS fallback when the Spotify app is not installed (opens in Safari, not the WebView).
    private static func makeOpenSpotifyWebURL(uri: String, positionMs: Int) -> URL? {
        let normalized = normalizeSpotifyUri(uri) ?? uri
        let parts = normalized.split(separator: ":").map(String.init)
        guard parts.count >= 3, parts[0].lowercased() == "spotify" else { return nil }
        let kind = parts[1].lowercased()
        let rawId = parts[2]
        let id = rawId.split(separator: "?").first.map(String.init) ?? ""
        guard !id.isEmpty else { return nil }
        let path: String
        switch kind {
        case "track": path = "track/\(id)"
        case "episode": path = "episode/\(id)"
        case "album": path = "album/\(id)"
        case "playlist": path = "playlist/\(id)"
        default: return nil
        }
        var c = URLComponents(string: "https://open.spotify.com/\(path)")
        let sec = max(0, positionMs / 1000)
        if sec > 0 {
            c?.queryItems = [URLQueryItem(name: "t", value: String(sec))]
        }
        return c?.url
    }

    /// Opens Spotify via universal link (native app when installed) or spotify:// fallback.
    @discardableResult
    private func openSpotifyInExternalApp(uri: String, positionMs: Int) -> Bool {
        let normalized = Self.normalizeSpotifyUri(uri) ?? uri
        // Prefer https://open.spotify.com — iOS hands off to the Spotify app without in-app browser.
        if let webURL = Self.makeOpenSpotifyWebURL(uri: normalized, positionMs: positionMs) {
            UIApplication.shared.open(webURL, options: [:], completionHandler: nil)
            return true
        }
        if let appURL = Self.makeSpotifyAppURL(uri: normalized) {
            UIApplication.shared.open(appURL, options: [:], completionHandler: nil)
            return true
        }
        return false
    }

    private func scheduleConnectPlayTimeout() {
        cancelConnectPlayTimeout()
        let work = DispatchWorkItem { [weak self] in
            guard let self = self, let call = self.pendingCall else { return }
            let uri = self.pendingURI ?? ""
            let posMs = self.pendingPositionMs
            self.pendingAuthorizeAndPlay = false
            if !uri.isEmpty, self.openSpotifyInExternalApp(uri: uri, positionMs: posMs) {
                call.resolve(["openedExternal": true, "reason": "connectTimeout"])
            } else {
                call.reject("PLAYBACK_TIMEOUT")
            }
            self.clearPendingPlayback()
        }
        connectPlayTimeoutWorkItem = work
        DispatchQueue.main.asyncAfter(deadline: .now() + connectPlayTimeoutSeconds, execute: work)
    }

    private func cancelConnectPlayTimeout() {
        connectPlayTimeoutWorkItem?.cancel()
        connectPlayTimeoutWorkItem = nil
    }

    private func clearPendingPlayback() {
        cancelConnectPlayTimeout()
        pendingCall = nil
        pendingURI = nil
        pendingPositionMs = 0
    }

    private func playAfterConnect() {
        cancelConnectPlayTimeout()
        guard let uri = pendingURI, !uri.isEmpty else {
            if !pendingAuthIsLogin {
                pendingCall?.resolve()
                clearPendingPlayback()
            }
            return
        }
        let posMs = pendingPositionMs
        if pendingAuthorizeAndPlay {
            pendingAuthorizeAndPlay = false
            finishConnectAndPlayAfterPlaybackStarted(positionMs: posMs)
            return
        }
        appRemote?.playerAPI?.play(uri, asRadio: false) { [weak self] _, error in
            guard let self = self else { return }
            if let error = error {
                if self.openSpotifyInExternalApp(uri: uri, positionMs: posMs) {
                    self.pendingCall?.reject("SPOTIFY_FALLBACK_OPENED")
                } else {
                    self.pendingCall?.reject(error.localizedDescription)
                }
                self.clearPendingPlayback()
                return
            }
            self.finishConnectAndPlayAfterPlaybackStarted(positionMs: posMs)
        }
    }

    /// Playback is already running; optional seek. Never reject after a successful play start.
    private func finishConnectAndPlayAfterPlaybackStarted(positionMs posMs: Int) {
        if posMs <= 0 {
            pendingCall?.resolve()
            clearPendingPlayback()
            return
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.85) { [weak self] in
            guard let self = self else { return }
            self.appRemote?.playerAPI?.seek(toPosition: posMs) { _, seekError in
                if seekError != nil {
                    NSLog("[SpotifyBridge] seek after play failed: \(seekError!.localizedDescription)")
                }
                self.pendingCall?.resolve(["seekApplied": seekError == nil])
                self.clearPendingPlayback()
            }
        }
    }
}

// MARK: - SPTAppRemoteDelegate

extension SpotifyBridgePlugin: SPTAppRemoteDelegate {
    public func appRemoteDidEstablishConnection(_ appRemote: SPTAppRemote) {
        appRemote.playerAPI?.subscribe(toPlayerState: { _, _ in })
        if let uri = pendingURI, !uri.isEmpty {
            playAfterConnect()
        } else if let call = pendingCall {
            call.resolve(["connected": true])
            pendingCall = nil
        }
    }

    public func appRemote(_ appRemote: SPTAppRemote, didDisconnectWithError error: Error?) {}

    public func appRemote(_ appRemote: SPTAppRemote, didFailConnectionAttemptWithError error: Error?) {
        cancelConnectPlayTimeout()
        pendingAuthorizeAndPlay = false
        guard let error = error as NSError? else {
            pendingCall?.reject("Connection failed")
            clearPendingPlayback()
            return
        }
        // SPTAppRemoteCommon.h (current spotify/ios-sdk). Legacy cases spotifyNotActiveError / notAuthorizedError were removed.
        let bgWakeupFailed = -1000
        let connectionAttemptFailed = -1001
        let connectionTerminated = -1002

        if error.domain == SPTAppRemoteErrorDomain {
            switch error.code {
            case bgWakeupFailed, connectionAttemptFailed, connectionTerminated:
                if let uri = pendingURI, openSpotifyInExternalApp(uri: uri, positionMs: pendingPositionMs) {
                    pendingCall?.reject("SPOTIFY_FALLBACK_OPENED")
                } else {
                    pendingCall?.reject("SPOTIFY_NOT_INSTALLED")
                }
            default:
                let lower = error.localizedDescription.lowercased()
                if lower.contains("premium") || lower.contains("not authorized") || lower.contains("403") {
                    pendingCall?.reject("SPOTIFY_NOT_PREMIUM")
                } else {
                    if let uri = pendingURI, openSpotifyInExternalApp(uri: uri, positionMs: pendingPositionMs) {
                        pendingCall?.reject("SPOTIFY_FALLBACK_OPENED")
                    } else {
                        pendingCall?.reject(error.localizedDescription)
                    }
                }
            }
        } else {
            if let uri = pendingURI, openSpotifyInExternalApp(uri: uri, positionMs: pendingPositionMs) {
                pendingCall?.reject("SPOTIFY_FALLBACK_OPENED")
            } else {
                pendingCall?.reject(error.localizedDescription)
            }
        }
        clearPendingPlayback()
    }
}
