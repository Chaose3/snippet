"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppPlayback } from "../../../contexts/AppPlaybackContext";
import { getPlayerRouteHintTrack } from "../../../lib/player-route-hint";
import { trackIdFromSearchParams } from "../../../lib/player-route";
import { TrackPlayerScreen } from "../../../components/snippet/TrackPlayerScreen";
import { PlayerRouteSkeleton } from "../../../components/snippet/PlayerRouteSkeleton";

export default function PlayerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryTrackId = trackIdFromSearchParams(searchParams);

  const pb = useAppPlayback();
  const { playerViewTrackId, setPlayerViewTrackId, playerNavPrimedTrackRef } = pb;

  // Sync URL → context only when the query param changes (back/forward, deep link).
  // Do NOT depend on playerViewTrackId: Up Next updates state + history.replaceState first;
  // useSearchParams can still read the old `?t=` for a render and would revert the new track.
  useEffect(() => {
    if (!queryTrackId) return;
    setPlayerViewTrackId(queryTrackId);
  }, [queryTrackId, setPlayerViewTrackId]);

  const trackId = playerViewTrackId ?? queryTrackId ?? null;

  const hintTrack = useMemo(
    () =>
      getPlayerRouteHintTrack(trackId, {
        primedRef: playerNavPrimedTrackRef,
        trackLookup: pb.trackLookup,
        playerState: pb.playerState,
        recentlyPlayedTracks: pb.recentlyPlayedTracks,
        spotifyResults: pb.spotifyResults,
      }),
    [
      trackId,
      playerNavPrimedTrackRef,
      pb.trackLookup,
      pb.playerState,
      pb.recentlyPlayedTracks,
      pb.spotifyResults,
    ]
  );

  useEffect(() => {
    if (pb.hydrated && !pb.token) {
      router.replace("/");
    }
  }, [pb.hydrated, pb.token, router]);

  if (!pb.hydrated) {
    return <PlayerRouteSkeleton hintTrack={hintTrack} />;
  }

  if (!pb.token) {
    return null;
  }

  if (!trackId) {
    return <PlayerRouteSkeleton hintTrack={hintTrack} />;
  }

  return <TrackPlayerScreen trackId={trackId} />;
}
