import { useEffect, useRef } from "react";
import { isNativeCapacitor } from "../lib/capacitor/platform";
import { isPlayerPathname, playerHref } from "../lib/player-route";

const SNIP_DEBOUNCE_MS = 2500;
const URL_DEDUPE_MS = 2000;

/** Process cold-start launch URL once per app session (survives hook re-runs). */
let launchUrlConsumed = false;

/**
 * Handle snippet://player* deep links from the home/lock screen widget.
 * Lock screen accessory widgets open the app via URL; snip saves the current timestamp at playback position.
 */
export function useWidgetDeepLinks({
  playerState,
  handlePlayPause,
  handleSkipNext,
  handleSkipPrevious,
  handleModalClip,
  refreshPlayerSnapshot,
  setPlayerViewTrackId,
  router,
}) {
  const handlersRef = useRef({});
  handlersRef.current = {
    playerState,
    handlePlayPause,
    handleSkipNext,
    handleSkipPrevious,
    handleModalClip,
    refreshPlayerSnapshot,
    setPlayerViewTrackId,
    router,
  };

  const snipInFlightRef = useRef(false);
  const lastSnipAtRef = useRef(0);
  const lastUrlRef = useRef({ url: null, at: 0 });

  useEffect(() => {
    if (!isNativeCapacitor()) return undefined;

    let removeListener = () => {};

    const shouldIgnoreUrl = (url) => {
      const now = Date.now();
      if (lastUrlRef.current.url === url && now - lastUrlRef.current.at < URL_DEDUPE_MS) {
        return true;
      }
      lastUrlRef.current = { url, at: now };
      return false;
    };

    const runSnip = async () => {
      const now = Date.now();
      if (snipInFlightRef.current || now - lastSnipAtRef.current < SNIP_DEBOUNCE_MS) return;
      snipInFlightRef.current = true;
      lastSnipAtRef.current = now;
      try {
        const { refreshPlayerSnapshot: refresh, handleModalClip: clip } = handlersRef.current;
        await refresh?.();
        await clip?.();
      } finally {
        snipInFlightRef.current = false;
      }
    };

    const handleUrl = (url) => {
      if (!url || typeof url !== "string" || !url.startsWith("snippet://")) return;
      if (shouldIgnoreUrl(url)) return;

      let parsed;
      try {
        parsed = new URL(url);
      } catch {
        return;
      }
      if (parsed.protocol !== "snippet:") return;

      const host = parsed.hostname || parsed.host || "";
      if (host !== "player") return;

      const path = (parsed.pathname || "").replace(/^\/+/, "");
      const segments = path.split("/").filter(Boolean);
      const first = segments[0] || "";
      const {
        playerState: state,
        handlePlayPause: playPause,
        handleSkipNext: skipNext,
        handleSkipPrevious: skipPrev,
        setPlayerViewTrackId: setTrack,
        router: nav,
      } = handlersRef.current;

      if (first === "toggle") {
        playPause?.();
        return;
      }
      if (first === "next") {
        skipNext?.();
        return;
      }
      if (first === "prev" || first === "previous") {
        skipPrev?.();
        return;
      }
      if (first === "snip") {
        void runSnip();
        return;
      }

      const trackId = first || state?.id;
      if (trackId) {
        setTrack?.(trackId, { useRouter: true });
        if (typeof window !== "undefined" && !isPlayerPathname(window.location.pathname)) {
          nav?.replace?.(playerHref(trackId), { scroll: false });
        }
      }
    };

    import("@capacitor/app")
      .then(async ({ App }) => {
        const handle = await App.addListener("appUrlOpen", ({ url }) => {
          handleUrl(url);
        });
        removeListener = () => handle.remove();

        if (!launchUrlConsumed) {
          launchUrlConsumed = true;
          const launch = await App.getLaunchUrl().catch(() => null);
          if (launch?.url) handleUrl(launch.url);
        }
      })
      .catch(() => {});

    return () => removeListener();
  }, []);
}
