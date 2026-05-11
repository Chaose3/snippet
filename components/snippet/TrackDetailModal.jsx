"use client";

import { memo, useMemo } from "react";
import { buildTrackDetailModalModel } from "../../lib/track-detail-modal-model";
import { s } from "./homeStyles";
import { TrackDetailModalHeader } from "./TrackDetailModalHeader";
import { TrackDetailModalHero } from "./TrackDetailModalHero";
import { TrackDetailModalQueue } from "./TrackDetailModalQueue";
import { TrackDetailModalOverflowMenu } from "./TrackDetailModalOverflowMenu";
import { TrackDetailModalSnippetsPanel } from "./TrackDetailModalSnippetsPanel";

export const TrackDetailModal = memo(function TrackDetailModal({
  selectedTrack,
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
  setSelectedTrack,
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
}) {
  const model = useMemo(
    () =>
      buildTrackDetailModalModel({
        selectedTrack,
        playerState,
        trackLookup,
        allTimestamps,
        playlistTracks,
        queueTracks,
        fallbackUpcomingTracks,
        previousPlayerTrack,
        selectedSnippetIndexByTrack,
        estimatedPos,
      }),
    [
      selectedTrack,
      playerState,
      trackLookup,
      allTimestamps,
      playlistTracks,
      queueTracks,
      fallbackUpcomingTracks,
      previousPlayerTrack,
      selectedSnippetIndexByTrack,
      estimatedPos,
    ]
  );

  if (!selectedTrack || !model) return null;

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

  const dismiss = () => {
    setModalMenuOpen(false);
    setModalMenuSnippetsOpen(false);
    setSelectedTrack(null);
  };

  return (
    <div style={s.modalOverlay} onClick={dismiss}>
      <div style={s.modalSheet} onClick={(e) => e.stopPropagation()}>
        <div style={s.modalAura} />
        <div style={s.modalViewport}>
          <TrackDetailModalHeader
            onDismiss={dismiss}
            estimatedPos={estimatedPos}
            modalClipPressed={modalClipPressed}
            setModalClipPressed={setModalClipPressed}
            modalClipSaved={modalClipSaved}
            modalClipNotice={modalClipNotice}
            handleModalClip={handleModalClip}
          />

          <TrackDetailModalHero
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
          setSelectedTrack={setSelectedTrack}
          playTrackWithMode={playTrackWithMode}
        />

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
          setSelectedTrack={setSelectedTrack}
        />
      </div>
    </div>
  );
});
