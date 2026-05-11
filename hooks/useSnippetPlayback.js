import { useCallback } from "react";
import {
  playSnippet,
  setShuffle,
  setRepeatMode,
  skipToNext,
  skipToPrevious,
  pausePlayback,
  resumePlayback,
  setVolume,
  seekToPosition,
  getDevices,
  transferPlayback,
} from "../lib/snippet";
import { saveTimestamp, deleteTimestamp, formatMs } from "../lib/timestamps";
import {
  getStoredToken,
  STORAGE_KEY,
  STORAGE_REFRESH,
  STORAGE_EXPIRES,
} from "../lib/auth-storage";
import { getNativeSpotifyBridge } from "../lib/capacitor/platform";
import { MAX_SNIPPETS_PER_TRACK } from "../lib/snippet-ui-utils";

export function useSnippetPlayback({
  setToken,
  doRefresh,
  withFreshToken,
  isNativeApp,
  webPlayerId,
  webPlayerIdRef,
  sdkPlayerRef,
  playerState,
  setPlayerState,
  deviceId,
  setDeviceId,
  lastPollRef,
  estimatedPosRef,
  setEstimatedPos,
  estimatedPos,
  isSeekingRef,
  refreshPlayerSnapshot,
  fetchDevices,
  snippetModeEnabled,
  allTimestamps,
  setAllTimestamps,
  selectedSnippetIndexByTrack,
  setSelectedSnippetIndexByTrack,
  labelInput,
  setLabelInput,
  modalRingSeekRef,
  setModalClipNotice,
  setModalClipSaved,
}) {
  const ensureBrowserPlaybackDevice = useCallback(async () => {
    if (isNativeApp || typeof window === "undefined") return null;
    if (webPlayerIdRef.current) return webPlayerIdRef.current;

    if (window.Spotify && !sdkPlayerRef.current) {
      window.onSpotifyWebPlaybackSDKReady?.();
    }

    const waitUntil = Date.now() + 3500;
    while (!webPlayerIdRef.current && Date.now() < waitUntil) {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    if (webPlayerIdRef.current) return webPlayerIdRef.current;

    const t = getStoredToken();
    if (!t) return null;
    const list = await withFreshToken((accessToken) => getDevices(accessToken)).catch((err) => {
      console.warn("[ensureBrowserPlaybackDevice] failed", err);
      return [];
    });
    const snippetDevice =
      list.find((device) => device.name === "Snippet") ??
      list.find((device) => device.id === webPlayerIdRef.current) ??
      null;
    if (snippetDevice) {
      setDeviceId(snippetDevice.id);
      return snippetDevice.id;
    }

    return null;
  }, [isNativeApp, withFreshToken, webPlayerIdRef, sdkPlayerRef, setDeviceId]);

  const jump = useCallback(
    async (trackOrUri, positionMs, playbackContext = null) => {
      const trackUri = typeof trackOrUri === "string" ? trackOrUri : trackOrUri?.uri;
      const contextSource =
        typeof trackOrUri === "object" && trackOrUri ? trackOrUri : playbackContext;
      if (!trackUri || trackUri.startsWith("spotify:local:")) return;
      const nativeSpotifyBridge = getNativeSpotifyBridge();
      if (nativeSpotifyBridge?.connectAndPlay) {
        try {
          await nativeSpotifyBridge.connectAndPlay({ uri: trackUri, positionMs });
          lastPollRef.current = { time: Date.now(), positionMs, isPlaying: true };
          setEstimatedPos(positionMs);
          return;
        } catch (err) {
          const message = String(err?.message || err || "");
          console.warn("[nativeSpotifyBridge.connectAndPlay] failed", message);
          if (message.includes("SPOTIFY_NOT_INSTALLED")) {
            alert("Open the Spotify app on this phone first, then try again.");
            return;
          }
          if (message.includes("SPOTIFY_NOT_PREMIUM")) {
            alert("Spotify Premium is required for playback control.");
            return;
          }
        }
      }

      const t = getStoredToken();
      if (!t) return;
      const browserDeviceId = await ensureBrowserPlaybackDevice();
      const targetDevice = browserDeviceId || webPlayerIdRef.current || deviceId || null;
      if ((browserDeviceId || webPlayerIdRef.current) && sdkPlayerRef.current?.activateElement) {
        try {
          await sdkPlayerRef.current.activateElement();
        } catch (err) {
          console.warn("[webPlayer.activateElement] failed", err);
        }
      }
      if (browserDeviceId || webPlayerIdRef.current) {
        try {
          await transferPlayback(t, browserDeviceId || webPlayerIdRef.current, false);
        } catch (err) {
          console.warn("[transferPlayback] failed", err);
        }
      }
      const request = {
        trackUri,
        positionMs,
        deviceId: targetDevice,
        contextUri: contextSource?.contextUri ?? null,
        offsetUri: contextSource?.offsetUri ?? null,
        offsetPosition: contextSource?.offsetPosition,
      };
      const res = await playSnippet(t, request);
      if (res.status === 204 || res.ok) {
        lastPollRef.current = { time: Date.now(), positionMs, isPlaying: true };
        setEstimatedPos(positionMs);
        return;
      }
      if (res.status === 401) {
        const newToken = await doRefresh();
        if (!newToken) {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(STORAGE_REFRESH);
          localStorage.removeItem(STORAGE_EXPIRES);
          setToken(null);
          return;
        }
        if (browserDeviceId || webPlayerIdRef.current) {
          try {
            await transferPlayback(newToken, browserDeviceId || webPlayerIdRef.current, false);
          } catch (err) {
            console.warn("[transferPlayback retry] failed", err);
          }
        }
        const retry = await playSnippet(newToken, request);
        if (retry.status === 204 || retry.ok) {
          lastPollRef.current = { time: Date.now(), positionMs, isPlaying: true };
          setEstimatedPos(positionMs);
        }
        return;
      }
      if (res.status === 404) {
        setDeviceId(null);
        fetchDevices();
        return;
      }
      if (res.status === 403) {
        alert("Spotify Premium is required for playback control.");
      }
    },
    [deviceId, doRefresh, ensureBrowserPlaybackDevice, fetchDevices, lastPollRef, setEstimatedPos, setToken, webPlayerIdRef, sdkPlayerRef]
  );

  const handlePlayPause = useCallback(async () => {
    if (!playerState) return;
    const nativeSpotifyBridge = getNativeSpotifyBridge();
    if (nativeSpotifyBridge) {
      if (playerState.isPlaying && nativeSpotifyBridge.pause) {
        await nativeSpotifyBridge.pause().catch((err) => {
          console.warn("[nativeSpotifyBridge.pause] failed", err);
        });
      } else if (!playerState.isPlaying && nativeSpotifyBridge.resume) {
        await nativeSpotifyBridge.resume().catch((err) => {
          console.warn("[nativeSpotifyBridge.resume] failed", err);
        });
      }
    } else {
      const t = getStoredToken();
      if (!t) return;
      if (playerState.isPlaying) {
        await pausePlayback(t);
      } else {
        await resumePlayback(t);
      }
    }
    if (playerState.isPlaying) {
      setPlayerState((prev) => (prev ? { ...prev, isPlaying: false } : prev));
      if (lastPollRef.current) lastPollRef.current.isPlaying = false;
    } else {
      setPlayerState((prev) => (prev ? { ...prev, isPlaying: true } : prev));
      if (lastPollRef.current) {
        lastPollRef.current.isPlaying = true;
        lastPollRef.current.time = Date.now();
      }
    }
  }, [playerState, setPlayerState, lastPollRef]);

  const handleSeekChange = useCallback(
    (e) => {
      isSeekingRef.current = true;
      setEstimatedPos(Number(e.target.value));
    },
    [isSeekingRef, setEstimatedPos]
  );

  const handleSeekCommit = useCallback(
    async (e) => {
      const posMs = Number(e.target.value);
      const nativeSpotifyBridge = getNativeSpotifyBridge();
      if (nativeSpotifyBridge?.seek) {
        await nativeSpotifyBridge.seek({ positionMs: posMs }).catch((err) => {
          console.warn("[nativeSpotifyBridge.seek] failed", err);
        });
      } else {
        const t = getStoredToken();
        if (t) await seekToPosition(t, posMs);
      }
      if (lastPollRef.current) {
        lastPollRef.current.positionMs = posMs;
        lastPollRef.current.time = Date.now();
      }
      isSeekingRef.current = false;
    },
    [isSeekingRef, lastPollRef]
  );

  const commitSeekPosition = useCallback(
    async (posMs) => {
      const clamped = Math.max(0, Math.floor(posMs));
      const nativeSpotifyBridge = getNativeSpotifyBridge();
      if (nativeSpotifyBridge?.seek) {
        await nativeSpotifyBridge.seek({ positionMs: clamped }).catch((err) => {
          console.warn("[nativeSpotifyBridge.seek] failed", err);
        });
      } else {
        const t = getStoredToken();
        if (t) await seekToPosition(t, clamped);
      }
      if (lastPollRef.current) {
        lastPollRef.current.positionMs = clamped;
        lastPollRef.current.time = Date.now();
      }
      setEstimatedPos(clamped);
      isSeekingRef.current = false;
    },
    [isSeekingRef, lastPollRef, setEstimatedPos]
  );

  const readRingSeekPosition = useCallback((event, durationMs) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const dx = x - cx;
    const dy = y - cy;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const normalized = (angle + 360 + 90) % 360;
    const progress = normalized / 360;
    return progress * Math.max(durationMs || 1, 1);
  }, []);

  const handleModalRingPointerDown = useCallback(
    (event, durationMs) => {
      if (!durationMs) return;
      modalRingSeekRef.current.active = true;
      isSeekingRef.current = true;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      event.preventDefault();
      setEstimatedPos(readRingSeekPosition(event, durationMs));
    },
    [isSeekingRef, modalRingSeekRef, readRingSeekPosition, setEstimatedPos]
  );

  const handleModalRingPointerMove = useCallback(
    (event, durationMs) => {
      if (!modalRingSeekRef.current.active || !durationMs) return;
      setEstimatedPos(readRingSeekPosition(event, durationMs));
    },
    [modalRingSeekRef, readRingSeekPosition, setEstimatedPos]
  );

  const handleModalRingPointerUp = useCallback(
    async (event, durationMs) => {
      if (!modalRingSeekRef.current.active || !durationMs) return;
      modalRingSeekRef.current.active = false;
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      await commitSeekPosition(readRingSeekPosition(event, durationMs));
    },
    [commitSeekPosition, modalRingSeekRef, readRingSeekPosition]
  );

  const handleShuffle = useCallback(async () => {
    const t = getStoredToken();
    if (!t || !playerState) return;
    const next = !playerState.shuffle;
    await setShuffle(t, next);
    setPlayerState((prev) => (prev ? { ...prev, shuffle: next } : prev));
    setTimeout(() => refreshPlayerSnapshot(), 250);
  }, [playerState, refreshPlayerSnapshot, setPlayerState]);

  const playbackTargetDevice = webPlayerId || deviceId || null;

  const transitionIntoSnippetIfNeeded = useCallback(
    async ({ previousTrackId = null, startPlayback }) => {
      const restoreVolumePercent =
        snippetModeEnabled && Number.isFinite(playerState?.volumePercent)
          ? playerState.volumePercent
          : null;
      const shouldMuteTransition = restoreVolumePercent != null;

      if (shouldMuteTransition) {
        await withFreshToken((accessToken) => setVolume(accessToken, 0)).catch(() => null);
      }

      try {
        await startPlayback();

        let nextState = null;
        for (let attempt = 0; attempt < 8; attempt += 1) {
          const snapshot = await refreshPlayerSnapshot();
          nextState = snapshot?.state ?? null;
          if (nextState?.id && (!previousTrackId || nextState.id !== previousTrackId)) break;
          await new Promise((resolve) => setTimeout(resolve, 180));
        }

        if (!nextState?.id || !snippetModeEnabled) return;

        const snippets = allTimestamps[nextState.id] || [];
        const selectedIndex = Math.min(
          selectedSnippetIndexByTrack[nextState.id] ?? 0,
          Math.max(0, snippets.length - 1)
        );
        const snippetPositionMs = snippets[selectedIndex]?.positionMs ?? 0;
        if (snippetPositionMs <= 0) return;

        await withFreshToken((accessToken) => seekToPosition(accessToken, snippetPositionMs)).catch(() => null);

        setPlayerState((prev) =>
          prev && prev.id === nextState.id ? { ...prev, positionMs: snippetPositionMs } : prev
        );
        lastPollRef.current = {
          time: Date.now(),
          positionMs: snippetPositionMs,
          isPlaying: true,
        };
        setEstimatedPos(snippetPositionMs);
      } finally {
        if (shouldMuteTransition) {
          await withFreshToken((accessToken) => setVolume(accessToken, restoreVolumePercent)).catch(() => null);
          setPlayerState((prev) => (prev ? { ...prev, volumePercent: restoreVolumePercent } : prev));
        }
        setTimeout(() => refreshPlayerSnapshot(), 250);
      }
    },
    [
      allTimestamps,
      playerState?.volumePercent,
      refreshPlayerSnapshot,
      selectedSnippetIndexByTrack,
      snippetModeEnabled,
      withFreshToken,
      lastPollRef,
      setEstimatedPos,
      setPlayerState,
    ]
  );

  const handleRepeatCycle = useCallback(async () => {
    const t = getStoredToken();
    if (!t || !playerState) return;
    const nextRepeatMode =
      playerState.repeatMode === "off"
        ? "context"
        : playerState.repeatMode === "context"
          ? "track"
          : "off";
    await setRepeatMode(t, nextRepeatMode, playbackTargetDevice);
    setPlayerState((prev) => (prev ? { ...prev, repeatMode: nextRepeatMode } : prev));
    setTimeout(() => refreshPlayerSnapshot(), 250);
  }, [playerState, playbackTargetDevice, refreshPlayerSnapshot, setPlayerState]);

  const handleSkipNext = useCallback(async () => {
    const t = getStoredToken();
    if (!t) return;
    await transitionIntoSnippetIfNeeded({
      previousTrackId: playerState?.id ?? null,
      startPlayback: () => skipToNext(t, playbackTargetDevice),
    });
  }, [playbackTargetDevice, playerState?.id, transitionIntoSnippetIfNeeded]);

  const handleSkipPrevious = useCallback(async () => {
    const t = getStoredToken();
    if (!t) return;
    await skipToPrevious(t, playbackTargetDevice);
    setTimeout(() => refreshPlayerSnapshot(), 350);
  }, [playbackTargetDevice, refreshPlayerSnapshot]);

  const handleQuickPlayPlaylist = useCallback(
    async (playlist) => {
      const t = getStoredToken();
      if (!t || !playlist?.id) return;
      const browserDeviceId = await ensureBrowserPlaybackDevice();
      const targetDevice = browserDeviceId || webPlayerIdRef.current || deviceId || null;
      if ((browserDeviceId || webPlayerIdRef.current) && sdkPlayerRef.current?.activateElement) {
        try {
          await sdkPlayerRef.current.activateElement();
        } catch (err) {
          console.warn("[webPlayer.activateElement] failed", err);
        }
      }
      if (browserDeviceId || webPlayerIdRef.current) {
        try {
          await transferPlayback(t, browserDeviceId || webPlayerIdRef.current, false);
        } catch (err) {
          console.warn("[transferPlayback] failed", err);
        }
      }

      await transitionIntoSnippetIfNeeded({
        previousTrackId: playerState?.id ?? null,
        startPlayback: async () => {
          await setShuffle(t, true);
          setPlayerState((prev) => (prev ? { ...prev, shuffle: true } : prev));

          const request = {
            trackUri: `${playlist.uri}:seed`,
            positionMs: 0,
            deviceId: targetDevice,
            contextUri: playlist.uri ?? `spotify:playlist:${playlist.id}`,
          };

          const res = await playSnippet(t, request);
          if (res.status === 401) {
            const newToken = await doRefresh();
            if (!newToken) return;
            if (browserDeviceId || webPlayerIdRef.current) {
              try {
                await transferPlayback(newToken, browserDeviceId || webPlayerIdRef.current, false);
              } catch (err) {
                console.warn("[transferPlayback retry] failed", err);
              }
            }
            await setShuffle(newToken, true);
            await playSnippet(newToken, { ...request });
          }
        },
      });
    },
    [
      deviceId,
      doRefresh,
      ensureBrowserPlaybackDevice,
      playerState?.id,
      transitionIntoSnippetIfNeeded,
      webPlayerIdRef,
      sdkPlayerRef,
      setPlayerState,
    ]
  );

  const handleSaveTimestamp = useCallback(async () => {
    if (!playerState) return false;
    const t = getStoredToken();
    if (!t) return false;
    const label = labelInput.trim() || null;
    try {
      const updated = await saveTimestamp(t, playerState.id, Math.floor(estimatedPosRef.current), label);
      if (updated) {
        setAllTimestamps((prev) => ({ ...prev, [playerState.id]: updated }));
        setSelectedSnippetIndexByTrack((prev) => ({
          ...prev,
          [playerState.id]: updated.length - 1,
        }));
      }
      setLabelInput("");
      return true;
    } catch (err) {
      if (err.message === "MAX_SNIPPETS_REACHED") {
        alert(err.detail || `You can save up to ${MAX_SNIPPETS_PER_TRACK} snippets per song.`);
        return false;
      }
      console.warn("[saveTimestamp] failed", err);
      return false;
    }
  }, [estimatedPosRef, labelInput, playerState, setAllTimestamps, setLabelInput, setSelectedSnippetIndexByTrack]);

  const handleModalClip = useCallback(async () => {
    const saved = await handleSaveTimestamp();
    if (!saved) {
      setModalClipNotice("Clip couldn't be saved");
      window.setTimeout(() => setModalClipNotice(""), 1200);
      return;
    }
    setModalClipSaved(true);
    setModalClipNotice(`Clip saved at ${formatMs(estimatedPos)}`);
    window.setTimeout(() => {
      setModalClipSaved(false);
      setModalClipNotice("");
    }, 1100);
  }, [estimatedPos, handleSaveTimestamp, setModalClipNotice, setModalClipSaved]);

  const handleSelectSnippet = useCallback((trackId, index) => {
    setSelectedSnippetIndexByTrack((prev) => ({ ...prev, [trackId]: index }));
  }, [setSelectedSnippetIndexByTrack]);

  const resolvePlaybackPosition = useCallback(
    (trackId, fallbackPositionMs = 0) => {
      if (!snippetModeEnabled || !trackId) return fallbackPositionMs;
      const snippets = allTimestamps[trackId] || [];
      if (snippets.length === 0) return fallbackPositionMs;
      const selectedIndex = Math.min(
        selectedSnippetIndexByTrack[trackId] ?? 0,
        Math.max(0, snippets.length - 1)
      );
      return snippets[selectedIndex]?.positionMs ?? fallbackPositionMs;
    },
    [allTimestamps, selectedSnippetIndexByTrack, snippetModeEnabled]
  );

  const playTrackWithMode = useCallback(
    (track) => {
      if (!track?.uri || !track?.id) return;
      jump(track, resolvePlaybackPosition(track.id, 0), track);
    },
    [jump, resolvePlaybackPosition]
  );

  const handleDelete = useCallback(async (trackId, index) => {
    const t = getStoredToken();
    if (!t) return;
    const updated = await deleteTimestamp(t, trackId, index);
    setAllTimestamps((prev) => {
      const next = { ...prev };
      if (updated && updated.length > 0) {
        next[trackId] = updated;
      } else {
        delete next[trackId];
      }
      return next;
    });
    setSelectedSnippetIndexByTrack((prev) => {
      const current = prev[trackId] ?? 0;
      const next = { ...prev };
      if (!updated || updated.length === 0) {
        delete next[trackId];
        return next;
      }
      if (current === index) {
        next[trackId] = Math.max(0, Math.min(index, updated.length - 1));
        return next;
      }
      if (current > index) {
        next[trackId] = current - 1;
      }
      return next;
    });
  }, [setAllTimestamps, setSelectedSnippetIndexByTrack]);

  return {
    jump,
    handlePlayPause,
    handleSeekChange,
    handleSeekCommit,
    commitSeekPosition,
    readRingSeekPosition,
    handleModalRingPointerDown,
    handleModalRingPointerMove,
    handleModalRingPointerUp,
    handleShuffle,
    transitionIntoSnippetIfNeeded,
    handleRepeatCycle,
    handleSkipNext,
    handleSkipPrevious,
    handleQuickPlayPlaylist,
    handleSaveTimestamp,
    handleModalClip,
    handleSelectSnippet,
    resolvePlaybackPosition,
    playTrackWithMode,
    handleDelete,
  };
}
