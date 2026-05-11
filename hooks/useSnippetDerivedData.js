import { useEffect, useMemo, useRef, useState } from "react";
import { getBrowserPlaybackHelp } from "../lib/browser-playback-help";

export function useSnippetDerivedData({
  allTimestamps,
  playerState,
  playlistTracks,
  likedTracks,
  selectedSnippetIndexByTrack,
  playlists,
  recentlyPlayedTracks,
  spotifyResults = [],
  routeTrackId = null,
  webPlayerId,
  webPlayerError,
}) {
  const [previousPlayerTrack, setPreviousPlayerTrack] = useState(null);
  const lastPlayerTrackIdRef = useRef(null);

  const nowPlayingTimestamps = useMemo(
    () => (playerState ? (allTimestamps[playerState.id] || []) : []),
    [allTimestamps, playerState]
  );
  const selectedNowPlayingSnippetIndex = playerState
    ? Math.min(selectedSnippetIndexByTrack[playerState.id] ?? 0, Math.max(0, nowPlayingTimestamps.length - 1))
    : 0;
  const selectedNowPlayingSnippet = nowPlayingTimestamps[selectedNowPlayingSnippetIndex] ?? null;

  const flattenedPlaylistTracks = useMemo(
    () => Object.values(playlistTracks).flat(),
    [playlistTracks]
  );

  const trackLookup = useMemo(() => {
    const lookup = {};
    (likedTracks || []).forEach((t) => {
      lookup[t.id] = t;
    });
    flattenedPlaylistTracks.forEach((t) => {
      lookup[t.id] = t;
    });
    if (playerState) {
      lookup[playerState.id] = {
        id: playerState.id,
        name: playerState.name,
        uri: playerState.uri,
        artists: playerState.artists,
        albumArt: playerState.albumArt,
        durationMs: playerState.durationMs,
      };
    }
    (recentlyPlayedTracks || []).forEach((t) => {
      if (t?.id) lookup[t.id] = lookup[t.id] ?? t;
    });
    (spotifyResults || []).forEach((t) => {
      if (t?.id) lookup[t.id] = lookup[t.id] ?? t;
    });
    return lookup;
  }, [flattenedPlaylistTracks, likedTracks, playerState, recentlyPlayedTracks, spotifyResults]);

  useEffect(() => {
    if (!playerState?.id) return;
    if (lastPlayerTrackIdRef.current && lastPlayerTrackIdRef.current !== playerState.id) {
      const priorTrack = trackLookup[lastPlayerTrackIdRef.current];
      if (priorTrack) {
        setPreviousPlayerTrack(priorTrack);
      }
    }
    lastPlayerTrackIdRef.current = playerState.id;
  }, [playerState?.id, trackLookup]);

  const snippetTracks = useMemo(
    () =>
      Object.entries(allTimestamps)
        .map(([trackId, tss]) => ({
          trackId,
          track: trackLookup[trackId] ?? null,
          tss,
          latestCreatedAt: Math.max(
            ...tss.map((ts) => {
              const created = ts.createdAt ? Date.parse(ts.createdAt) : 0;
              return Number.isNaN(created) ? 0 : created;
            })
          ),
        }))
        .sort((a, b) => b.latestCreatedAt - a.latestCreatedAt),
    [allTimestamps, trackLookup]
  );

  const recentPlaylists = useMemo(
    () => [...playlists].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [playlists]
  );
  const prioritizedPlaylists = useMemo(() => recentPlaylists.slice(0, 6), [recentPlaylists]);
  const remainingPlaylists = useMemo(() => recentPlaylists.slice(6), [recentPlaylists]);
  const prioritizedRecentlyPlayed = useMemo(() => recentlyPlayedTracks.slice(0, 6), [recentlyPlayedTracks]);
  const remainingRecentlyPlayed = useMemo(() => recentlyPlayedTracks.slice(6), [recentlyPlayedTracks]);

  const fallbackUpcomingTracks = useMemo(() => {
    for (const tracks of Object.values(playlistTracks)) {
      const currentIndex = tracks.findIndex((track) => track.id === routeTrackId);
      if (currentIndex >= 0) {
        return tracks.slice(currentIndex + 1, currentIndex + 7);
      }
    }
    return [];
  }, [playlistTracks, routeTrackId]);

  const browserPlaybackHelp = useMemo(
    () => getBrowserPlaybackHelp(webPlayerId, webPlayerError),
    [webPlayerError, webPlayerId]
  );

  return {
    previousPlayerTrack,
    nowPlayingTimestamps,
    selectedNowPlayingSnippetIndex,
    selectedNowPlayingSnippet,
    trackLookup,
    snippetTracks,
    prioritizedPlaylists,
    remainingPlaylists,
    prioritizedRecentlyPlayed,
    remainingRecentlyPlayed,
    fallbackUpcomingTracks,
    browserPlaybackHelp,
  };
}
