"use client";

import { memo } from "react";
import { formatMs } from "../../lib/timestamps";
import { s } from "./homeStyles";

export const TrackDetailModalHero = memo(function TrackDetailModalHero({
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
}) {
  return (
    <div style={s.modalHero}>
      <div style={s.modalMetaRow}>
        <div>
          <p style={s.modalTrackName}>{activeModalTrack.name}</p>
          <p style={s.modalArtist}>{activeModalTrack.artists}</p>
        </div>
      </div>

      <div style={s.modalDiscStage}>
        <div style={{ ...s.modalSideArt, ...s.modalSideArtLeft }}>
          {previousTrack?.albumArt ? (
            <>
              <img src={previousTrack.albumArt} alt="" style={s.modalSideArtImage} />
              <div style={{ ...s.modalSideArtGlass, ...s.modalSideArtGlassLeft }} />
            </>
          ) : (
            <div style={s.modalSideArtFallback} />
          )}
        </div>
        <div style={{ ...s.modalSideArt, ...s.modalSideArtRight }}>
          {nextTrack?.albumArt ? (
            <>
              <img src={nextTrack.albumArt} alt="" style={s.modalSideArtImage} />
              <div style={{ ...s.modalSideArtGlass, ...s.modalSideArtGlassRight }} />
            </>
          ) : (
            <div style={s.modalSideArtFallback} />
          )}
        </div>
        <div style={s.modalDiscOuter}>
          {isCurrentTrack && (
            <div
              style={s.modalProgressHitArea}
              onPointerDown={(event) => handleModalRingPointerDown(event, activeModalTrack.durationMs)}
              onPointerMove={(event) => handleModalRingPointerMove(event, activeModalTrack.durationMs)}
              onPointerUp={(event) => handleModalRingPointerUp(event, activeModalTrack.durationMs)}
              onPointerCancel={(event) => handleModalRingPointerUp(event, activeModalTrack.durationMs)}
            />
          )}
          <svg viewBox="0 0 100 100" style={s.modalProgressRing} aria-hidden="true">
            <path
              d={modalProgressArcPath}
              fill="none"
              stroke="rgba(255,255,255,0.14)"
              strokeWidth="1.8"
            />
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
          <div style={s.modalDiscInner}>
            <div style={s.modalDiscCenter}>
              {activeModalTrack.albumArt ? (
                <img src={activeModalTrack.albumArt} alt="" style={s.modalArt} />
              ) : (
                <div style={s.modalArtFallback} />
              )}
            </div>
          </div>
          <div style={s.modalDiscTime}>{formatMs(modalProgressMs)}</div>
        </div>
      </div>

      <div style={s.modalTransport}>
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
        <button style={s.modalTransportBtn} onClick={handleSkipPrevious} aria-label="Previous track">
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
        <button style={s.modalTransportBtn} onClick={handleSkipNext} aria-label="Next track">
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
