import WidgetKit
import SwiftUI

struct NowPlayingEntry: TimelineEntry {
    let date: Date
    let snapshot: WidgetNowPlayingStore.Snapshot
}

struct NowPlayingProvider: TimelineProvider {
    func placeholder(in context: Context) -> NowPlayingEntry {
        NowPlayingEntry(date: Date(), snapshot: .empty)
    }

    func getSnapshot(in context: Context, completion: @escaping (NowPlayingEntry) -> Void) {
        completion(NowPlayingEntry(date: Date(), snapshot: WidgetNowPlayingStore.displaySnapshot()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<NowPlayingEntry>) -> Void) {
        let snapshot = WidgetNowPlayingStore.displaySnapshot()
        let entry = NowPlayingEntry(date: Date(), snapshot: snapshot)
        // Widget cannot refresh Spotify on its own; reload when the app writes + periodic stale check.
        let next = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date().addingTimeInterval(900)
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

struct SnippetNowPlayingWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: NowPlayingEntry

    private var snapshot: WidgetNowPlayingStore.Snapshot { entry.snapshot }

    /// Snip is tappable only while Spotify reports active playback with a track id.
    private var canSnip: Bool {
        guard snapshot.isPlaying else { return false }
        guard let id = snapshot.trackId, !id.isEmpty else { return false }
        return true
    }

    var body: some View {
        Group {
            switch family {
            case .accessoryInline:
                inlineBody
            case .accessoryCircular:
                circularBody
            case .accessoryRectangular:
                rectangularBody
            default:
                smallHomeBody
            }
        }
        .containerBackground(for: .widget) {
            widgetContainerBackground
        }
        .widgetURL(URL(string: widgetTapDeepLink)!)
    }

    @ViewBuilder
    private var widgetContainerBackground: some View {
        switch family {
        case .accessoryInline, .accessoryCircular, .accessoryRectangular:
            AccessoryWidgetBackground()
        default:
            ContainerRelativeShape()
                .fill(.background.secondary)
        }
    }

    private static let snipDeepLink = "snippet://player/snip"

    private var playerDeepLink: String {
        if let id = snapshot.trackId, !id.isEmpty {
            return "snippet://player/\(id)"
        }
        return "snippet://player"
    }

    /// Whole-widget tap target. Snip deep link only for inline (no separate Snip control).
    private var widgetTapDeepLink: String {
        switch family {
        case .accessoryInline:
            return canSnip ? Self.snipDeepLink : playerDeepLink
        default:
            return playerDeepLink
        }
    }

    private var inlineBody: some View {
        Label {
            Text("\(snapshot.trackName) — \(snapshot.artistName)")
                .lineLimit(1)
        } icon: {
            Image(systemName: "scissors")
                .foregroundStyle(canSnip ? .primary : .tertiary)
        }
    }

    private var circularBody: some View {
        snipButton(compact: true, circularOnly: true)
    }

    private var rectangularBody: some View {
        HStack(spacing: 6) {
            Image(systemName: snapshot.isPlaying ? "waveform" : "music.note")
                .font(.caption)
            VStack(alignment: .leading, spacing: 2) {
                Text(snapshot.trackName)
                    .font(.headline)
                    .lineLimit(1)
                Text(snapshot.artistName)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
            Spacer(minLength: 0)
            snipButton(compact: true, circularOnly: false)
        }
    }

    private var smallHomeBody: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "music.note.list")
                    .foregroundStyle(.secondary)
                Spacer()
                snipButton(compact: false, circularOnly: false)
            }
            Spacer()
            Text(snapshot.trackName)
                .font(.headline)
                .lineLimit(2)
            Text(snapshot.artistName)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .lineLimit(1)
            HStack(spacing: 12) {
                Link(destination: URL(string: "snippet://player/prev")!) {
                    Image(systemName: "backward.fill")
                }
                Link(destination: URL(string: "snippet://player/toggle")!) {
                    Image(systemName: snapshot.isPlaying ? "pause.fill" : "play.fill")
                }
                Link(destination: URL(string: "snippet://player/next")!) {
                    Image(systemName: "forward.fill")
                }
            }
            .font(.caption)
        }
        .padding()
    }

    @ViewBuilder
    private func snipButton(compact: Bool, circularOnly: Bool) -> some View {
        if canSnip {
            Link(destination: URL(string: Self.snipDeepLink)!) {
                snipButtonLabel(compact: compact, circularOnly: circularOnly, enabled: true)
            }
        } else {
            snipButtonLabel(compact: compact, circularOnly: circularOnly, enabled: false)
        }
    }

    @ViewBuilder
    private func snipButtonLabel(compact: Bool, circularOnly: Bool, enabled: Bool) -> some View {
        Group {
            if circularOnly {
                Image(systemName: "scissors")
                    .font(.title2)
            } else if compact {
                Image(systemName: "scissors")
                    .font(.body.weight(.semibold))
            } else {
                Label("Snip", systemImage: "scissors")
                    .font(.caption.weight(.semibold))
            }
        }
        .foregroundStyle(enabled ? .primary : .tertiary)
    }
}

struct SnippetNowPlayingWidget: Widget {
    let kind = "SnippetNowPlayingWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: NowPlayingProvider()) { entry in
            SnippetNowPlayingWidgetView(entry: entry)
        }
        .configurationDisplayName("Snippet")
        .description("Now playing from Snippet For Spotify.")
        .supportedFamilies([
            .systemSmall,
            .accessoryRectangular,
            .accessoryCircular,
            .accessoryInline,
        ])
    }
}
