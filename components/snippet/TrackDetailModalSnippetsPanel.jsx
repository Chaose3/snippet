"use client";

import { memo } from "react";
import { formatMs } from "../../lib/timestamps";
import { s } from "./homeStyles";

export const TrackDetailModalSnippetsPanel = memo(function TrackDetailModalSnippetsPanel({
  isCurrentTrack,
  tss,
  activeModalTrack,
  estimatedPos,
  labelInput,
  setLabelInput,
  handleSaveTimestamp,
  snippetModeEnabled,
  selectedSnippetIndex,
  selectedSnippet,
  handleSelectSnippet,
  jump,
  setSelectedTrack,
}) {
  if (!isCurrentTrack && tss.length === 0) return null;

  return (
    <div style={s.modalSnippetPanel}>
      {isCurrentTrack && (
        <div style={s.modalSaveRow}>
          <input
            style={s.input}
            placeholder={`Label (optional) — at ${formatMs(estimatedPos)}`}
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSaveTimestamp()}
          />
          <button style={s.btnPrimary} onClick={handleSaveTimestamp}>Save</button>
        </div>
      )}
      <div style={s.modalTimestamps}>
        <p style={s.modalTsHeading}>
          {tss.length > 0 ? "Saved Snippets" : "No saved snippets yet"}
        </p>
        <div className="snippet-radio-group">
          {tss.map((ts, i) => (
            <label
              key={i}
              className={`snippet-option${!snippetModeEnabled ? " snippet-option-dormant" : ""}`}
            >
              <input
                type="radio"
                name={`modal-snippet-${activeModalTrack.id}`}
                className="snippet-radio-input"
                checked={selectedSnippetIndex === i}
                onChange={() => handleSelectSnippet(activeModalTrack.id, i)}
              />
              <span className="snippet-label">
                {ts.label || `Snippet ${i + 1}`}
                <span className="snippet-meta">{formatMs(ts.positionMs)}</span>
              </span>
            </label>
          ))}
        </div>
        {tss.length > 0 && (
          <button
            style={{ ...s.btnPrimary, width: "100%", marginTop: "1rem" }}
            onClick={() => {
              if (!selectedSnippet) return;
              jump(activeModalTrack, selectedSnippet.positionMs, activeModalTrack);
              setSelectedTrack(null);
            }}
          >
            Play selected snippet
          </button>
        )}
      </div>
    </div>
  );
});
