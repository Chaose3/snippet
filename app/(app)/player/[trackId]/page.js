"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppPlayback } from "../../../../contexts/AppPlaybackContext";
import { TrackPlayerScreen } from "../../../../components/snippet/TrackPlayerScreen";
import { PlayerRouteSkeleton } from "../../../../components/snippet/PlayerRouteSkeleton";

export default function PlayerTrackPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.trackId;
  const trackId = Array.isArray(rawId) ? rawId[0] : rawId;

  const pb = useAppPlayback();

  useEffect(() => {
    if (pb.hydrated && !pb.token) {
      router.replace("/");
    }
  }, [pb.hydrated, pb.token, router]);

  if (!pb.hydrated) {
    return <PlayerRouteSkeleton />;
  }

  if (!pb.token) {
    return null;
  }

  return <TrackPlayerScreen trackId={trackId} />;
}
