import { useEffect, useMemo, useRef, useState } from "react";
import { getBrowserPlaybackHelp } from "../lib/browser-playback-help";
import { getPlaybackIntent } from "../lib/playback-intent";
import {
  buildSnippetGroups,
  countTotalSnippets,
  countTracksWithSnippets,
} from "../lib/snippet-aggregates";

export function useSnippetDerivedData({
  allTimestamps,
  snippetTrackMeta = {},
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
      const prev = lookup[playerState.id];
      lookup[playerState.id] = {
        ...prev,
        id: playerState.id,
        name: playerState.name,
        uri: playerState.uri,
        artists: playerState.artists,
        albumArt: playerState.albumArt,
        durationMs: playerState.durationMs,
        contextUri: prev?.contextUri ?? playerState.contextUri ?? null,
        offsetUri: prev?.offsetUri ?? null,
        offsetPosition: prev?.offsetPosition,
      };
    }
    (recentlyPlayedTracks || []).forEach((t) => {
      if (t?.id) lookup[t.id] = lookup[t.id] ?? t;
    });
    (spotifyResults || []).forEach((t) => {
      if (t?.id) lookup[t.id] = lookup[t.id] ?? t;
    });
    for (const trackId of Object.keys(allTimestamps || {})) {
      const saved = snippetTrackMeta[trackId];
      if (!saved?.name) continue;
      const live = lookup[trackId];
      lookup[trackId] = {
        id: trackId,
        uri: live?.uri || saved.uri || `spotify:track:${trackId}`,
        name: live?.name || saved.name,
        artists: live?.artists || saved.artists || "",
        albumArt: live?.albumArt ?? saved.albumArt ?? null,
        durationMs: live?.durationMs ?? saved.durationMs,
        ...live,
      };
    }
    return lookup;
  }, [
    allTimestamps,
    snippetTrackMeta,
    flattenedPlaylistTracks,
    likedTracks,
    playerState,
    recentlyPlayedTracks,
    spotifyResults,
  ]);

  useEffect(() => {
    if (!playerState?.id) return;
    const intent = getPlaybackIntent();
    if (intent && playerState.id !== intent) return;
    if (lastPlayerTrackIdRef.current && lastPlayerTrackIdRef.current !== playerState.id) {
      const priorTrack = trackLookup[lastPlayerTrackIdRef.current];
      if (priorTrack) {
        setPreviousPlayerTrack(priorTrack);
      }
    }
    lastPlayerTrackIdRef.current = playerState.id;
  }, [playerState?.id, trackLookup]);

  const totalSnippetCount = useMemo(() => countTotalSnippets(allTimestamps), [allTimestamps]);
  const tracksWithSnippetsCount = useMemo(
    () => countTracksWithSnippets(allTimestamps),
    [allTimestamps]
  );

  const snippetGroups = useMemo(
    () => buildSnippetGroups(allTimestamps, trackLookup, snippetTrackMeta),
    [allTimestamps, trackLookup, snippetTrackMeta]
  );

  const snippetTracks = useMemo(
    () =>
      snippetGroups
        .map((group) => ({
          trackId: group.trackId,
          track: group.track,
          tss: group.tss,
          latestCreatedAt: Math.max(
            ...group.tss.map((ts) => {
              const created = ts.createdAt ? Date.parse(ts.createdAt) : 0;
              return Number.isNaN(created) ? 0 : created;
            })
          ),
        }))
        .sort((a, b) => b.latestCreatedAt - a.latestCreatedAt),
    [snippetGroups]
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
    totalSnippetCount,
    tracksWithSnippetsCount,
    snippetGroups,
    snippetTracks,
    prioritizedPlaylists,
    remainingPlaylists,
    prioritizedRecentlyPlayed,
    remainingRecentlyPlayed,
    fallbackUpcomingTracks,
    browserPlaybackHelp,
  };
}
