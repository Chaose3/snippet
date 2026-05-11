import { useCallback, useEffect, useRef, useState } from "react";
import { getStoredToken } from "../lib/auth-storage";
import { isNativeCapacitor } from "../lib/capacitor/platform";
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
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "hidden" &&
        !isNativeCapacitor()
      ) {
        return;
      }
      await refreshPlayerSnapshot();
    };

    run();
    const id = setInterval(run, 3000);
    const onVis = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") run();
    };
    document.addEventListener("visibilitychange", onVis);

    let appListenerRemoved = false;
    let appListenerHandle = null;
    if (isNativeCapacitor()) {
      import("@capacitor/app")
        .then(({ App }) =>
          App.addListener("appStateChange", ({ isActive }) => {
            if (isActive) refreshPlayerSnapshot();
          })
        )
        .then((handle) => {
          if (!appListenerRemoved) appListenerHandle = handle;
          else handle.remove();
        })
        .catch(() => {});
    }

    return () => {
      appListenerRemoved = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      appListenerHandle?.remove();
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
