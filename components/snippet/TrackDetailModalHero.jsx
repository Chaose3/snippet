"use client";

import { memo, useCallback, useRef } from "react";
import { formatMs } from "../../lib/timestamps";
import { s } from "./homeStyles";
import { ModalSnipButton } from "./ModalSnipButton";
import { PlayerDiscStage } from "./PlayerDiscStage";

export const TrackDetailModalHero = memo(function TrackDetailModalHero({
  variant = "modal",
  activeModalTrack,
  isCurrentTrack,
  playerState,
  previousTrack,
  nextTrack,
  modalProgressArcPath,
  modalProgressPercent,
  modalProgressMs,
  handleModalRingPointerDown,
  handleModalRingPointerMove,
  handleModalRingPointerUp,
  handleShuffle,
  handleSkipPrevious,
  handleSkipNext,
  handlePlayPause,
  handleRepeatCycle,
  jump,
  resolvePlaybackPosition,
  onDismiss,
  estimatedPos,
  modalClipPressed,
  setModalClipPressed,
  modalClipSaved,
  modalClipNotice,
  handleModalClip,
  onRequestNext: onRequestNextProp,
  onRequestPrevious: onRequestPreviousProp,
}) {
  const discStageRef = useRef(null);
  const onRequestNext = onRequestNextProp ?? handleSkipNext;
  const onRequestPrevious = onRequestPreviousProp ?? handleSkipPrevious;
  const isPlayer = variant === "player";
  const heroStyle = isPlayer ? s.playerHero : s.modalHero;
  const discStageStyle = isPlayer ? s.playerDiscStage : s.modalDiscStage;
  const transportStyle = isPlayer ? s.playerTransport : s.modalTransport;
  const showPlayerToolbar = isPlayer && typeof onDismiss === "function";

  const canGoNext = Boolean(onRequestNext);
  const canGoPrevious = Boolean(onRequestPrevious);

  const onSkipNextPress = useCallback(() => {
    if (discStageRef.current?.slideNext) {
      void discStageRef.current.slideNext();
      return;
    }
    void onRequestNext?.();
  }, [onRequestNext]);

  const onSkipPreviousPress = useCallback(() => {
    if (discStageRef.current?.slidePrevious) {
      void discStageRef.current.slidePrevious();
      return;
    }
    void onRequestPrevious?.();
  }, [onRequestPrevious]);

  return (
    <div style={heroStyle}>
      {showPlayerToolbar ? (
        <div style={s.playerMetaRow}>
          <button type="button" style={s.playerMetaClose} onClick={onDismiss} aria-label="Close player">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <div style={s.playerMetaCenter}>
            <p style={s.playerMetaTitle}>{activeModalTrack.name}</p>
            {activeModalTrack.artists ? <p style={s.playerMetaArtist}>{activeModalTrack.artists}</p> : null}
          </div>
          <ModalSnipButton
            estimatedPos={estimatedPos}
            modalClipPressed={modalClipPressed}
            setModalClipPressed={setModalClipPressed}
            modalClipSaved={modalClipSaved}
            modalClipNotice={modalClipNotice}
            handleModalClip={handleModalClip}
          />
        </div>
      ) : (
        <div style={s.modalMetaRow}>
          <div>
            <p style={s.modalTrackName}>{activeModalTrack.name}</p>
            <p style={s.modalArtist}>{activeModalTrack.artists}</p>
          </div>
        </div>
      )}

      <PlayerDiscStage
        ref={discStageRef}
        stageStyle={discStageStyle}
        activeTrackId={activeModalTrack?.id}
        enableTrackSwipe={!(isPlayer && isCurrentTrack)}
        previousTrack={previousTrack}
        nextTrack={nextTrack}
        canGoNext={canGoNext}
        canGoPrevious={canGoPrevious}
        onRequestNext={onRequestNext}
        onRequestPrevious={onRequestPrevious}
      >
        <div style={s.modalDiscOuter}>
          <div style={s.modalProgressStack}>
          {isCurrentTrack && (
            <div
              data-ring-seek
              style={s.modalProgressHitArea}
              onPointerDown={(event) => handleModalRingPointerDown(event, activeModalTrack.durationMs)}
              onPointerMove={(event) => handleModalRingPointerMove(event, activeModalTrack.durationMs)}
              onPointerUp={(event) => handleModalRingPointerUp(event, activeModalTrack.durationMs)}
              onPointerCancel={(event) => handleModalRingPointerUp(event, activeModalTrack.durationMs)}
            />
          )}
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid meet"
            style={s.modalProgressRing}
            aria-hidden="true"
          >
            <path d={modalProgressArcPath} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1.8" />
            <path
              d={modalProgressArcPath}
              fill="none"
              stroke="rgba(146, 196, 255, 0.98)"
              strokeWidth="1.8"
              strokeLinecap="round"
              pathLength="100"
              strokeDasharray={`${modalProgressPercent} 100`}
              style={s.modalProgressActive}
            />
          </svg>
          </div>
          <div style={s.modalDiscInner}>
            <div style={s.modalDiscCenter} data-disc-center>
              {activeModalTrack.albumArt ? (
                <img src={activeModalTrack.albumArt} alt="" style={s.modalArt} draggable={false} />
              ) : (
                <div style={s.modalArtFallback} />
              )}
            </div>
          </div>
          <div style={s.modalDiscTime}>{formatMs(modalProgressMs)}</div>
        </div>
      </PlayerDiscStage>

      <div style={transportStyle}>
        <button
          style={{
            ...s.modalTransportBtn,
            ...(playerState?.shuffle ? s.modalTransportBtnActive : {}),
          }}
          onClick={handleShuffle}
          aria-label="Shuffle"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7h2.5l9 10H20" />
            <path d="M20 17l-2.8 2.8" />
            <path d="M20 17l-2.8-2.8" />
            <path d="M4 17h2.5l3.3-3.7" />
            <path d="M20 7h-4.5l-2.2 2.4" />
            <path d="M20 7l-2.8 2.8" />
            <path d="M20 7l-2.8-2.8" />
          </svg>
        </button>
        <button style={s.modalTransportBtn} onClick={onSkipPreviousPress} aria-label="Previous track">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 5h2v14H6zM18 5 8.5 12 18 19z" />
          </svg>
        </button>
        <button
          className={!isCurrentTrack || !playerState?.isPlaying ? "play-pulse" : undefined}
          style={s.modalTransportPrimary}
          onClick={() => {
            if (isCurrentTrack) {
              handlePlayPause();
              return;
            }
            jump(activeModalTrack, resolvePlaybackPosition(activeModalTrack.id, 0), activeModalTrack);
          }}
          aria-label={isCurrentTrack && playerState?.isPlaying ? "Pause" : "Play"}
        >
          {isCurrentTrack && playerState?.isPlaying ? (
            <span style={{ letterSpacing: "3px", fontSize: "1.45rem" }}>❙❙</span>
          ) : (
            <svg viewBox="0 0 512 512" width="26" height="26" fill="currentColor" style={{ marginLeft: 4 }}>
              <path d="M424.4 214.7L72.4 6.6C43.8-10.3 0 6.1 0 47.9V464c0 37.5 40.7 60.1 72.4 41.3l352-208c31.4-18.5 31.5-64.1 0-82.6z" />
            </svg>
          )}
        </button>
        <button style={s.modalTransportBtn} onClick={onSkipNextPress} aria-label="Next track">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 5h2v14h-2zM6 5l9.5 7L6 19z" />
          </svg>
        </button>
        <button
          style={{
            ...s.modalTransportBtn,
            ...(playerState?.repeatMode !== "off" ? s.modalTransportBtnActive : {}),
          }}
          onClick={handleRepeatCycle}
          aria-label={`Repeat mode ${playerState?.repeatMode ?? "off"}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3v4h4" />
            <path d="M20.5 7H9a5 5 0 0 0-5 5" />
            <path d="M7 21v-4H3" />
            <path d="M3.5 17H15a5 5 0 0 0 5-5" />
          </svg>
          {playerState?.repeatMode === "track" && <span style={s.repeatBadge}>1</span>}
        </button>
      </div>
    </div>
  );
});
