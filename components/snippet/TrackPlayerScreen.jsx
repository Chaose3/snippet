"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { buildTrackDetailModalModel } from "../../lib/track-detail-modal-model";
import { getTrackById } from "../../lib/snippet";
import { useAppPlayback } from "../../contexts/AppPlaybackContext";
import { s } from "./homeStyles";
import { PlayerRouteSkeleton } from "./PlayerRouteSkeleton";
import { TrackDetailModalHeader } from "./TrackDetailModalHeader";
import { TrackDetailModalHero } from "./TrackDetailModalHero";
import { TrackDetailModalQueue } from "./TrackDetailModalQueue";
import { TrackDetailModalOverflowMenu } from "./TrackDetailModalOverflowMenu";
import { TrackDetailModalSnippetsPanel } from "./TrackDetailModalSnippetsPanel";

export const TrackPlayerScreen = memo(function TrackPlayerScreen({ trackId }) {
  const router = useRouter();
  const pb = useAppPlayback();

  const [resolvedTrack, setResolvedTrack] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [loadingTrack, setLoadingTrack] = useState(true);

  const {
    playerState,
    trackLookup,
    allTimestamps,
    playlistTracks,
    queueTracks,
    fallbackUpcomingTracks,
    previousPlayerTrack,
    selectedSnippetIndexByTrack,
    estimatedPos,
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
    recentlyPlayedTracks,
    spotifyResults,
    withFreshToken,
    token,
  } = pb;

  const playerNavPrimedTrackRef = pb.playerNavPrimedTrackRef;

  useLayoutEffect(() => {
    if (!trackId) return;
    const primed = playerNavPrimedTrackRef?.current;
    if (primed?.id === trackId) {
      playerNavPrimedTrackRef.current = null;
      setResolvedTrack(primed);
      setLoadError(null);
      setLoadingTrack(false);
      return;
    }
    const fromLookup = trackLookup[trackId];
    if (fromLookup) {
      setResolvedTrack(fromLookup);
      setLoadError(null);
      setLoadingTrack(false);
    }
  }, [trackId, trackLookup, playerNavPrimedTrackRef]);

  useEffect(() => {
    if (!trackId) {
      setResolvedTrack(null);
      setLoadError("Missing track");
      setLoadingTrack(false);
      return;
    }

    let cancelled = false;

    const fromLookup = trackLookup[trackId];
    if (fromLookup) {
      setResolvedTrack(fromLookup);
      setLoadError(null);
      setLoadingTrack(false);
      return;
    }

    if (playerState?.id === trackId) {
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
  }, [trackId, trackLookup, playerState, recentlyPlayedTracks, spotifyResults, token, withFreshToken]);

  const mergedLookup = useMemo(() => {
    if (!resolvedTrack?.id) return trackLookup;
    return { ...trackLookup, [resolvedTrack.id]: resolvedTrack };
  }, [trackLookup, resolvedTrack]);

  const model = useMemo(
    () =>
      resolvedTrack
        ? buildTrackDetailModalModel({
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
          })
        : null,
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
      estimatedPos,
    ]
  );

  const handleDismiss = useCallback(() => {
    setModalMenuOpen(false);
    setModalMenuSnippetsOpen(false);
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }, [router, setModalMenuOpen, setModalMenuSnippetsOpen]);

  const navigateToTrack = useCallback(
    (track) => {
      if (!track?.id) return;
      if (pb.playerNavPrimedTrackRef) pb.playerNavPrimedTrackRef.current = track;
      router.prefetch(`/player/${track.id}`);
      router.push(`/player/${track.id}`);
    },
    [router, pb.playerNavPrimedTrackRef]
  );

  const closeAfterSnippetPlay = useCallback(() => {
    router.push("/");
  }, [router]);

  if (!token) {
    return null;
  }

  const trackMismatch = Boolean(trackId && resolvedTrack?.id && resolvedTrack.id !== trackId);
  if (loadingTrack || trackMismatch) {
    return <PlayerRouteSkeleton />;
  }

  if (loadError || !resolvedTrack || !model) {
    return (
      <div style={{ ...s.playerPageRoot, padding: "2rem 1.25rem", textAlign: "center" }}>
        <p style={{ color: "rgba(255,255,255,0.85)", marginBottom: "1rem" }}>{loadError || "Unable to show this track."}</p>
        <button type="button" style={s.btnPrimary} onClick={() => router.push("/")}>
          Back home
        </button>
      </div>
    );
  }

  const {
    activeModalTrack,
    isCurrentTrack,
    tss,
    selectedSnippetIndex,
    selectedSnippet,
    upcomingTracks,
    previousTrack,
    nextTrack,
    modalProgressMs,
    modalProgressPercent,
    modalProgressArcPath,
  } = model;

  return (
    <div style={s.playerPageRoot}>
      <div style={s.playerSheet}>
        <div style={s.playerTopChrome}>
          <TrackDetailModalHeader
            onDismiss={handleDismiss}
            estimatedPos={estimatedPos}
            modalClipPressed={modalClipPressed}
            setModalClipPressed={setModalClipPressed}
            modalClipSaved={modalClipSaved}
            modalClipNotice={modalClipNotice}
            handleModalClip={handleModalClip}
          />
        </div>

        <div style={s.playerScrollPane}>
          <div style={s.playerScrollInner}>
            <div style={s.modalAura} />
            <div style={s.playerViewport}>
              <TrackDetailModalHero
                variant="player"
                activeModalTrack={activeModalTrack}
                isCurrentTrack={isCurrentTrack}
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
              />
            </div>

            <TrackDetailModalQueue
              upcomingTracks={upcomingTracks}
              setModalMenuOpen={setModalMenuOpen}
              setModalMenuSnippetsOpen={setModalMenuSnippetsOpen}
              onNavigateToTrack={navigateToTrack}
              onPrefetchTrack={pb.prefetchPlayerRoute}
              playTrackWithMode={playTrackWithMode}
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
