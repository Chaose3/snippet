import { describeArcPath } from "./snippet-ui-utils";
import { getPlaybackIntent } from "./playback-intent";
import { dedupeUpNextTracks, enrichUpNextTrack } from "./up-next-tracks";

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

  // Hero follows the track the user opened (route), not stale now-playing during queue taps.
  const activeModalTrack = trackLookup[selectedTrack.id] ?? selectedTrack;
  const playbackIntentId = getPlaybackIntent();
  const isCurrentTrack =
    playerState?.id === activeModalTrack.id || playbackIntentId === activeModalTrack.id;
  const heroIsPlaying =
    isCurrentTrack &&
    (playerState?.id === activeModalTrack.id
      ? Boolean(playerState?.isPlaying)
      : playbackIntentId === activeModalTrack.id);
  const queueAnchorId =
    isCurrentTrack && playerState?.id ? playerState.id : activeModalTrack.id;

  const tss = allTimestamps[activeModalTrack.id] || [];
  const selectedSnippetIndex = Math.min(
    selectedSnippetIndexByTrack[activeModalTrack.id] ?? 0,
    Math.max(0, tss.length - 1)
  );
  const selectedSnippet = tss[selectedSnippetIndex] ?? null;

  let surroundingPrevious = null;
  let surroundingNext = null;
  for (const tracks of Object.values(playlistTracks)) {
    const currentIndex = tracks.findIndex((track) => track.id === queueAnchorId);
    if (currentIndex >= 0) {
      surroundingPrevious = tracks[currentIndex - 1] ?? null;
      surroundingNext = tracks[currentIndex + 1] ?? null;
      break;
    }
  }

  const playlistFallback = surroundingNext
    ? [
        surroundingNext,
        ...fallbackUpcomingTracks.filter((track) => track.id !== surroundingNext.id),
      ]
    : fallbackUpcomingTracks;

  const rawUpcoming =
    isCurrentTrack && queueTracks.length > 0 ? queueTracks : playlistFallback;

  const upcomingTracks = dedupeUpNextTracks(rawUpcoming, {
    excludeId: playerState?.id ?? queueAnchorId,
    limit: 6,
  }).map((track) => enrichUpNextTrack(track, trackLookup));

  const previousTrack =
    surroundingPrevious ??
    previousPlayerTrack ??
    (selectedTrack?.id && selectedTrack.id !== activeModalTrack.id ? selectedTrack : null);
  const nextTrack = (isCurrentTrack && queueTracks[0]) || surroundingNext || null;

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
    heroIsPlaying,
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
