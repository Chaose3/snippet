"use client";

import { memo } from "react";
import { formatMs } from "../../lib/timestamps";
import { s } from "./homeStyles";

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
      <div style={s.modalHandle} />
      <div style={s.modalHeaderActions}>
        <button
          className={[
            "modal-clip-btn",
            modalClipPressed ? "is-pressed" : "",
            modalClipSaved ? "is-saved" : "",
          ].filter(Boolean).join(" ")}
          onClick={handleModalClip}
          onPointerDown={() => setModalClipPressed(true)}
          onPointerUp={() => setModalClipPressed(false)}
          onPointerLeave={() => setModalClipPressed(false)}
          onPointerCancel={() => setModalClipPressed(false)}
          aria-label={`Save clip at ${formatMs(estimatedPos)}`}
          title={`Save clip at ${formatMs(estimatedPos)}`}
        >
          <span className="modal-clip-btn__icon-wrap">
            <img src="/snippet-logo.png" alt="" className="modal-clip-btn__icon" />
          </span>
          <span className="modal-clip-btn__text">Snip</span>
        </button>
        <div style={s.modalClipNoticeWrap}>
          <span
            style={{
              ...s.modalClipNotice,
              opacity: modalClipNotice ? 1 : 0,
              transform: modalClipNotice ? "translateY(0)" : "translateY(-2px)",
            }}
          >
            {modalClipNotice || "\u00A0"}
          </span>
        </div>
      </div>
    </div>
  );
});
