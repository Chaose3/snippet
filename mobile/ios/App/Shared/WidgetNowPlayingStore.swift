import Foundation

/// Shared now-playing snapshot for the Snippet WidgetKit extension (App Group).
enum WidgetNowPlayingStore {
    static let appGroupId = "group.com.snippet1.app"
    private static let storageKey = "snippet.nowPlaying.v1"

    struct Snapshot: Codable, Equatable {
        var trackId: String?
        var trackName: String
        var artistName: String
        var albumArtUrl: String?
        var isPlaying: Bool
        var positionMs: Int
        var updatedAt: TimeInterval

        static let empty = Snapshot(
            trackId: nil,
            trackName: "Not playing",
            artistName: "Open Snippet",
            albumArtUrl: nil,
            isPlaying: false,
            positionMs: 0,
            updatedAt: 0
        )
    }

    /// False when the App Group is missing from signing (widget will show placeholder text only).
    static var isAppGroupAvailable: Bool {
        UserDefaults(suiteName: appGroupId) != nil
    }

    private static var defaults: UserDefaults? {
        UserDefaults(suiteName: appGroupId)
    }

    static func load() -> Snapshot? {
        guard let data = defaults?.data(forKey: storageKey) else { return nil }
        return try? JSONDecoder().decode(Snapshot.self, from: data)
    }

    @discardableResult
    static func save(_ snapshot: Snapshot) -> Bool {
        guard let defaults else { return false }
        guard let data = try? JSONEncoder().encode(snapshot) else { return false }
        defaults.set(data, forKey: storageKey)
        return true
    }

    static func displaySnapshot() -> Snapshot {
        load() ?? .empty
    }
}
