import Foundation
import Capacitor
import WidgetKit

@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridgePlugin"
    public let jsName = "WidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "syncNowPlaying", returnType: CAPPluginReturnPromise),
    ]

    @objc func syncNowPlaying(_ call: CAPPluginCall) {
        let trackName = call.getString("trackName")?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let artistName = call.getString("artistName")?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        guard !trackName.isEmpty else {
            call.reject("Missing trackName")
            return
        }

        let snapshot = WidgetNowPlayingStore.Snapshot(
            trackId: call.getString("trackId"),
            trackName: trackName,
            artistName: artistName.isEmpty ? "Unknown artist" : artistName,
            albumArtUrl: call.getString("albumArtUrl"),
            isPlaying: call.getBool("isPlaying") ?? false,
            positionMs: call.getInt("positionMs") ?? 0,
            updatedAt: Date().timeIntervalSince1970
        )
        guard WidgetNowPlayingStore.save(snapshot) else {
            call.reject(
                "App Group unavailable. Enable \(WidgetNowPlayingStore.appGroupId) on App and SnippetWidgetExtension targets."
            )
            return
        }

        NowPlayingManager.update(from: snapshot)

        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadTimelines(ofKind: "SnippetNowPlayingWidget")
        }
        call.resolve()
    }
}
