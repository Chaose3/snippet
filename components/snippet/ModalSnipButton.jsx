"use client";

import { memo } from "react";
import { formatMs } from "../../lib/timestamps";

export const ModalSnipButton = memo(function ModalSnipButton({
  estimatedPos,
  modalClipPressed,
  setModalClipPressed,
  modalClipSaved,
  modalClipNotice,
  handleModalClip,
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem", flexShrink: 0 }}>
      <button
        type="button"
        className={[
          "modal-clip-btn",
          modalClipPressed ? "is-pressed" : "",
          modalClipSaved ? "is-saved" : "",
        ]
          .filter(Boolean)
          .join(" ")}
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
      <div style={{ minHeight: 16, display: "flex", alignItems: "flex-start", justifyContent: "flex-end", width: "100%" }}>
        <span
          style={{
            fontSize: "0.68rem",
            letterSpacing: "0.01em",
            color: "rgba(248, 241, 255, 0.68)",
            transition: "opacity 180ms ease, transform 180ms ease",
            textAlign: "right",
            whiteSpace: "nowrap",
            opacity: modalClipNotice ? 1 : 0,
            transform: modalClipNotice ? "translateY(0)" : "translateY(-2px)",
          }}
        >
          {modalClipNotice || "\u00A0"}
        </span>
      </div>
    </div>
  );
});
