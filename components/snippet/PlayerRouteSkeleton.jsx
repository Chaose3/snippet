"use client";

import { memo } from "react";
import { s } from "./homeStyles";

/** Full-bleed player-shaped placeholder for route transitions and track fetch. */
export const PlayerRouteSkeleton = memo(function PlayerRouteSkeleton({ hintTrack = null }) {
  return (
    <div style={s.playerPageRoot} role="status" aria-busy="true" aria-label="Loading player">
      <div style={s.playerSheet}>
        <div style={s.playerTopChrome}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", paddingBottom: "0.35rem" }}>
            <div className="player-skeleton-pill" style={{ width: 40, height: 40, borderRadius: 12 }} />
            <div className="player-skeleton-pill" style={{ flex: 1, maxWidth: 120, height: 14, borderRadius: 6 }} />
          </div>
        </div>

        <div style={{ ...s.playerScrollPane, pointerEvents: "none" }}>
          <div style={s.playerScrollInner}>
            <div style={s.playerViewport}>
              <div style={s.playerHero}>
                <div style={s.playerDiscStage}>
                  {hintTrack?.albumArt ? (
                    <img
                      src={hintTrack.albumArt}
                      alt=""
                      style={{
                        width: "min(72vw, 280px)",
                        height: "min(72vw, 280px)",
                        borderRadius: "50%",
                        objectFit: "cover",
                        opacity: 0.55,
                        filter: "blur(0.5px)",
                      }}
                    />
                  ) : (
                    <div
                      className="player-skeleton-pill"
                      style={{
                        width: "min(72vw, 280px)",
                        height: "min(72vw, 280px)",
                        borderRadius: "50%",
                      }}
                    />
                  )}
                </div>
                <div style={{ padding: "0 1rem 1.25rem", display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
                  {hintTrack?.name ? (
                    <p style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "rgba(255,255,255,0.75)", textAlign: "center" }}>
                      {hintTrack.name}
                    </p>
                  ) : (
                    <>
                      <div className="player-skeleton-pill" style={{ width: "72%", height: 18, borderRadius: 8 }} />
                      <div className="player-skeleton-pill" style={{ width: "48%", height: 14, borderRadius: 6 }} />
                    </>
                  )}
                  <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
                    <div className="player-skeleton-pill" style={{ width: 44, height: 44, borderRadius: "50%" }} />
                    <div className="player-skeleton-pill" style={{ width: 56, height: 56, borderRadius: "50%" }} />
                    <div className="player-skeleton-pill" style={{ width: 44, height: 44, borderRadius: "50%" }} />
                  </div>
                </div>
              </div>
            </div>
            <div style={{ padding: "0 0 1rem", display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="player-skeleton-pill" style={{ width: 88, height: 12, borderRadius: 4 }} />
              <div className="player-skeleton-pill" style={{ width: "100%", height: 52, borderRadius: 12 }} />
              <div className="player-skeleton-pill" style={{ width: "100%", height: 52, borderRadius: 12 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
