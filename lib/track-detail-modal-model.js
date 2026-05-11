import { describeArcPath } from "./snippet-ui-utils";

/**
 * Pure view-model for TrackDetailModal. Keeps modal UI dumb and memo deps explicit.
 */
export function buildTrackDetailModalModel({
  selectedTrack,
  playerState,
  trackLookup,
  allTimestamps,
  playlistTracks,
  queueTracks,
  fallbackUpcomingTracks,
  previousPlayerTrack,
  selectedSnippetIndexByTrack,
  estimatedPos,
}) {
  if (!selectedTrack) return null;

  const activeModalTrack = playerState
    ? trackLookup[playerState.id] ?? {
        id: playerState.id,
        name: playerState.name,
        uri: playerState.uri,
        artists: playerState.artists,
        albumArt: playerState.albumArt,
        durationMs: playerState.durationMs,
      }
    : selectedTrack;

  const isCurrentTrack = playerState?.id === activeModalTrack.id;
  const tss = allTimestamps[activeModalTrack.id] || [];
  const selectedSnippetIndex = Math.min(
    selectedSnippetIndexByTrack[activeModalTrack.id] ?? 0,
    Math.max(0, tss.length - 1)
  );
  const selectedSnippet = tss[selectedSnippetIndex] ?? null;

  let surroundingPrevious = null;
  let surroundingNext = null;
  for (const tracks of Object.values(playlistTracks)) {
    const currentIndex = tracks.findIndex((track) => track.id === activeModalTrack.id);
    if (currentIndex >= 0) {
      surroundingPrevious = tracks[currentIndex - 1] ?? null;
      surroundingNext = tracks[currentIndex + 1] ?? null;
      break;
    }
  }

  const upcomingTracks = (
    queueTracks.length > 0
      ? queueTracks
      : surroundingNext
        ? [surroundingNext, ...fallbackUpcomingTracks.filter((track) => track.id !== surroundingNext.id)]
        : fallbackUpcomingTracks
  )
    .slice(0, 6)
    .map((track) => trackLookup[track.id] ?? track);

  const previousTrack =
    surroundingPrevious ??
    previousPlayerTrack ??
    (selectedTrack?.id && selectedTrack.id !== activeModalTrack.id ? selectedTrack : null);
  const nextTrack = queueTracks[0] ?? surroundingNext ?? null;

  const modalProgressMs = isCurrentTrack
    ? estimatedPos
    : (selectedSnippet?.positionMs ?? 0) || activeModalTrack.durationMs || 0;
  const modalDurationMs = activeModalTrack.durationMs || playerState?.durationMs || 1;
  const modalProgressPercent = Math.max(
    0,
    Math.min(100, (modalProgressMs / Math.max(modalDurationMs, 1)) * 100)
  );
  const modalArcStart = 0.1;
  const modalArcEnd = 359.9;
  const modalProgressArcPath = describeArcPath(50, 50, 45, modalArcStart, modalArcEnd);

  return {
    activeModalTrack,
    isCurrentTrack,
    tss,
    selectedSnippetIndex,
    selectedSnippet,
    upcomingTracks,
    previousTrack,
    nextTrack,
    modalProgressMs,
    modalDurationMs,
    modalProgressPercent,
    modalProgressArcPath,
  };
}
