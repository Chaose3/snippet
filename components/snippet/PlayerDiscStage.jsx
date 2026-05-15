"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { s } from "./homeStyles";

const SWIPE_COMMIT_PX = 52;
const AXIS_LOCK_PX = 12;
const TRANSITION_MS = 220;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function SideArt({ track, side }) {
  const sideStyle = side === "left" ? s.modalSideArtLeft : s.modalSideArtRight;
  const glassStyle = side === "left" ? s.modalSideArtGlassLeft : s.modalSideArtGlassRight;
  return (
    <div style={{ ...s.modalSideArt, ...sideStyle }} aria-hidden>
      {track?.albumArt ? (
        <>
          <img src={track.albumArt} alt="" style={s.modalSideArtImage} draggable={false} />
          <div style={{ ...s.modalSideArtGlass, ...glassStyle }} />
        </>
      ) : (
        <div style={s.modalSideArtFallback} />
      )}
    </div>
  );
}

export const PlayerDiscStage = forwardRef(function PlayerDiscStage(
  {
    stageStyle,
    previousTrack,
    nextTrack,
    activeTrackId,
    enableTrackSwipe = true,
    canGoNext = true,
    canGoPrevious = true,
    onRequestNext,
    onRequestPrevious,
    children,
  },
  ref
) {
  const stageRef = useRef(null);
  const dragRef = useRef({
    active: false,
    axis: null,
    startX: 0,
    startY: 0,
    pointerId: null,
  });
  const transitioningRef = useRef(false);

  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setDragX(0);
    setIsDragging(false);
    setIsAnimating(false);
    transitioningRef.current = false;
    dragRef.current.active = false;
    dragRef.current.axis = null;
  }, [activeTrackId]);

  const runTransition = useCallback(
    async (direction) => {
      if (transitioningRef.current) return;
      if (direction === "next" && !canGoNext) return;
      if (direction === "previous" && !canGoPrevious) return;

      transitioningRef.current = true;
      setIsAnimating(true);
      setIsDragging(false);
      dragRef.current.active = false;
      dragRef.current.axis = null;

      const width = stageRef.current?.offsetWidth ?? 320;
      const exitX = direction === "next" ? -width * 0.34 : width * 0.34;
      setDragX(exitX);
      await sleep(TRANSITION_MS);

      const action = direction === "next" ? onRequestNext?.() : onRequestPrevious?.();
      setDragX(0);
      void action;

      await sleep(16);
      transitioningRef.current = false;
      setIsAnimating(false);
    },
    [canGoNext, canGoPrevious, onRequestNext, onRequestPrevious]
  );

  useImperativeHandle(
    ref,
    () => ({
      slideNext: () => runTransition("next"),
      slidePrevious: () => runTransition("previous"),
    }),
    [runTransition]
  );

  const isGestureBlockedTarget = useCallback((target) => {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest("[data-ring-seek], [data-disc-center]"));
  }, []);

  const onPointerDown = useCallback(
    (event) => {
      if (!enableTrackSwipe || transitioningRef.current || isGestureBlockedTarget(event.target)) return;
      dragRef.current = {
        active: true,
        axis: null,
        startX: event.clientX,
        startY: event.clientY,
        pointerId: event.pointerId,
      };
      setIsDragging(true);
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [enableTrackSwipe, isGestureBlockedTarget]
  );

  const onPointerMove = useCallback(
    (event) => {
      if (!enableTrackSwipe) return;
      const drag = dragRef.current;
      if (!drag.active || drag.pointerId !== event.pointerId) return;

      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;

      if (!drag.axis) {
        if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
        if (Math.abs(dy) > Math.abs(dx) * 1.2) {
          drag.active = false;
          drag.axis = "y";
          setIsDragging(false);
          setDragX(0);
          return;
        }
        drag.axis = "x";
      }

      if (drag.axis !== "x") return;

      event.preventDefault();
      let nextX = dx;
      if ((nextX < 0 && !canGoNext) || (nextX > 0 && !canGoPrevious)) {
        nextX *= 0.22;
      }
      setDragX(nextX);
    },
    [canGoNext, canGoPrevious]
  );

  const finishDrag = useCallback(
    (event) => {
      if (!enableTrackSwipe) return;
      const drag = dragRef.current;
      if (drag.pointerId !== event.pointerId) return;
      event.currentTarget.releasePointerCapture?.(event.pointerId);

      const dx = event.clientX - drag.startX;
      drag.active = false;
      drag.axis = null;
      setIsDragging(false);

      if (dx < -SWIPE_COMMIT_PX && canGoNext) {
        void runTransition("next");
        return;
      }
      if (dx > SWIPE_COMMIT_PX && canGoPrevious) {
        void runTransition("previous");
        return;
      }

      setIsAnimating(true);
      setDragX(0);
      window.setTimeout(() => setIsAnimating(false), TRANSITION_MS);
    },
    [enableTrackSwipe, canGoNext, canGoPrevious, runTransition]
  );

  const onPointerUp = useCallback(
    (event) => {
      if (!dragRef.current.active) return;
      finishDrag(event);
    },
    [finishDrag]
  );

  const onPointerCancel = useCallback(
    (event) => {
      if (!dragRef.current.active) return;
      finishDrag(event);
    },
    [finishDrag]
  );

  const trackClass = [
    "player-disc-slide-track",
    isDragging ? "is-dragging" : "",
    isAnimating ? "is-animating" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={stageRef}
      className="player-disc-stage"
      style={stageStyle}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <SideArt track={previousTrack} side="left" />
      <SideArt track={nextTrack} side="right" />
      <div className="player-disc-viewport">
        <div className={trackClass} style={{ transform: `translate3d(${dragX}px, 0, 0)` }}>
          <div className="player-disc-content">{children}</div>
        </div>
      </div>
    </div>
  );
});
