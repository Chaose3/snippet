import { useCallback, useEffect, useRef, useState } from "react";
import { getStoredToken } from "../lib/auth-storage";
import { getPlayerState, getQueue } from "../lib/snippet";

export function useSpotifyPlayerSnapshot({ token, withFreshToken }) {
  const [playerState, setPlayerState] = useState(null);
  const [queueTracks, setQueueTracks] = useState([]);
  const [estimatedPos, setEstimatedPos] = useState(0);
  const estimatedPosRef = useRef(0);
  const lastPollRef = useRef(null);
  const isSeekingRef = useRef(false);

  useEffect(() => {
    estimatedPosRef.current = estimatedPos;
  }, [estimatedPos]);

  const refreshPlayerSnapshot = useCallback(async () => {
    const t = getStoredToken();
    if (!t) return { state: null, queue: [] };
    const [state, queue] = await Promise.all([
      withFreshToken((accessToken) => getPlayerState(accessToken)).catch(() => null),
      withFreshToken((accessToken) => getQueue(accessToken)).catch(() => []),
    ]);
    if (state) {
      setPlayerState(state);
      if (!isSeekingRef.current) {
        setEstimatedPos(state.positionMs);
      }
      lastPollRef.current = {
        time: Date.now(),
        positionMs: state.positionMs,
        isPlaying: state.isPlaying,
      };
    } else {
      setPlayerState(null);
      lastPollRef.current = null;
    }
    setQueueTracks(queue || []);
    return { state, queue: queue || [] };
  }, [withFreshToken]);

  useEffect(() => {
    if (!token) return;

    const run = async () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      await refreshPlayerSnapshot();
    };

    run();
    const id = setInterval(run, 3000);
    const onVis = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") run();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [token, refreshPlayerSnapshot]);

  useEffect(() => {
    const id = setInterval(() => {
      if (isSeekingRef.current) return;
      if (!lastPollRef.current?.isPlaying) return;
      const elapsed = Date.now() - lastPollRef.current.time;
      const pos = lastPollRef.current.positionMs + elapsed;
      estimatedPosRef.current = pos;
      setEstimatedPos(pos);
    }, 200);
    return () => clearInterval(id);
  }, []);

  const resetPlayer = useCallback(() => {
    setPlayerState(null);
    lastPollRef.current = null;
  }, []);

  return {
    playerState,
    setPlayerState,
    queueTracks,
    setQueueTracks,
    estimatedPos,
    setEstimatedPos,
    estimatedPosRef,
    lastPollRef,
    isSeekingRef,
    refreshPlayerSnapshot,
    resetPlayer,
  };
}
