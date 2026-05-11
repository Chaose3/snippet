"use client";

import { useId } from "react";

export function ThemedLoader({ size = 1, label = null, inline = false }) {
  const clipId = useId().replace(/:/g, "");
  return (
    <div
      style={{
        display: "flex",
        flexDirection: inline ? "row" : "column",
        alignItems: "center",
        justifyContent: "center",
        gap: inline ? "0.65rem" : "0.9rem",
      }}
      role="status"
      aria-live="polite"
    >
      <div className="snippet-loader" style={{ "--size": size }}>
        <div className="box" style={{ mask: `url(#${clipId})`, WebkitMask: `url(#${clipId})` }} />
        <svg width="0" height="0" aria-hidden="true">
          <defs>
            <mask id={clipId}>
              <g className="snippet-loader-clipping">
                <polygon points="50,10 62,38 90,50 62,62 50,90 38,62 10,50 38,38" fill="white" />
                <polygon points="50,2 66,34 98,50 66,66 50,98 34,66 2,50 34,34" fill="white" />
                <polygon points="50,8 60,30 84,40 66,58 58,82 40,68 16,60 30,38" fill="white" />
                <polygon points="50,18 72,34 82,56 62,74 42,78 24,58 28,34" fill="white" />
                <polygon points="50,12 70,24 78,48 70,74 44,86 24,70 20,42" fill="white" />
                <polygon points="50,16 64,28 72,48 64,70 44,80 28,64 24,40" fill="white" />
                <polygon points="50,22 60,34 66,50 60,68 44,74 34,62 30,44" fill="white" />
              </g>
            </mask>
          </defs>
        </svg>
      </div>
      {label ? <span style={{ color: "#a99bb9", fontSize: "0.8rem" }}>{label}</span> : null}
    </div>
  );
}
