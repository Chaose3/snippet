"use client";

import { memo } from "react";
import { s } from "./homeStyles";

function SkeletonPill({ style }) {
  return <div className="player-skeleton-pill" style={style} />;
}

/** Full-bleed player-shaped placeholder for route transitions and track fetch. */
export const PlayerRouteSkeleton = memo(function PlayerRouteSkeleton({ hintTrack = null }) {
  const hasHint = Boolean(hintTrack?.name || hintTrack?.albumArt);

  return (
    <div style={s.playerPageRoot} role="status" aria-busy="true" aria-label={hasHint ? `Loading ${hintTrack.name}` : "Loading player"}>
      <div style={s.playerSheet}>
        <div style={{ ...s.playerScrollPane, pointerEvents: "none" }}>
          <div style={s.playerScrollInner}>
            <div style={s.playerViewport}>
              <div style={s.playerHero}>
                <div style={s.playerMetaRow}>
                  <SkeletonPill style={{ width: 40, height: 40, borderRadius: "50%" }} />
                  <div style={{ ...s.playerMetaCenter, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    {hintTrack?.name ? (
                      <>
                        <p style={{ ...s.playerMetaTitle, width: "100%" }}>{hintTrack.name}</p>
                        {hintTrack.artists ? (
                          <p style={{ ...s.playerMetaArtist, width: "100%" }}>{hintTrack.artists}</p>
                        ) : (
                          <SkeletonPill style={{ width: "55%", height: 12, borderRadius: 6 }} />
                        )}
                      </>
                    ) : (
                      <>
                        <SkeletonPill style={{ width: "70%", height: 14, borderRadius: 6 }} />
                        <SkeletonPill style={{ width: "45%", height: 12, borderRadius: 6 }} />
                      </>
                    )}
                  </div>
                  <SkeletonPill style={{ width: 88, height: 40, borderRadius: 999 }} />
                </div>

                <div style={s.playerDiscStage}>
                  <div
                    className="player-skeleton-disc-wrap"
                    style={{
                      position: "relative",
                      width: "min(72vw, 280px)",
                      height: "min(72vw, 280px)",
                    }}
                  >
                    {hintTrack?.albumArt ? (
                      <img
                        src={hintTrack.albumArt}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          borderRadius: "50%",
                          objectFit: "cover",
                          opacity: 0.5,
                        }}
                      />
                    ) : (
                      <SkeletonPill
                        style={{
                          width: "100%",
                          height: "100%",
                          borderRadius: "50%",
                        }}
                      />
                    )}
                    <div
                      className="player-skeleton-ring"
                      aria-hidden
                      style={{
                        position: "absolute",
                        inset: -4,
                        borderRadius: "50%",
                        border: "2px solid rgba(224, 170, 255, 0.22)",
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: 14, justifyContent: "center", padding: "0 1rem 1rem" }}>
                  <SkeletonPill style={{ width: 44, height: 44, borderRadius: "50%" }} />
                  <SkeletonPill style={{ width: 56, height: 56, borderRadius: "50%" }} />
                  <SkeletonPill style={{ width: 44, height: 44, borderRadius: "50%" }} />
                </div>
              </div>
            </div>

            <div style={{ padding: "0.5rem 0 1rem", display: "flex", flexDirection: "column", gap: 10 }}>
              <SkeletonPill style={{ width: 88, height: 12, borderRadius: 4 }} />
              <SkeletonPill style={{ width: "100%", height: 52, borderRadius: 12 }} />
              <SkeletonPill style={{ width: "100%", height: 52, borderRadius: 12 }} />
              <SkeletonPill style={{ width: "88%", height: 52, borderRadius: 12 }} />
            </div>
          </div>
        </div>

        <div style={{ ...s.playerSnippetDock, pointerEvents: "none" }}>
          <SkeletonPill style={{ width: 100, height: 12, borderRadius: 4, marginBottom: 10 }} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <SkeletonPill style={{ width: 72, height: 32, borderRadius: 999 }} />
            <SkeletonPill style={{ width: 88, height: 32, borderRadius: 999 }} />
            <SkeletonPill style={{ width: 64, height: 32, borderRadius: 999 }} />
          </div>
          <SkeletonPill style={{ width: "100%", height: 44, borderRadius: 12, marginTop: 12 }} />
        </div>
      </div>
    </div>
  );
});
