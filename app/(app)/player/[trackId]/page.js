"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppPlayback } from "../../../../contexts/AppPlaybackContext";
import { getPlayerRouteHintTrack } from "../../../../lib/player-route-hint";
import { playerHref } from "../../../../lib/player-route";
import { PlayerRouteSkeleton } from "../../../../components/snippet/PlayerRouteSkeleton";

/** Deep links to `/player/:id` — sync context then replace with canonical `/player?t=`. */
export default function LegacyPlayerTrackPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.trackId;
  const trackId = Array.isArray(rawId) ? rawId[0] : rawId;
  const pb = useAppPlayback();

  useEffect(() => {
    if (!trackId || !pb.hydrated) return;
    const hint = getPlayerRouteHintTrack(trackId, {
      primedRef: pb.playerNavPrimedTrackRef,
      trackLookup: pb.trackLookup,
      playerState: pb.playerState,
      recentlyPlayedTracks: pb.recentlyPlayedTracks,
      spotifyResults: pb.spotifyResults,
    });
    if (hint) {
      pb.setPlayerViewTrack(hint);
    } else {
      pb.setPlayerViewTrackId(trackId);
    }
    router.replace(playerHref(trackId));
  }, [
    trackId,
    pb.hydrated,
    pb.setPlayerViewTrack,
    pb.setPlayerViewTrackId,
    pb.playerNavPrimedTrackRef,
    pb.trackLookup,
    pb.playerState,
    pb.recentlyPlayedTracks,
    pb.spotifyResults,
    router,
  ]);

  return <PlayerRouteSkeleton />;
}
