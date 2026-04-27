import Foundation
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
    }

    // MARK: - Plugin Methods

    @objc func connectAndPlay(_ call: CAPPluginCall) {
        guard let uri = call.getString("uri"), !uri.isEmpty else {
            call.reject("Missing uri")
            return
        }
        let positionMs = call.getInt("positionMs") ?? 0

        pendingCall = call
        pendingURI = uri
        pendingPositionMs = positionMs

        if appRemote == nil { appRemote = makeAppRemote() }

        if appRemote!.isConnected {
            playAfterConnect()
        } else {
            appRemote!.authorizeAndPlayURI(uri)
        }
    }

    @objc func connect(_ call: CAPPluginCall) {
        pendingCall = call
        pendingURI = nil
        if appRemote == nil { appRemote = makeAppRemote() }
        appRemote!.authorizeAndPlayURI("")
    }

    @objc func seek(_ call: CAPPluginCall) {
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
        appRemote?.playerAPI?.pause { _, error in
            error != nil ? call.reject(error!.localizedDescription) : call.resolve()
        }
    }

    @objc func resume(_ call: CAPPluginCall) {
        appRemote?.playerAPI?.resume { _, error in
            error != nil ? call.reject(error!.localizedDescription) : call.resolve()
        }
    }

    @objc func checkSpotifyInstalled(_ call: CAPPluginCall) {
        let spotifyURL = URL(string: "spotify://")!
        let isInstalled = UIApplication.shared.canOpenURL(spotifyURL)
        call.resolve(["installed": isInstalled])
    }

    // MARK: - URL Callback (from AppDelegate)

    @objc func handleSpotifyCallback(_ notification: Notification) {
        guard let url = notification.object as? URL else { return }
        let parameters = appRemote?.authorizationParameters(from: url)
        if let token = parameters?[SPTAppRemoteAccessTokenKey] {
            appRemote?.connectionParameters.accessToken = token
            appRemote?.connect()
        } else if let errorDesc = parameters?[SPTAppRemoteErrorDescriptionKey] {
            pendingCall?.reject(errorDesc)
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

    private func playAfterConnect() {
        guard let uri = pendingURI, !uri.isEmpty else {
            pendingCall?.resolve()
            pendingCall = nil
            return
        }
        let posMs = pendingPositionMs
        appRemote?.playerAPI?.play(uri, callback: { [weak self] _, error in
            guard let self = self else { return }
            if let error = error {
                self.pendingCall?.reject(error.localizedDescription)
                self.pendingCall = nil
                return
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
                self.appRemote?.playerAPI?.seek(toPosition: posMs) { _, _ in
                    self.pendingCall?.resolve()
                    self.pendingCall = nil
                }
            }
        })
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
        if error.code == SPTAppRemoteErrorCode.spotifyNotActiveError.rawValue {
            pendingCall?.reject("SPOTIFY_NOT_INSTALLED")
        } else if error.code == SPTAppRemoteErrorCode.notAuthorizedError.rawValue {
            pendingCall?.reject("SPOTIFY_NOT_PREMIUM")
        } else {
            pendingCall?.reject(error.localizedDescription)
        }
        pendingCall = nil
    }
}
