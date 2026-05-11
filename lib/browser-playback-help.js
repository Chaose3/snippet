export function getBrowserPlaybackHelp(webPlayerId, webPlayerError) {
  if (webPlayerId) {
    return {
      title: "This browser is ready for playback",
      body: "Snippet can play directly on this computer now.",
    };
  }
  if (webPlayerError?.type === "initialization_error") {
    return {
      title: "This browser can’t play Spotify locally",
      body:
        "Spotify’s browser player could not start here, so playback falls back to your phone or another active device. Open Snippet in full Chrome or Safari on this computer, or use the Spotify desktop app on this Mac.",
    };
  }
  if (webPlayerError?.type === "authentication_error") {
    return {
      title: "Spotify browser player couldn’t authenticate",
      body: "Log out and back in so Snippet can create a fresh browser playback device.",
    };
  }
  if (webPlayerError?.type === "account_error") {
    return {
      title: "Spotify Premium is required for browser playback",
      body: "Spotify only allows Web Playback SDK streaming for Premium accounts.",
    };
  }
  if (webPlayerError?.type === "playback_error") {
    return {
      title: "Spotify browser playback hit an error",
      body: webPlayerError.message || "Spotify rejected browser playback on this machine.",
    };
  }
  return {
    title: "Connect a playback device",
    body:
      "Snippet hasn’t been able to create its browser playback device on this machine yet, so Spotify is falling back to other active devices like your phone.",
  };
}
