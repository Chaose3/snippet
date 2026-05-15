/**
 * Best-effort track metadata for player skeletons before full track fetch completes.
 */
export function getPlayerRouteHintTrack(trackId, { primedRef, trackLookup, playerState, recentlyPlayedTracks, spotifyResults }) {
  if (!trackId) return null;
  const primed = primedRef?.current;
  if (primed?.id === trackId) return primed;
  if (trackLookup?.[trackId]) return trackLookup[trackId];
  if (playerState?.id === trackId) {
    return {
      id: playerState.id,
      name: playerState.name,
      artists: playerState.artists,
      albumArt: playerState.albumArt,
    };
  }
  const fromRecent = recentlyPlayedTracks?.find((t) => t.id === trackId);
  if (fromRecent) return fromRecent;
  const fromSearch = spotifyResults?.find((t) => t.id === trackId);
  if (fromSearch) return fromSearch;
  return null;
}
