"use client";

import { memo } from "react";
import { s } from "./homeStyles";
import { ModalSnipButton } from "./ModalSnipButton";

/** Legacy modal chrome header (modal flows). Player route uses toolbar inside TrackDetailModalHero. */
export const TrackDetailModalHeader = memo(function TrackDetailModalHeader({
  onDismiss,
  estimatedPos,
  modalClipPressed,
  setModalClipPressed,
  modalClipSaved,
  modalClipNotice,
  handleModalClip,
}) {
  return (
    <div style={s.modalHeader}>
      <button type="button" style={s.modalClose} onClick={onDismiss} aria-label="Close player">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div style={s.modalHandle} aria-hidden />
      <ModalSnipButton
        estimatedPos={estimatedPos}
        modalClipPressed={modalClipPressed}
        setModalClipPressed={setModalClipPressed}
        modalClipSaved={modalClipSaved}
        modalClipNotice={modalClipNotice}
        handleModalClip={handleModalClip}
      />
    </div>
  );
});
