"use client";

import { memo } from "react";
import { formatMs } from "../../lib/timestamps";
import { s } from "./homeStyles";

export const TrackDetailModalOverflowMenu = memo(function TrackDetailModalOverflowMenu({
  activeModalTrack,
  snippetModeEnabled,
  setSnippetModeEnabled,
  modalMenuSnippetsOpen,
  setModalMenuSnippetsOpen,
  setModalMenuOpen,
  tss,
  selectedSnippetIndex,
  handleSelectSnippet,
}) {
  return (
    <div
      style={s.modalMenuBackdrop}
      onClick={() => {
        setModalMenuOpen(false);
        setModalMenuSnippetsOpen(false);
      }}
    >
      <div style={s.modalMenuSheet} onClick={(e) => e.stopPropagation()}>
        <div style={s.modalMenuHandle} />
        <div style={s.modalMenuHeader}>
          {activeModalTrack.albumArt ? (
            <img src={activeModalTrack.albumArt} alt="" style={s.modalMenuTrackArt} />
          ) : (
            <div style={s.modalMenuTrackArtFallback} />
          )}
          <div style={{ minWidth: 0 }}>
            <p style={s.modalMenuTrackName}>{activeModalTrack.name}</p>
            <p style={s.modalMenuTrackArtist}>{activeModalTrack.artists}</p>
          </div>
        </div>

        <div style={s.modalMenuActions}>
          <button
            style={s.modalMenuAction}
            onClick={() => setSnippetModeEnabled((value) => !value)}
          >
            <div style={s.modalMenuActionCopy}>
              <span style={s.modalMenuActionTitle}>
                {snippetModeEnabled ? "Disable snippet mode" : "Enable snippet mode"}
              </span>
              <span style={s.modalMenuActionSubtle}>
                {snippetModeEnabled
                  ? "Play songs from the beginning"
                  : "Jump straight to your selected snippet"}
              </span>
            </div>
            <span
              style={{
                ...s.modalMenuTogglePill,
                ...(snippetModeEnabled ? s.modalMenuTogglePillActive : {}),
              }}
            >
              {snippetModeEnabled ? "On" : "Off"}
            </span>
          </button>

          <button
            style={s.modalMenuAction}
            onClick={() => setModalMenuSnippetsOpen((value) => !value)}
          >
            <div style={s.modalMenuActionCopy}>
              <span style={s.modalMenuActionTitle}>Select snippet</span>
              <span style={s.modalMenuActionSubtle}>
                Choose which saved moment snippet mode should use
              </span>
            </div>
            <span style={s.modalMenuChevron}>{modalMenuSnippetsOpen ? "−" : "+"}</span>
          </button>
        </div>

        {modalMenuSnippetsOpen && (
          <div style={s.modalMenuSnippetSection}>
            {tss.length > 0 ? (
              <div className="snippet-radio-group">
                {tss.map((ts, i) => (
                  <label key={i} className="snippet-option">
                    <input
                      type="radio"
                      name={`menu-snippet-${activeModalTrack.id}`}
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
            ) : (
              <p style={s.modalMenuEmpty}>No saved snippets for this song yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
