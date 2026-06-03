import Foundation
import MediaPlayer
import UIKit

/// System lock-screen / Control Center Now Playing (MPNowPlayingInfoCenter).
/// Distinct from WidgetKit: appears automatically while playback is active when metadata is set.
enum NowPlayingManager {
    private static var remoteCommandsConfigured = false
    private static var artworkTask: URLSessionDataTask?

    static func configureRemoteCommandsIfNeeded() {
        guard !remoteCommandsConfigured else { return }
        remoteCommandsConfigured = true

        let center = MPRemoteCommandCenter.shared()
        center.playCommand.addTarget { _ in
            postRemoteCommand("play")
            return .success
        }
        center.pauseCommand.addTarget { _ in
            postRemoteCommand("pause")
            return .success
        }
        center.togglePlayPauseCommand.addTarget { _ in
            postRemoteCommand("toggle")
            return .success
        }
        center.nextTrackCommand.addTarget { _ in
            postRemoteCommand("next")
            return .success
        }
        center.previousTrackCommand.addTarget { _ in
            postRemoteCommand("previous")
            return .success
        }
        center.playCommand.isEnabled = true
        center.pauseCommand.isEnabled = true
        center.togglePlayPauseCommand.isEnabled = true
        center.nextTrackCommand.isEnabled = true
        center.previousTrackCommand.isEnabled = true
    }

    static func update(from snapshot: WidgetNowPlayingStore.Snapshot) {
        configureRemoteCommandsIfNeeded()

        let elapsed = Double(max(0, snapshot.positionMs)) / 1000.0
        var info: [String: Any] = [
            MPMediaItemPropertyTitle: snapshot.trackName,
            MPMediaItemPropertyArtist: snapshot.artistName,
            MPNowPlayingInfoPropertyPlaybackRate: snapshot.isPlaying ? 1.0 : 0.0,
            MPNowPlayingInfoPropertyElapsedPlaybackTime: elapsed,
            MPNowPlayingInfoPropertyMediaType: MPNowPlayingInfoMediaType.audio.rawValue,
        ]
        MPNowPlayingInfoCenter.default().nowPlayingInfo = info

        guard let urlString = snapshot.albumArtUrl?.trimmingCharacters(in: .whitespacesAndNewlines),
              !urlString.isEmpty,
              let url = URL(string: urlString) else { return }

        artworkTask?.cancel()
        artworkTask = URLSession.shared.dataTask(with: url) { data, _, _ in
            guard let data, let image = UIImage(data: data) else { return }
            DispatchQueue.main.async {
                var merged = MPNowPlayingInfoCenter.default().nowPlayingInfo ?? info
                merged[MPMediaItemPropertyArtwork] = MPMediaItemArtwork(boundsSize: image.size) { _ in image }
                MPNowPlayingInfoCenter.default().nowPlayingInfo = merged
            }
        }
        artworkTask?.resume()
    }

    static func clear() {
        artworkTask?.cancel()
        artworkTask = nil
        MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
    }

    private static func postRemoteCommand(_ action: String) {
        NotificationCenter.default.post(
            name: .snippetNowPlayingRemoteCommand,
            object: nil,
            userInfo: ["action": action]
        )
    }
}

extension Notification.Name {
    static let snippetNowPlayingRemoteCommand = Notification.Name("SnippetNowPlayingRemoteCommand")
}
