"use client";

import { memo } from "react";
import { s } from "./homeStyles";
import { ThemedLoader } from "./ThemedLoader";

export const HomeBrowserPlaybackHint = memo(function HomeBrowserPlaybackHint({
  browserPlaybackHelp,
  webPlayerError,
  fetchDevices,
  loadingDevices,
}) {
  return (
    <div style={s.devicePicker}>
      <p style={s.devicePickerHeading}>{browserPlaybackHelp.title}</p>
      <p style={{ ...s.muted, fontSize: "0.82rem" }}>
        {browserPlaybackHelp.body}
      </p>
      {webPlayerError?.type === "initialization_error" ? (
        <p style={{ ...s.muted, fontSize: "0.78rem", marginTop: "0.6rem", color: "#d9c8f1" }}>
          Best next test: open Snippet in full Chrome or Safari on this computer and make sure protected content / DRM playback is allowed.
        </p>
      ) : null}
      <button style={{ ...s.btnGhost, marginTop: "0.9rem" }} onClick={fetchDevices}>
        {loadingDevices ? <ThemedLoader size={0.28} label="Refreshing" inline /> : "Refresh devices"}
      </button>
    </div>
  );
});
