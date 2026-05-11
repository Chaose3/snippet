import { useEffect, useRef, useState } from "react";
import { getStoredToken } from "../lib/auth-storage";
import { isNativeCapacitor } from "../lib/capacitor/platform";

export function useWebSpotifyPlayer(token) {
  const [webPlayerId, setWebPlayerId] = useState(null);
  const webPlayerIdRef = useRef(null);
  const sdkPlayerRef = useRef(null);
  const [webPlayerError, setWebPlayerError] = useState(null);

  useEffect(() => {
    webPlayerIdRef.current = webPlayerId;
  }, [webPlayerId]);

  useEffect(() => {
    if (!token || typeof window === "undefined") return;
    if (isNativeCapacitor()) return;

    const initPlayer = () => {
      if (!window.Spotify || sdkPlayerRef.current) return;
      const player = new window.Spotify.Player({
        name: "Snippet",
        getOAuthToken: (cb) => cb(getStoredToken()),
        volume: 0.8,
      });
      player.addListener("ready", ({ device_id }) => {
        console.log("[webPlayer] ready", device_id);
        setWebPlayerError(null);
        setWebPlayerId(device_id);
      });
      player.addListener("not_ready", ({ device_id }) => {
        console.warn("[webPlayer] not_ready", device_id);
        setWebPlayerId(null);
      });
      player.addListener("initialization_error", ({ message }) => {
        console.warn("[webPlayer] initialization_error", message);
        setWebPlayerError({
          type: "initialization_error",
          message,
        });
      });
      player.addListener("authentication_error", ({ message }) => {
        console.warn("[webPlayer] authentication_error", message);
        setWebPlayerError({
          type: "authentication_error",
          message,
        });
      });
      player.addListener("account_error", ({ message }) => {
        console.warn("[webPlayer] account_error", message);
        setWebPlayerError({
          type: "account_error",
          message,
        });
      });
      player.addListener("playback_error", ({ message }) => {
        console.warn("[webPlayer] playback_error", message);
        setWebPlayerError({
          type: "playback_error",
          message,
        });
      });
      player.connect();
      sdkPlayerRef.current = player;
    };

    if (window.Spotify) {
      initPlayer();
    } else {
      window.onSpotifyWebPlaybackSDKReady = initPlayer;
      if (!document.querySelector('script[src="https://sdk.scdn.co/spotify-player.js"]')) {
        const script = document.createElement("script");
        script.src = "https://sdk.scdn.co/spotify-player.js";
        script.async = true;
        document.body.appendChild(script);
      }
    }

    return () => {
      if (sdkPlayerRef.current) {
        sdkPlayerRef.current.disconnect();
        sdkPlayerRef.current = null;
        setWebPlayerId(null);
      }
    };
  }, [token]);

  return { webPlayerId, webPlayerIdRef, sdkPlayerRef, webPlayerError };
}
