"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getPlaybackIntent } from "../../lib/playback-intent";
import { buildTrackDetailModalModel } from "../../lib/track-detail-modal-model";
import { getTrackById } from "../../lib/snippet";
import { getPlayerRouteHintTrack } from "../../lib/player-route-hint";
import { useAppPlayback } from "../../contexts/AppPlaybackContext";
import { usePlaybackPosition } from "../../contexts/PlaybackPositionContext";
import { s } from "./homeStyles";
import { PlayerRouteSkeleton } from "./PlayerRouteSkeleton";
import { TrackDetailModalHero } from "./TrackDetailModalHero";
import { TrackDetailModalQueue } from "./TrackDetailModalQueue";
import { TrackDetailModalOverflowMenu } from "./TrackDetailModalOverflowMenu";
import { TrackDetailModalSnippetsPanel } from "./TrackDetailModalSnippetsPanel";

/** Resolves track + shows skeleton without subscribing to high-frequency playback position. */
export const TrackPlayerScreen = memo(function TrackPlayerScreen({ trackId }) {
  const router = useRouter();
  const pb = useAppPlayback();

  const [resolvedTrack, setResolvedTrack] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [loadingTrack, setLoadingTrack] = useState(true);
  const lastTrackIdRef = useRef(null);

  const {
    trackLookup,
    playerState,
    recentlyPlayedTracks,
    spotifyResults,
    withFreshToken,
    token,
    playerNavPrimedTrackRef,
  } = pb;

  const hintTrack = useMemo(
    () =>
      getPlayerRouteHintTrack(trackId, {
        primedRef: playerNavPrimedTrackRef,
        trackLookup,
        playerState,
        recentlyPlayedTracks,
        spotifyResults,
      }),
    [trackId, trackLookup, playerState?.id, recentlyPlayedTracks, spotifyResults, playerNavPrimedTrackRef]
  );

  useLayoutEffect(() => {
    if (!trackId) return;
    const primed = playerNavPrimedTrackRef?.current;
    if (primed?.id) {
      setResolvedTrack(primed);
      setLoadError(null);
      setLoadingTrack(false);
      lastTrackIdRef.current = primed.id;
      if (primed.id === trackId) playerNavPrimedTrackRef.current = null;
      return;
    }
    if (lastTrackIdRef.current === trackId) return;
    // In-player Up Next can set resolvedTrack before `?t=` / searchParams catch up.
    if (lastTrackIdRef.current && lastTrackIdRef.current !== trackId) return;
    lastTrackIdRef.current = trackId;
    const fromLookup = trackLookup[trackId];
    if (fromLookup) {
      setResolvedTrack(fromLookup);
      setLoadError(null);
      setLoadingTrack(false);
      return;
    }
    setLoadingTrack(false);
  }, [trackId, trackLookup, playerNavPrimedTrackRef]);

  const lookupTrack = trackId ? trackLookup[trackId] : null;

  useEffect(() => {
    if (!trackId) {
      setResolvedTrack(null);
      setLoadError("Missing track");
      setLoadingTrack(false);
      return;
    }

    if (resolvedTrack?.id === trackId && !loadError) {
      return;
    }

    let cancelled = false;

    if (lookupTrack) {
      setResolvedTrack(lookupTrack);
      setLoadError(null);
      setLoadingTrack(false);
      return;
    }

    const playbackIntentId = getPlaybackIntent();
    if (
      playerState?.id === trackId &&
      (!playbackIntentId || playbackIntentId === trackId)
    ) {
      setResolvedTrack({
        id: playerState.id,
        name: playerState.name,
        uri: playerState.uri,
        artists: playerState.artists,
        albumArt: playerState.albumArt,
        durationMs: playerState.durationMs,
      });
      setLoadError(null);
      setLoadingTrack(false);
      return;
    }

    const fromRecent = recentlyPlayedTracks?.find((t) => t.id === trackId);
    if (fromRecent) {
      setResolvedTrack(fromRecent);
      setLoadError(null);
      setLoadingTrack(false);
      return;
    }

    const fromSearch = spotifyResults?.find((t) => t.id === trackId);
    if (fromSearch) {
      setResolvedTrack(fromSearch);
      setLoadError(null);
      setLoadingTrack(false);
      return;
    }

    if (!token) {
      setResolvedTrack(null);
      setLoadError(null);
      setLoadingTrack(false);
      return;
    }

    setLoadingTrack(true);
    setLoadError(null);
    (async () => {
      try {
        const t = await withFreshToken((accessToken) => getTrackById(accessToken, trackId));
        if (cancelled) return;
        if (t) {
          setResolvedTrack(t);
          setLoadError(null);
        } else {
          setResolvedTrack(null);
          setLoadError("Track not found");
        }
      } catch (e) {
        if (cancelled) return;
        console.warn("[TrackPlayerScreen] getTrackById", e);
        setResolvedTrack(null);
        setLoadError("Could not load track");
      } finally {
        if (!cancelled) setLoadingTrack(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    trackId,
    lookupTrack,
    playerState?.id,
    recentlyPlayedTracks,
    spotifyResults,
    token,
    withFreshToken,
    resolvedTrack?.id,
    loadError,
  ]);

  const { setPlayerViewTrack } = pb;

  const syncViewToTrack = useCallback(
    (track) => {
      if (!track?.id) return;
      lastTrackIdRef.current = track.id;
      setResolvedTrack(track);
      setLoadingTrack(false);
      setLoadError(null);
      setPlayerViewTrack(track);
    },
    [setPlayerViewTrack]
  );

  if (!token) {
    return null;
  }

  const showSkeleton = loadingTrack && !resolvedTrack && !hintTrack;
  if (showSkeleton) {
    return <PlayerRouteSkeleton hintTrack={hintTrack ?? resolvedTrack} />;
  }

  if (loadError || !resolvedTrack) {
    return (
      <div style={{ ...s.playerPageRoot, padding: "2rem 1.25rem", textAlign: "center" }}>
        <p style={{ color: "rgba(255,255,255,0.85)", marginBottom: "1rem" }}>{loadError || "Unable to show this track."}</p>
        <button type="button" style={s.btnPrimary} onClick={() => router.push("/")}>
          Back home
        </button>
      </div>
    );
  }

  return (
    <TrackPlayerScreenBody
      trackId={trackId}
      resolvedTrack={resolvedTrack}
      syncViewToTrack={syncViewToTrack}
    />
  );
});

const TrackPlayerScreenBody = memo(function TrackPlayerScreenBody({
  trackId,
  resolvedTrack,
  syncViewToTrack,
}) {
  const router = useRouter();
  const pb = useAppPlayback();
  const { estimatedPos } = usePlaybackPosition();
  const estimatedPosBucket = Math.floor(estimatedPos / 1000);

  const {
    playerState,
    trackLookup,
    allTimestamps,
    playlistTracks,
    queueTracks,
    fallbackUpcomingTracks,
    previousPlayerTrack,
    selectedSnippetIndexByTrack,
    labelInput,
    setLabelInput,
    snippetModeEnabled,
    setSnippetModeEnabled,
    modalMenuOpen,
    setModalMenuOpen,
    modalMenuSnippetsOpen,
    setModalMenuSnippetsOpen,
    modalClipPressed,
    setModalClipPressed,
    modalClipSaved,
    modalClipNotice,
    handleModalClip,
    handleShuffle,
    handleSkipPrevious,
    handleSkipNext,
    handlePlayPause,
    handleRepeatCycle,
    handleSelectSnippet,
    handleSaveTimestamp,
    jump,
    resolvePlaybackPosition,
    playTrackWithMode,
    handleModalRingPointerDown,
    handleModalRingPointerMove,
    handleModalRingPointerUp,
  } = pb;

  const mergedLookup = useMemo(() => {
    if (!resolvedTrack?.id) return trackLookup;
    return { ...trackLookup, [resolvedTrack.id]: resolvedTrack };
  }, [trackLookup, resolvedTrack]);

  const model = useMemo(
    () =>
      buildTrackDetailModalModel({
        selectedTrack: resolvedTrack,
        playerState,
        trackLookup: mergedLookup,
        allTimestamps,
        playlistTracks,
        queueTracks,
        fallbackUpcomingTracks,
        previousPlayerTrack,
        selectedSnippetIndexByTrack,
        estimatedPos,
      }),
    [
      resolvedTrack,
      playerState,
      mergedLookup,
      allTimestamps,
      playlistTracks,
      queueTracks,
      fallbackUpcomingTracks,
      previousPlayerTrack,
      selectedSnippetIndexByTrack,
      estimatedPosBucket,
      playerState?.isPlaying,
    ]
  );

  const handleDismiss = useCallback(() => {
    pb.closePlayer?.();
  }, [pb]);

  const playUpNextTrack = useCallback(
    (track) => {
      if (!track?.id) return;
      pb.prefetchPlayerRoute?.();
      syncViewToTrack(track);
      playTrackWithMode(track);
      void pb.refreshPlayerSnapshot?.();
      pb.schedulePlayerRefresh?.(450);
      window.setTimeout(() => pb.refreshPlayerSnapshot?.(), 1100);
    },
    [pb, syncViewToTrack, playTrackWithMode]
  );

  const closeAfterSnippetPlay = useCallback(() => {
    router.push("/");
  }, [router]);

  const isCurrentTrack = model?.isCurrentTrack ?? false;
  const heroIsPlaying = model?.heroIsPlaying ?? false;
  const nextTrack = model?.nextTrack ?? null;
  const previousTrack = model?.previousTrack ?? null;

  const onRequestNext = useCallback(async () => {
    if (isCurrentTrack) {
      if (nextTrack) syncViewToTrack(nextTrack);
      await handleSkipNext();
      return;
    }
    if (nextTrack) {
      syncViewToTrack(nextTrack);
      playTrackWithMode(nextTrack);
      return;
    }
    await handleSkipNext();
  }, [isCurrentTrack, nextTrack, handleSkipNext, syncViewToTrack, playTrackWithMode]);

  const onRequestPrevious = useCallback(async () => {
    if (isCurrentTrack) {
      if (previousTrack) syncViewToTrack(previousTrack);
      await handleSkipPrevious();
      return;
    }
    if (previousTrack) {
      syncViewToTrack(previousTrack);
      playTrackWithMode(previousTrack);
      return;
    }
    await handleSkipPrevious();
  }, [isCurrentTrack, previousTrack, handleSkipPrevious, syncViewToTrack, playTrackWithMode]);

  if (!model) {
    return <PlayerRouteSkeleton hintTrack={resolvedTrack} />;
  }

  const {
    activeModalTrack,
    tss,
    selectedSnippetIndex,
    selectedSnippet,
    upcomingTracks,
    modalProgressMs,
    modalProgressPercent,
    modalProgressArcPath,
  } = model;

  return (
    <div style={s.playerPageRoot}>
      <div style={s.playerSheet}>

        <div style={s.playerScrollPane}>
          <div style={s.playerScrollInner}>
            <div style={s.modalAura} />
            <div style={s.playerViewport}>
              <TrackDetailModalHero
                variant="player"
                activeModalTrack={activeModalTrack}
                isCurrentTrack={isCurrentTrack}
                heroIsPlaying={heroIsPlaying}
                playerState={playerState}
                previousTrack={previousTrack}
                nextTrack={nextTrack}
                modalProgressArcPath={modalProgressArcPath}
                modalProgressPercent={modalProgressPercent}
                modalProgressMs={modalProgressMs}
                handleModalRingPointerDown={handleModalRingPointerDown}
                handleModalRingPointerMove={handleModalRingPointerMove}
                handleModalRingPointerUp={handleModalRingPointerUp}
                handleShuffle={handleShuffle}
                handleSkipPrevious={handleSkipPrevious}
                handleSkipNext={handleSkipNext}
                handlePlayPause={handlePlayPause}
                handleRepeatCycle={handleRepeatCycle}
                jump={jump}
                resolvePlaybackPosition={resolvePlaybackPosition}
                onDismiss={handleDismiss}
                estimatedPos={estimatedPos}
                modalClipPressed={modalClipPressed}
                setModalClipPressed={setModalClipPressed}
                modalClipSaved={modalClipSaved}
                modalClipNotice={modalClipNotice}
                handleModalClip={handleModalClip}
                onRequestNext={onRequestNext}
                onRequestPrevious={onRequestPrevious}
              />
            </div>

            <TrackDetailModalQueue
              upcomingTracks={upcomingTracks}
              setModalMenuOpen={setModalMenuOpen}
              setModalMenuSnippetsOpen={setModalMenuSnippetsOpen}
              onPrefetchTrack={pb.prefetchPlayerRoute}
              playTrackWithMode={playUpNextTrack}
            />
          </div>
        </div>

        {(isCurrentTrack || tss.length > 0) && (
          <div style={s.playerSnippetDock}>
            <TrackDetailModalSnippetsPanel
              isCurrentTrack={isCurrentTrack}
              tss={tss}
              activeModalTrack={activeModalTrack}
              estimatedPos={estimatedPos}
              labelInput={labelInput}
              setLabelInput={setLabelInput}
              handleSaveTimestamp={handleSaveTimestamp}
              snippetModeEnabled={snippetModeEnabled}
              selectedSnippetIndex={selectedSnippetIndex}
              selectedSnippet={selectedSnippet}
              handleSelectSnippet={handleSelectSnippet}
              jump={jump}
              onRequestClose={closeAfterSnippetPlay}
            />
          </div>
        )}
      </div>

      {modalMenuOpen && (
        <TrackDetailModalOverflowMenu
          activeModalTrack={activeModalTrack}
          snippetModeEnabled={snippetModeEnabled}
          setSnippetModeEnabled={setSnippetModeEnabled}
          modalMenuSnippetsOpen={modalMenuSnippetsOpen}
          setModalMenuSnippetsOpen={setModalMenuSnippetsOpen}
          setModalMenuOpen={setModalMenuOpen}
          tss={tss}
          selectedSnippetIndex={selectedSnippetIndex}
          handleSelectSnippet={handleSelectSnippet}
        />
      )}
    </div>
  );
});
