import { useCallback, useEffect, useRef, useState } from "react";
import { SNIPPET_AUTH_COMPLETE } from "../lib/auth-events";
import { getStoredToken } from "../lib/auth-storage";
import { fetchNativePlayerState } from "../lib/capacitor/native-player-state";
import { isNativeCapacitor } from "../lib/capacitor/platform";
import { getCurrentlyPlaying, getPlayerState, getQueue } from "../lib/snippet";
import { clearPlaybackIntent, getPlaybackIntent } from "../lib/playback-intent";
import {
  mergePlayerState,
  playerStateFromCurrentlyPlaying,
  playerStatePollEquivalent,
  queueTracksShallowEqual,
} from "../lib/spotify-player-state-merge";
import { syncWidgetNowPlaying } from "../lib/capacitor/widget-now-playing";
import { rememberPlaybackContext } from "../lib/playback-context";

const WEB_POLL_MS = 4000;
const NATIVE_POLL_MS = 6000;
const POSITION_TICK_MS = 500;
const POSITION_UI_MS = 1000;

export function useSpotifyPlayerSnapshot({ token, withFreshToken }) {
  const [playerState, setPlayerState] = useState(null);
  const [queueTracks, setQueueTracks] = useState([]);
  const [estimatedPos, setEstimatedPos] = useState(0);
  const estimatedPosRef = useRef(0);
  const lastPollRef = useRef(null);
  const isSeekingRef = useRef(false);
  const lastSnapshotTrackIdRef = useRef(null);
  const pollInFlightRef = useRef(false);

  useEffect(() => {
    estimatedPosRef.current = estimatedPos;
  }, [estimatedPos]);

  const refreshPlayerSnapshot = useCallback(async () => {
    const t = getStoredToken();
    if (!t) return { state: null, queue: [] };
    if (pollInFlightRef.current) return { state: null, queue: [] };
    pollInFlightRef.current = true;

    try {
      let state = null;
      let queue = [];

      if (isNativeCapacitor()) {
        state = await fetchNativePlayerState();
      }
      // If native App Remote lags behind an in-flight intent (common on iOS),
      // prefer Web API state so UI doesn't "stick" until navigation/refresh.
      const intent = getPlaybackIntent();
      const nativeLooksStaleDuringIntent = Boolean(
        isNativeCapacitor() && intent && state?.id && state.id !== intent
      );

      if (!state || nativeLooksStaleDuringIntent) {
        state = await withFreshToken((accessToken) => getPlayerState(accessToken)).catch(() => null);
        if (!state && isNativeCapacitor()) {
          const current = await withFreshToken((accessToken) => getCurrentlyPlaying(accessToken)).catch(
            () => null
          );
          state = playerStateFromCurrentlyPlaying(current);
        }
      }
      queue = await withFreshToken((accessToken) => getQueue(accessToken)).catch(() => []);

      if (state) {
        const staleDuringIntent = Boolean(intent && state.id !== intent);
        const sameTrack = lastSnapshotTrackIdRef.current === state.id;
        lastSnapshotTrackIdRef.current = state.id;
        if (state.id === intent) {
          clearPlaybackIntent(state.id);
        }
        if (state.contextUri) {
          rememberPlaybackContext(state.contextUri);
        }
        setPlayerState((prev) => {
          const merged = mergePlayerState(prev, state);
          if (playerStatePollEquivalent(prev, merged)) return prev;
          return merged;
        });
        if (!staleDuringIntent) {
          if (!isSeekingRef.current) {
            setEstimatedPos((prevPos) => {
              if (sameTrack && Math.abs(prevPos - state.positionMs) < 2000) {
                return prevPos;
              }
              return state.positionMs;
            });
          }
          lastPollRef.current = {
            time: Date.now(),
            positionMs: state.positionMs,
            isPlaying: state.isPlaying,
          };
        }
      } else {
        setPlayerState((prev) => (prev?.isPlaying ? prev : null));
        if (!lastPollRef.current?.isPlaying) {
          lastPollRef.current = null;
        }
      }

      setQueueTracks((prev) => {
        const next = queue || [];
        if (next.length === 0 && prev.length > 0 && state?.isPlaying) {
          return prev;
        }
        if (queueTracksShallowEqual(prev, next)) {
          return prev;
        }
        return next;
      });
      return { state, queue: queue || [] };
    } finally {
      pollInFlightRef.current = false;
    }
  }, [withFreshToken]);

  useEffect(() => {
    const onAuthComplete = () => {
      refreshPlayerSnapshot();
    };
    window.addEventListener(SNIPPET_AUTH_COMPLETE, onAuthComplete);
    return () => window.removeEventListener(SNIPPET_AUTH_COMPLETE, onAuthComplete);
  }, [refreshPlayerSnapshot]);

  const prevTokenRef = useRef(null);
  useEffect(() => {
    if (!token) {
      prevTokenRef.current = null;
      return;
    }
    const tokenChanged = prevTokenRef.current !== token;
    prevTokenRef.current = token;
    if (tokenChanged) {
      refreshPlayerSnapshot();
    }
  }, [token, refreshPlayerSnapshot]);

  useEffect(() => {
    if (!token) return;

    const pollMs = isNativeCapacitor() ? NATIVE_POLL_MS : WEB_POLL_MS;

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
    const id = setInterval(run, pollMs);
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
    let lastUiPush = 0;
    const id = setInterval(() => {
      if (isSeekingRef.current) return;
      if (!lastPollRef.current?.isPlaying) return;
      const elapsed = Date.now() - lastPollRef.current.time;
      const pos = lastPollRef.current.positionMs + elapsed;
      estimatedPosRef.current = pos;
      const now = Date.now();
      if (now - lastUiPush >= POSITION_UI_MS) {
        lastUiPush = now;
        setEstimatedPos(pos);
      }
    }, POSITION_TICK_MS);
    return () => clearInterval(id);
  }, []);

  const resetPlayer = useCallback(() => {
    setPlayerState(null);
    lastPollRef.current = null;
  }, []);

  useEffect(() => {
    if (!isNativeCapacitor()) return;
    const pos = playerState?.name
      ? (estimatedPosRef.current ?? playerState.positionMs ?? 0)
      : 0;
    syncWidgetNowPlaying(playerState, pos);
  }, [
    playerState?.id,
    playerState?.name,
    playerState?.artists,
    playerState?.albumArt,
    playerState?.isPlaying,
    playerState?.positionMs,
  ]);

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
