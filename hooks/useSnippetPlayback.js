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
import { saveTimestamp, deleteTimestamp, deleteAllTimestampsForTrack, formatMs } from "../lib/timestamps";
import {
  getStoredToken,
  STORAGE_KEY,
  STORAGE_REFRESH,
  STORAGE_EXPIRES,
} from "../lib/auth-storage";
import { getNativeSpotifyBridge, isNativeCapacitor } from "../lib/capacitor/platform";
import { openSpotifyExternal } from "../lib/capacitor/open-spotify-external";
import { startNativeSpotifyPlayback } from "../lib/capacitor/native-play-track";
import { isAppRemoteConnected } from "../lib/capacitor/native-player-state";
import {
  clearPlaybackIntent,
  setPlaybackIntent,
} from "../lib/playback-intent";
import { trackIdFromSpotifyUri } from "../lib/spotify-web-play";
import { webSdkReportsPlaying } from "../lib/web-spotify-playback";
import { MAX_SNIPPETS_PER_TRACK } from "../lib/snippet-ui-utils";
import { rememberPlaybackContext, withPlaybackContext } from "../lib/playback-context";

export function useSnippetPlayback({
  setToken,
  doRefresh,
  withFreshToken,
  isNativeApp,
  webPlayerId,
  webPlayerError,
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
  schedulePlayerRefresh,
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
  trackLookup = {},
  playlistTracks = {},
}) {
  const ensureBrowserPlaybackDevice = useCallback(async () => {
    if (isNativeApp || isNativeCapacitor() || typeof window === "undefined") return null;
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
      const rawContext =
        typeof trackOrUri === "object" && trackOrUri ? trackOrUri : playbackContext;
      const contextSource = rawContext
        ? withPlaybackContext(rawContext, { trackLookup, playlistTracks, playerState })
        : null;
      if (!trackUri || trackUri.startsWith("spotify:local:")) return;

      if (contextSource?.contextUri) {
        rememberPlaybackContext(contextSource.contextUri);
      }

      const intentTrackId = contextSource?.id ?? trackIdFromSpotifyUri(trackUri);
      if (intentTrackId) setPlaybackIntent(intentTrackId, contextSource);

      const openSpotifyWebInNewTab = () => openSpotifyExternal(trackUri, positionMs);

      /** Web: new tab. Native: Spotify app via UIApplication (never Capacitor Browser). */
      const openSpotifyWebIfBrowser = async () => {
        if (isNativeCapacitor()) return;
        const result = await openSpotifyWebInNewTab();
        if (result === "blocked") {
          alert(
            "Pop-up blocked. Allow pop-ups for this site so Spotify can open in a new tab while Snippet stays open."
          );
        } else if (result === "failed" || result === "no-url") {
          alert("Couldn’t open Spotify from the app. Open the Spotify app on this device and try again.");
        }
      };

      /** Real web only: in the Capacitor shell there is no tab/pop-up model; use native Spotify / Browser only on explicit errors. */
      const maybeOpenSpotifyWebAfterApiPlay = async () => {
        if (isNativeApp || isNativeCapacitor()) return;
        let shouldOpen = Boolean(!webPlayerIdRef.current || webPlayerError);
        if (!shouldOpen) {
          await new Promise((r) => setTimeout(r, 450));
          shouldOpen = !(await webSdkReportsPlaying(sdkPlayerRef));
        }
        if (shouldOpen) {
          await openSpotifyWebIfBrowser();
        }
      };

      const buildPlayRequest = (accessToken, targetDevice) => ({
        trackUri,
        positionMs,
        deviceId: targetDevice,
        contextUri: contextSource?.contextUri ?? null,
        offsetUri: contextSource?.offsetUri ?? null,
        offsetPosition: contextSource?.offsetPosition,
      });

      const applyLocalPlayingState = () => {
        lastPollRef.current = { time: Date.now(), positionMs, isPlaying: true };
        setEstimatedPos(positionMs);
      };

      const applyOptimisticNowPlaying = () => {
        const track = contextSource;
        if (!track?.id || !setPlayerState) return;
        setPlayerState((prev) => {
          if (prev?.id === track.id && prev.isPlaying) {
            return { ...prev, positionMs, isPlaying: true };
          }
          return {
            id: track.id,
            name: track.name ?? prev?.name ?? "",
            uri: track.uri ?? trackUri,
            artists: track.artists ?? prev?.artists ?? "",
            albumArt: track.albumArt ?? prev?.albumArt ?? null,
            durationMs: track.durationMs ?? prev?.durationMs ?? 0,
            positionMs,
            isPlaying: true,
            shuffle: prev?.shuffle ?? false,
            repeatMode: prev?.repeatMode ?? "off",
            volumePercent: prev?.volumePercent ?? 100,
          };
        });
      };

      const afterPlayStarted = ({ optimistic = true } = {}) => {
        if (optimistic) {
          applyLocalPlayingState();
          applyOptimisticNowPlaying();
        }
        refreshPlayerSnapshot?.().catch((err) => {
          console.warn("[jump] refreshPlayerSnapshot failed", err);
        });
        schedulePlayerRefresh?.(optimistic ? 350 : 700);
      };

      const revertOptimisticPlay = () => {
        if (!intentTrackId || !setPlayerState) return;
        setPlayerState((prev) =>
          prev?.id === intentTrackId ? { ...prev, isPlaying: false } : prev
        );
        if (lastPollRef.current) lastPollRef.current.isPlaying = false;
      };

      if (intentTrackId && contextSource?.id) {
        applyLocalPlayingState();
        applyOptimisticNowPlaying();
      }

      const t = getStoredToken();

      /** iOS/Android: Web API on phone when active; App Remote if connected; open Spotify only to wake. */
      if (isNativeCapacitor()) {
        const result = await startNativeSpotifyPlayback(trackUri, positionMs, {
          withFreshToken,
          contextSource,
        });
        if (result === "remote" || result === "api") {
          afterPlayStarted({ optimistic: true });
        } else if (result === "external") {
          revertOptimisticPlay();
          afterPlayStarted({ optimistic: false });
        } else if (result === "premium") {
          clearPlaybackIntent(intentTrackId);
          alert("Spotify Premium is required for playback control.");
        } else {
          revertOptimisticPlay();
          clearPlaybackIntent(intentTrackId);
          console.warn("[jump] native playback failed", trackUri);
          alert("Couldn’t start playback. Open the Spotify app once, then try again.");
        }
        return;
      }

      if (!t) {
        revertOptimisticPlay();
        clearPlaybackIntent(intentTrackId);
        return;
      }
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
      const request = buildPlayRequest(t, targetDevice);
      const res = await playSnippet(t, request);
      if (res.status === 204 || res.ok) {
        afterPlayStarted();
        await maybeOpenSpotifyWebAfterApiPlay();
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
          afterPlayStarted();
          await maybeOpenSpotifyWebAfterApiPlay();
          return;
        }
        if (retry.status === 403) {
          alert("Spotify Premium is required for playback control.");
          return;
        }
        if (retry.status === 404) {
          setDeviceId(null);
          fetchDevices();
          await openSpotifyWebIfBrowser();
          return;
        }
        await openSpotifyWebIfBrowser();
        return;
      }
      if (res.status === 404) {
        setDeviceId(null);
        fetchDevices();
        await openSpotifyWebIfBrowser();
        return;
      }
      if (res.status === 403) {
        alert("Spotify Premium is required for playback control.");
        return;
      }
      await openSpotifyWebIfBrowser();
    },
    [
      deviceId,
      doRefresh,
      ensureBrowserPlaybackDevice,
      fetchDevices,
      isNativeApp,
      playerState,
      lastPollRef,
      refreshPlayerSnapshot,
      schedulePlayerRefresh,
      setEstimatedPos,
      setPlayerState,
      setToken,
      webPlayerError,
      webPlayerIdRef,
      sdkPlayerRef,
      trackLookup,
      playlistTracks,
    ]
  );

  const handlePlayPause = useCallback(async () => {
    if (!playerState) return;
    const nativeSpotifyBridge = getNativeSpotifyBridge();
    const useAppRemote = nativeSpotifyBridge && (await isAppRemoteConnected());
    if (useAppRemote) {
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
        await withFreshToken((accessToken) => pausePlayback(accessToken));
      } else {
        await withFreshToken((accessToken) => resumePlayback(accessToken));
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
  }, [playerState, setPlayerState, lastPollRef, withFreshToken]);

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
      const useAppRemote = nativeSpotifyBridge && (await isAppRemoteConnected());
      if (useAppRemote && nativeSpotifyBridge.seek) {
        await nativeSpotifyBridge.seek({ positionMs: posMs }).catch((err) => {
          console.warn("[nativeSpotifyBridge.seek] failed", err);
        });
      } else {
        const t = getStoredToken();
        if (t) await withFreshToken((accessToken) => seekToPosition(accessToken, posMs));
      }
      if (lastPollRef.current) {
        lastPollRef.current.positionMs = posMs;
        lastPollRef.current.time = Date.now();
      }
      isSeekingRef.current = false;
    },
    [isSeekingRef, lastPollRef, withFreshToken]
  );

  const commitSeekPosition = useCallback(
    async (posMs) => {
      const clamped = Math.max(0, Math.floor(posMs));
      const nativeSpotifyBridge = getNativeSpotifyBridge();
      const useAppRemote = nativeSpotifyBridge && (await isAppRemoteConnected());
      if (useAppRemote && nativeSpotifyBridge.seek) {
        await nativeSpotifyBridge.seek({ positionMs: clamped }).catch((err) => {
          console.warn("[nativeSpotifyBridge.seek] failed", err);
        });
      } else {
        const t = getStoredToken();
        if (t) await withFreshToken((accessToken) => seekToPosition(accessToken, clamped));
      }
      if (lastPollRef.current) {
        lastPollRef.current.positionMs = clamped;
        lastPollRef.current.time = Date.now();
      }
      setEstimatedPos(clamped);
      isSeekingRef.current = false;
    },
    [isSeekingRef, lastPollRef, setEstimatedPos, withFreshToken]
  );

  const pointerOnRingBand = useCallback((event) => {
    if (event.target instanceof Element && event.target.closest("[data-disc-center]")) {
      return false;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const rx = rect.width / 2 || 1;
    const ry = rect.height / 2 || 1;
    const normDist = Math.hypot((event.clientX - cx) / rx, (event.clientY - cy) / ry);
    return normDist >= 0.34 && normDist <= 1.02;
  }, []);

  const readRingSeekPosition = useCallback((event, durationMs) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = event.clientX - cx;
    const dy = event.clientY - cy;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const normalized = (angle + 360 + 90) % 360;
    const progress = normalized / 360;
    return progress * Math.max(durationMs || 1, 1);
  }, []);

  const handleModalRingPointerDown = useCallback(
    (event, durationMs) => {
      if (!durationMs || !pointerOnRingBand(event)) return;
      const posMs = readRingSeekPosition(event, durationMs);
      modalRingSeekRef.current = { active: true, lastPosMs: posMs };
      isSeekingRef.current = true;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      event.preventDefault();
      setEstimatedPos(posMs);
    },
    [isSeekingRef, modalRingSeekRef, pointerOnRingBand, readRingSeekPosition, setEstimatedPos]
  );

  const handleModalRingPointerMove = useCallback(
    (event, durationMs) => {
      const ring = modalRingSeekRef.current;
      if (!ring.active || !durationMs) return;
      const posMs = readRingSeekPosition(event, durationMs);
      ring.lastPosMs = posMs;
      setEstimatedPos(posMs);
    },
    [modalRingSeekRef, readRingSeekPosition, setEstimatedPos]
  );

  const handleModalRingPointerUp = useCallback(
    async (event, durationMs) => {
      const ring = modalRingSeekRef.current;
      if (!ring.active || !durationMs) return;
      ring.active = false;
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      const posMs = ring.lastPosMs ?? readRingSeekPosition(event, durationMs);
      await commitSeekPosition(posMs);
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
        const pollAttempts = isNativeCapacitor() ? 4 : 5;
        const pollDelayMs = isNativeCapacitor() ? 400 : 180;
        for (let attempt = 0; attempt < pollAttempts; attempt += 1) {
          const snapshot = await refreshPlayerSnapshot();
          nextState = snapshot?.state ?? null;
          if (nextState?.id && (!previousTrackId || nextState.id !== previousTrackId)) break;
          await new Promise((resolve) => setTimeout(resolve, pollDelayMs));
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
      // Native: device IDs can be stale/wrong (e.g. web player). Let Spotify choose the active device.
      startPlayback: () => skipToNext(t, isNativeCapacitor() ? null : playbackTargetDevice),
    });
  }, [playbackTargetDevice, playerState?.id, transitionIntoSnippetIfNeeded]);

  const handleSkipPrevious = useCallback(async () => {
    const t = getStoredToken();
    if (!t) return;
    // Native: device IDs can be stale/wrong (e.g. web player). Let Spotify choose the active device.
    await skipToPrevious(t, isNativeCapacitor() ? null : playbackTargetDevice);
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

  const primePlaybackTrack = useCallback(
    (track, positionMs = 0) => {
      if (!track?.id || !setPlayerState) return;
      setPlaybackIntent(track.id, track);
      lastPollRef.current = { time: Date.now(), positionMs, isPlaying: true };
      setEstimatedPos(positionMs);
      setPlayerState((prev) => {
        if (prev?.id === track.id && prev.isPlaying) {
          return { ...prev, positionMs, isPlaying: true };
        }
        return {
          id: track.id,
          name: track.name ?? prev?.name ?? "",
          uri: track.uri ?? prev?.uri ?? null,
          artists: track.artists ?? prev?.artists ?? "",
          albumArt: track.albumArt ?? prev?.albumArt ?? null,
          durationMs: track.durationMs ?? prev?.durationMs ?? 0,
          positionMs,
          isPlaying: true,
          shuffle: prev?.shuffle ?? false,
          repeatMode: prev?.repeatMode ?? "off",
          volumePercent: prev?.volumePercent ?? 100,
        };
      });
    },
    [setPlayerState, setEstimatedPos, lastPollRef]
  );

  const playTrackWithMode = useCallback(
    (track) => {
      if (!track?.uri || !track?.id) return;
      const contextual = withPlaybackContext(track, {
        trackLookup,
        playlistTracks,
        playerState,
      });
      const positionMs = resolvePlaybackPosition(track.id, 0);
      primePlaybackTrack(contextual, positionMs);
      jump(contextual, positionMs, contextual);
    },
    [jump, resolvePlaybackPosition, primePlaybackTrack, trackLookup, playlistTracks, playerState]
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

  const handleDeleteTrackGroup = useCallback(async (trackId) => {
    const t = getStoredToken();
    if (!t || !trackId) return false;
    const updated = await deleteAllTimestampsForTrack(t, trackId);
    if (updated === null) return false;
    setAllTimestamps((prev) => {
      const next = { ...prev };
      delete next[trackId];
      return next;
    });
    setSelectedSnippetIndexByTrack((prev) => {
      const next = { ...prev };
      delete next[trackId];
      return next;
    });
    return true;
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
    primePlaybackTrack,
    playTrackWithMode,
    handleDelete,
    handleDeleteTrackGroup,
  };
}
