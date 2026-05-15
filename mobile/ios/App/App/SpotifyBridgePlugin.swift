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
        CAPPluginMethod(name: "seek", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pause", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "resume", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkSpotifyInstalled", returnType: CAPPluginReturnPromise),
    ]

    private let clientID = "9aaba07c6ffa4342a33ef523e47e1229"
    private let redirectURI = URL(string: "snippet://callback")!

    private var appRemote: SPTAppRemote?
    private var pendingCall: CAPPluginCall?
    private var pendingURI: String?
    private var pendingPositionMs: Int = 0

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
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    // MARK: - App lifecycle (Spotify iOS guidance: disconnect inactive, reconnect active)

    @objc private func appWillResignActive() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self, let remote = self.appRemote, remote.isConnected else { return }
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

    // MARK: - Plugin Methods

    @objc func connectAndPlay(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            self?.connectAndPlayOnMain(call)
        }
    }

    private func connectAndPlayOnMain(_ call: CAPPluginCall) {
        guard let uri = call.getString("uri"), !uri.isEmpty else {
            call.reject("Missing uri")
            return
        }
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
        } else {
            remote.authorizeAndPlayURI(uri)
        }
    }

    @objc func connect(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.pendingCall = call
            self.pendingURI = nil
            if self.appRemote == nil { self.appRemote = self.makeAppRemote() }
            self.appRemote?.authorizeAndPlayURI("")
        }
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

    // MARK: - URL Callback (from AppDelegate)

    @objc func handleSpotifyCallback(_ notification: Notification) {
        DispatchQueue.main.async { [weak self] in
            self?.handleSpotifyCallbackOnMain(notification)
        }
    }

    private func handleSpotifyCallbackOnMain(_ notification: Notification) {
        guard let url = notification.object as? URL else { return }
        let parameters = appRemote?.authorizationParameters(from: url)
        if let token = parameters?[SPTAppRemoteAccessTokenKey] {
            appRemote?.connectionParameters.accessToken = token
            appRemote?.connect()
        } else if let errorDesc = parameters?[SPTAppRemoteErrorDescriptionKey] {
            if let uri = pendingURI, !uri.isEmpty, openSpotifyInExternalApp(uri: uri, positionMs: pendingPositionMs) {
                pendingCall?.reject("SPOTIFY_FALLBACK_OPENED")
            } else {
                pendingCall?.reject(errorDesc)
            }
            pendingCall = nil
        }
    }

    // MARK: - Private

    private func makeAppRemote() -> SPTAppRemote {
        let config = SPTConfiguration(clientID: clientID, redirectURL: redirectURI)
        let remote = SPTAppRemote(configuration: config, logLevel: .none)
        remote.delegate = self
        return remote
    }

    /// Universal link or HTTPS URL that opens the Spotify app when installed, otherwise Safari.
    private static func makeOpenSpotifyWebURL(uri: String, positionMs: Int) -> URL? {
        let parts = uri.split(separator: ":").map(String.init)
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

    /// Opens Spotify (app via universal link when possible) or Spotify in the browser.
    @discardableResult
    private func openSpotifyInExternalApp(uri: String, positionMs: Int) -> Bool {
        guard let url = Self.makeOpenSpotifyWebURL(uri: uri, positionMs: positionMs) else { return false }
        UIApplication.shared.open(url, options: [:], completionHandler: nil)
        return true
    }

    private func playAfterConnect() {
        guard let uri = pendingURI, !uri.isEmpty else {
            pendingCall?.resolve()
            pendingCall = nil
            return
        }
        let posMs = pendingPositionMs
        appRemote?.playerAPI?.play(uri, asRadio: false) { [weak self] _, error in
            guard let self = self else { return }
            if let error = error {
                if self.openSpotifyInExternalApp(uri: uri, positionMs: posMs) {
                    self.pendingCall?.reject("SPOTIFY_FALLBACK_OPENED")
                } else {
                    self.pendingCall?.reject(error.localizedDescription)
                }
                self.pendingCall = nil
                return
            }
            if posMs <= 0 {
                self.pendingCall?.resolve()
                self.pendingCall = nil
                return
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.85) { [weak self] in
                guard let self = self else { return }
                self.appRemote?.playerAPI?.seek(toPosition: posMs) { _, seekError in
                    if let seekError = seekError {
                        self.pendingCall?.reject(seekError.localizedDescription)
                    } else {
                        self.pendingCall?.resolve()
                    }
                    self.pendingCall = nil
                }
            }
        }
    }
}

// MARK: - SPTAppRemoteDelegate

extension SpotifyBridgePlugin: SPTAppRemoteDelegate {
    public func appRemoteDidEstablishConnection(_ appRemote: SPTAppRemote) {
        playAfterConnect()
    }

    public func appRemote(_ appRemote: SPTAppRemote, didDisconnectWithError error: Error?) {}

    public func appRemote(_ appRemote: SPTAppRemote, didFailConnectionAttemptWithError error: Error?) {
        guard let error = error as NSError? else {
            pendingCall?.reject("Connection failed")
            pendingCall = nil
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
        pendingCall = nil
    }
}
