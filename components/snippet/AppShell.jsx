"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { fetchAllTimestamps } from "../../lib/timestamps";
import {
  clearCachedTimestamps,
  loadCachedTimestamps,
  mergeTimestampMaps,
  saveCachedTimestamps,
} from "../../lib/snippet-timestamps-cache";
import { notifyAuthComplete } from "../../lib/auth-events";
import {
  clearLegacyAppRemoteSession,
  clearSpotifySession,
  getStoredToken,
  STORAGE_SNIPPET_MODE,
} from "../../lib/auth-storage";
import { getNativeSpotifyBridge, isNativeCapacitor } from "../../lib/capacitor/platform";
import { startNativeSpotifyLogin } from "../../lib/capacitor/native-spotify-login";
import {
  probeSpotifyConnectEnvironment,
  redactPkce,
  spotifyConnectError,
  spotifyConnectLog,
} from "../../lib/capacitor/spotify-connect-log";
import { useCapacitorOAuth } from "../../hooks/useCapacitorOAuth";
import { useSpotifyToken } from "../../hooks/useSpotifyToken";
import { useWebSpotifyPlayer } from "../../hooks/useWebSpotifyPlayer";
import { useSpotifyPlayerSnapshot } from "../../hooks/useSpotifyPlayerSnapshot";
import { useSpotifyDevices } from "../../hooks/useSpotifyDevices";
import { useSnippetLibrary } from "../../hooks/useSnippetLibrary";
import { useSpotifySearchTab } from "../../hooks/useSpotifySearchTab";
import { useSnippetDerivedData } from "../../hooks/useSnippetDerivedData";
import { useSnippetPlayback } from "../../hooks/useSnippetPlayback";
import { useWidgetDeepLinks } from "../../hooks/useWidgetDeepLinks";
import { AuthProvider } from "../../contexts/AuthContext";
import { AppPlaybackContext } from "../../contexts/AppPlaybackContext";
import { AppSearchContext } from "../../contexts/AppSearchContext";
import { PlaybackPositionContext } from "../../contexts/PlaybackPositionContext";
import { PlayerRouteSkeleton } from "./PlayerRouteSkeleton";
import { getPlayerRouteHintTrack } from "../../lib/player-route-hint";
import { isSearchPathname, tabFromPathname, tabHref } from "../../lib/app-routes";
import {
  isPlayerPathname,
  playerHref,
  replacePlayerTrackInUrl,
  trackIdFromPlayerPathname,
  PLAYER_PATH,
} from "../../lib/player-route";
import { s } from "./homeStyles";
import { ThemedLoader } from "./ThemedLoader";
import { AppHeader } from "./AppHeader";
import { MiniPlayerBar } from "./MiniPlayerBar";
import { BottomNav } from "./BottomNav";

export function AppShell({ children }) {
  const router = useRouter();
  const pathname = usePathname() || "";
  const legacyRouteTrackId = useMemo(() => trackIdFromPlayerPathname(pathname), [pathname]);
  const isPlayerRoute = isPlayerPathname(pathname);
  const [playerViewTrackId, setPlayerViewTrackIdState] = useState(null);
  const routeTrackId = isPlayerRoute ? playerViewTrackId ?? legacyRouteTrackId : null;

  const { token, setToken, doRefresh, withFreshToken } = useSpotifyToken();

  const [hydrated, setHydrated] = useState(false);
  const [urlError, setUrlError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [pressedTab, setPressedTab] = useState(null);
  const isSearchRoute = isSearchPathname(pathname);
  const activeTab = useMemo(() => tabFromPathname(pathname), [pathname]);

  const { webPlayerId, webPlayerIdRef, sdkPlayerRef, webPlayerError } = useWebSpotifyPlayer(token);

  const nativeSpotifyBridge = getNativeSpotifyBridge();
  const isNativeApp = Boolean(nativeSpotifyBridge);

  const {
    playerState,
    setPlayerState,
    queueTracks,
    estimatedPos,
    setEstimatedPos,
    estimatedPosRef,
    lastPollRef,
    isSeekingRef,
    refreshPlayerSnapshot,
    resetPlayer,
  } = useSpotifyPlayerSnapshot({ token, withFreshToken });

  const refreshScheduleRef = useRef(null);
  const schedulePlayerRefresh = useCallback(
    (delayMs = 900) => {
      if (refreshScheduleRef.current) clearTimeout(refreshScheduleRef.current);
      refreshScheduleRef.current = setTimeout(() => {
        refreshScheduleRef.current = null;
        refreshPlayerSnapshot();
      }, delayMs);
    },
    [refreshPlayerSnapshot]
  );

  useEffect(() => {
    return () => {
      if (refreshScheduleRef.current) clearTimeout(refreshScheduleRef.current);
    };
  }, []);

  const { devices, deviceId, setDeviceId, loadingDevices, fetchDevices } = useSpotifyDevices({
    token,
    playerState,
    isNativeApp,
    withFreshToken,
  });

  const {
    playlists,
    openPlaylistId,
    playlistTracks,
    loadingPlaylistId,
    playlistErrors,
    likedTracks,
    recentlyPlayedTracks,
    recentlyPlayedError,
    handleTogglePlaylist,
    resetLibrary,
  } = useSnippetLibrary({
    token,
    withFreshToken,
  });

  const { spotifyResults, searchLoading } = useSpotifySearchTab({
    isSearchRoute,
    deferredSearchQuery,
    doRefresh,
  });

  const [allTimestamps, setAllTimestamps] = useState({});
  const [labelInput, setLabelInput] = useState("");
  const [selectedSnippetIndexByTrack, setSelectedSnippetIndexByTrack] = useState({});
  const [snippetModeEnabled, setSnippetModeEnabled] = useState(false);
  const [snippetsOpen, setSnippetsOpen] = useState(true);
  const [playlistsOpen, setPlaylistsOpen] = useState(false);
  const [recentlyPlayedOpen, setRecentlyPlayedOpen] = useState(false);
  const [modalClipPressed, setModalClipPressed] = useState(false);
  const [modalClipSaved, setModalClipSaved] = useState(false);
  const [modalClipNotice, setModalClipNotice] = useState("");
  const [modalMenuOpen, setModalMenuOpen] = useState(false);
  const [modalMenuSnippetsOpen, setModalMenuSnippetsOpen] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);

  const modalRingSeekRef = useRef({ active: false });
  /** Set synchronously in `openPlayerForTrack` so the player screen can paint before async work. */
  const playerNavPrimedTrackRef = useRef(null);
  /** Tab route to restore when closing full-screen player (pathname is /player while open). */
  const playerReturnTabRef = useRef("home");

  const setPlayerViewTrackId = useCallback(
    (trackId, { useRouter = true } = {}) => {
      if (!trackId) return;
      setPlayerViewTrackIdState(trackId);
      if (typeof window === "undefined") return;
      const href = playerHref(trackId);
      const current = `${window.location.pathname}${window.location.search}`;
      if (current === href) return;
      if (!useRouter || isPlayerPathname(window.location.pathname)) {
        replacePlayerTrackInUrl(trackId);
        return;
      }
      router.replace(href, { scroll: false });
    },
    [router]
  );

  const setPlayerViewTrack = useCallback((track) => {
    if (!track?.id) return;
    playerNavPrimedTrackRef.current = track;
    setPlayerViewTrackId(track.id);
  }, [setPlayerViewTrackId]);

  const {
    previousPlayerTrack,
    nowPlayingTimestamps,
    selectedNowPlayingSnippetIndex,
    selectedNowPlayingSnippet,
    trackLookup,
    totalSnippetCount,
    tracksWithSnippetsCount,
    snippetGroups,
    snippetTracks,
    prioritizedPlaylists,
    remainingPlaylists,
    prioritizedRecentlyPlayed,
    remainingRecentlyPlayed,
    fallbackUpcomingTracks,
    browserPlaybackHelp,
  } = useSnippetDerivedData({
    allTimestamps,
    playerState,
    playlistTracks,
    likedTracks,
    selectedSnippetIndexByTrack,
    playlists,
    recentlyPlayedTracks,
    spotifyResults,
    routeTrackId,
    webPlayerId,
    webPlayerError,
  });

  const {
    jump,
    handlePlayPause,
    handleSeekChange,
    handleSeekCommit,
    handleModalRingPointerDown,
    handleModalRingPointerMove,
    handleModalRingPointerUp,
    handleShuffle,
    handleRepeatCycle,
    handleSkipNext,
    handleSkipPrevious,
    handleQuickPlayPlaylist,
    handleSaveTimestamp,
    handleModalClip,
    handleSelectSnippet,
    resolvePlaybackPosition,
    primePlaybackTrack,
    playTrackWithMode,
    handleDelete,
    handleDeleteTrackGroup,
  } = useSnippetPlayback({
    setToken,
    doRefresh,
    withFreshToken,
    isNativeApp,
    webPlayerId,
    webPlayerError,
    webPlayerIdRef,
    sdkPlayerRef,
    playerState,
    setPlayerState,
    deviceId,
    setDeviceId,
    lastPollRef,
    estimatedPosRef,
    setEstimatedPos,
    estimatedPos,
    isSeekingRef,
    refreshPlayerSnapshot,
    schedulePlayerRefresh,
    fetchDevices,
    snippetModeEnabled,
    allTimestamps,
    setAllTimestamps,
    selectedSnippetIndexByTrack,
    setSelectedSnippetIndexByTrack,
    labelInput,
    setLabelInput,
    modalRingSeekRef,
    setModalClipNotice,
    setModalClipSaved,
    trackLookup,
    playlistTracks,
  });

  useWidgetDeepLinks({
    playerState,
    handlePlayPause,
    handleSkipNext,
    handleSkipPrevious,
    handleModalClip,
    refreshPlayerSnapshot,
    setPlayerViewTrackId,
    router,
  });

  useEffect(() => {
    if (!token) {
      setAllTimestamps({});
      clearCachedTimestamps();
      return;
    }
    const cached = loadCachedTimestamps();
    if (Object.keys(cached).length > 0) {
      setAllTimestamps(cached);
    }
    fetchAllTimestamps(token)
      .then((remote) => {
        const merged = mergeTimestampMaps(cached, remote);
        setAllTimestamps(merged);
        saveCachedTimestamps(merged);
      })
      .catch(() => {
        if (Object.keys(cached).length > 0) setAllTimestamps(cached);
      });
  }, [token]);

  useEffect(() => {
    if (!token) return;
    saveCachedTimestamps(allTimestamps);
  }, [allTimestamps, token]);

  useLayoutEffect(() => {
    setHydrated(true);
    if (clearLegacyAppRemoteSession()) {
      setToken(null);
    }
    const t = getStoredToken();
    setToken(t);
    if (t) setUrlError(null);
    const storedSnippetMode = localStorage.getItem(STORAGE_SNIPPET_MODE);
    if (storedSnippetMode === "true") setSnippetModeEnabled(true);

    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    const detail = params.get("detail");
    if (err) {
      if (!t) setUrlError(detail || err);
      window.history.replaceState({}, "", "/");
    }
  }, [setToken]);

  useCapacitorOAuth({ setToken, setUrlError });

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_SNIPPET_MODE, String(snippetModeEnabled));
  }, [snippetModeEnabled]);

  const goLogin = useCallback(async () => {
    spotifyConnectLog("goLogin.tap", { pathname: typeof window !== "undefined" ? window.location.pathname : null });

    try {
      const env = await probeSpotifyConnectEnvironment();
      const { generateCodeVerifier, generateCodeChallenge } = await import("../../lib/pkce-browser");
      const verifier = generateCodeVerifier();
      const challenge = await generateCodeChallenge(verifier);

      spotifyConnectLog("goLogin.pkce", {
        verifier: redactPkce(verifier),
        codeChallenge: redactPkce(challenge),
        isNative: env.isNative,
        platform: env.platform,
        spotifyAppInstalled: env.spotifyAppInstalled,
        hasSpotifyBridge: env.hasSpotifyBridge,
        browserPluginAvailable: env.browserPluginAvailable,
      });

      if (env.isNative) {
        spotifyConnectLog("goLogin.route", {
          branch: "native",
          order: "PKCE (Web API) — App Remote stays in Spotify SDK, not localStorage",
        });
        const result = await startNativeSpotifyLogin({ challenge, verifier });
        spotifyConnectLog("goLogin.done", { result: { mode: result?.mode } });
        return;
      }

      const loginUrl = `${window.location.origin}/api/login?${new URLSearchParams({ code_challenge: challenge, verifier }).toString()}`;
      spotifyConnectLog("goLogin.route", { branch: "web", loginUrl });
      window.location.href = loginUrl;
    } catch (e) {
      spotifyConnectError("goLogin.failed", { error: e });
      throw e;
    }
  }, [setToken, setUrlError]);

  const handleLogout = useCallback(() => {
    clearSpotifySession();
    setToken(null);
    resetPlayer();
    resetLibrary();
  }, [setToken, resetPlayer, resetLibrary]);

  const authContextValue = useMemo(
    () => ({
      token,
      setToken,
      withFreshToken,
      doRefresh,
      handleLogout,
      goLogin,
    }),
    [token, withFreshToken, doRefresh, handleLogout, goLogin]
  );

  const handleTabPress = useCallback(
    (tab) => {
      setPressedTab(tab);
      setTimeout(() => setPressedTab(null), 150);
      const href = tabHref(tab);
      if (pathname !== href) router.push(href);
    },
    [pathname, router]
  );

  useEffect(() => {
    if (!token) return;
    router.prefetch("/search");
    router.prefetch("/profile");
  }, [token, router]);

  const prevPathnameRef = useRef(pathname);
  useEffect(() => {
    const prev = prevPathnameRef.current;
    prevPathnameRef.current = pathname;
    if (prev.startsWith("/search") && !pathname.startsWith("/search")) {
      setSearchQuery("");
    }
  }, [pathname]);

  /** Leaving /player — reset shell state so home/search keep scroll + safe-area layout. */
  useEffect(() => {
    if (isPlayerRoute) return;
    setPlayerViewTrackIdState(null);
    setModalMenuOpen(false);
    setModalMenuSnippetsOpen(false);
  }, [isPlayerRoute]);

  /** Browser back/forward after in-player URL updates must stay aligned with App Router. */
  useEffect(() => {
    const onPopState = () => {
      const path = window.location.pathname;
      const search = window.location.search;
      const next = `${path}${search}`;
      const current = `${pathname}${typeof window !== "undefined" ? window.location.search : ""}`;
      if (next !== current) {
        router.replace(next, { scroll: false });
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [pathname, router]);

  const onCopySupportEmail = useCallback(() => {
    navigator.clipboard.writeText("chaose3@outlook.com");
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 2000);
  }, []);

  const prefetchPlayerRoute = useCallback(() => {
    router.prefetch(PLAYER_PATH);
  }, [router]);

  const openPlayerForTrack = useCallback(
    (track) => {
      if (!track?.id) return;
      const tab = tabFromPathname(pathname);
      if (tab) playerReturnTabRef.current = tab;
      playerNavPrimedTrackRef.current = track;
      setPlayerViewTrackIdState(track.id);
      const href = playerHref(track.id);
      router.prefetch(href);
      router.push(href, { scroll: false });
    },
    [pathname, router]
  );

  const closePlayer = useCallback(() => {
    setModalMenuOpen(false);
    setModalMenuSnippetsOpen(false);
    setPlayerViewTrackIdState(null);
    router.replace(tabHref(playerReturnTabRef.current), { scroll: false });
  }, [router]);

  const playbackContextValue = useMemo(
    () => ({
      hydrated,
      urlError,
      token,
      isNativeApp,
      webPlayerId,
      webPlayerError,
      devices,
      loadingDevices,
      fetchDevices,
      playerState,
      queueTracks,
      handleSeekChange,
      handleSeekCommit,
      handleShuffle,
      handleSaveTimestamp,
      snippetModeEnabled,
      setSnippetModeEnabled,
      nowPlayingTimestamps,
      selectedNowPlayingSnippetIndex,
      handleSelectSnippet,
      jump,
      handleDelete,
      handleDeleteTrackGroup,
      snippetsOpen,
      setSnippetsOpen,
      totalSnippetCount,
      tracksWithSnippetsCount,
      snippetGroups,
      snippetTracks,
      playlists,
      prioritizedPlaylists,
      remainingPlaylists,
      playlistsOpen,
      setPlaylistsOpen,
      openPlaylistId,
      playlistTracks,
      loadingPlaylistId,
      playlistErrors,
      handleTogglePlaylist,
      handleQuickPlayPlaylist,
      primePlaybackTrack,
      playTrackWithMode,
      recentlyPlayedTracks,
      recentlyPlayedError,
      prioritizedRecentlyPlayed,
      remainingRecentlyPlayed,
      recentlyPlayedOpen,
      setRecentlyPlayedOpen,
      browserPlaybackHelp,
      trackLookup,
      previousPlayerTrack,
      fallbackUpcomingTracks,
      selectedSnippetIndexByTrack,
      labelInput,
      setLabelInput,
      modalClipPressed,
      setModalClipPressed,
      modalClipSaved,
      modalClipNotice,
      modalMenuOpen,
      setModalMenuOpen,
      modalMenuSnippetsOpen,
      setModalMenuSnippetsOpen,
      handleModalClip,
      handleSkipPrevious,
      handleSkipNext,
      handlePlayPause,
      handleRepeatCycle,
      resolvePlaybackPosition,
      handleModalRingPointerDown,
      handleModalRingPointerMove,
      handleModalRingPointerUp,
      allTimestamps,
      selectedNowPlayingSnippet,
      searchQuery,
      setSearchQuery,
      searchLoading,
      spotifyResults,
      activeTab,
      pressedTab,
      handleTabPress,
      openPlayerForTrack,
      closePlayer,
      prefetchPlayerRoute,
      playerViewTrackId,
      setPlayerViewTrackId,
      setPlayerViewTrack,
      playerNavPrimedTrackRef,
      emailCopied,
      onCopySupportEmail,
      routeTrackId,
      withFreshToken,
    }),
    [
      hydrated,
      urlError,
      token,
      isNativeApp,
      webPlayerId,
      webPlayerError,
      devices,
      loadingDevices,
      fetchDevices,
      playerState,
      queueTracks,
      handleSeekChange,
      handleSeekCommit,
      handleShuffle,
      handleSaveTimestamp,
      snippetModeEnabled,
      nowPlayingTimestamps,
      selectedNowPlayingSnippetIndex,
      handleSelectSnippet,
      jump,
      handleDelete,
      handleDeleteTrackGroup,
      snippetsOpen,
      totalSnippetCount,
      tracksWithSnippetsCount,
      snippetGroups,
      snippetTracks,
      playlists,
      prioritizedPlaylists,
      remainingPlaylists,
      playlistsOpen,
      openPlaylistId,
      playlistTracks,
      loadingPlaylistId,
      playlistErrors,
      handleTogglePlaylist,
      handleQuickPlayPlaylist,
      primePlaybackTrack,
      playTrackWithMode,
      recentlyPlayedTracks,
      recentlyPlayedError,
      prioritizedRecentlyPlayed,
      remainingRecentlyPlayed,
      recentlyPlayedOpen,
      browserPlaybackHelp,
      trackLookup,
      previousPlayerTrack,
      fallbackUpcomingTracks,
      selectedSnippetIndexByTrack,
      labelInput,
      modalClipPressed,
      modalClipSaved,
      modalClipNotice,
      modalMenuOpen,
      modalMenuSnippetsOpen,
      handleModalClip,
      handleSkipPrevious,
      handleSkipNext,
      handlePlayPause,
      handleRepeatCycle,
      resolvePlaybackPosition,
      handleModalRingPointerDown,
      handleModalRingPointerMove,
      handleModalRingPointerUp,
      allTimestamps,
      selectedNowPlayingSnippet,
      searchQuery,
      setSearchQuery,
      searchLoading,
      spotifyResults,
      activeTab,
      pressedTab,
      handleTabPress,
      openPlayerForTrack,
      closePlayer,
      prefetchPlayerRoute,
      playerViewTrackId,
      setPlayerViewTrackId,
      setPlayerViewTrack,
      playerNavPrimedTrackRef,
      emailCopied,
      onCopySupportEmail,
      routeTrackId,
      withFreshToken,
    ]
  );

  const positionContextValue = useMemo(
    () => ({ estimatedPos, estimatedPosRef }),
    [estimatedPos, estimatedPosRef]
  );

  const searchContextValue = useMemo(
    () => ({ searchQuery, setSearchQuery, searchLoading, spotifyResults }),
    [searchQuery, searchLoading, spotifyResults]
  );

  const playerShellHintTrack = useMemo(
    () =>
      getPlayerRouteHintTrack(routeTrackId, {
        primedRef: playerNavPrimedTrackRef,
        trackLookup,
        playerState,
        recentlyPlayedTracks,
        spotifyResults,
      }),
    [routeTrackId, trackLookup, playerState, recentlyPlayedTracks, spotifyResults, playerNavPrimedTrackRef]
  );

  return (
    <AuthProvider value={authContextValue}>
      <AppPlaybackContext.Provider value={playbackContextValue}>
        <AppSearchContext.Provider value={searchContextValue}>
        <PlaybackPositionContext.Provider value={positionContextValue}>
        {!hydrated ? (
          isPlayerRoute ? (
            <main style={{ ...s.main, ...s.mainPlayerBleed }}>
              <PlayerRouteSkeleton hintTrack={playerShellHintTrack} />
            </main>
          ) : (
            <main style={{ ...s.main, ...s.centeredLoaderScreen }}>
              <ThemedLoader size={0.78} label="Loading Snippet" />
            </main>
          )
        ) : (
          <main
            style={{
              ...s.main,
              ...(isPlayerRoute ? s.mainPlayerBleed : s.mainAppShell),
            }}
          >
            {!isPlayerRoute && <AppHeader />}

            {urlError && <p style={s.error}>Login issue: {urlError}</p>}

            {isPlayerRoute ? (
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {children}
              </div>
            ) : (
              <div style={s.mainAppContent}>{children}</div>
            )}

            {token && playerState && !isPlayerRoute && (
              <MiniPlayerBar
                playerState={playerState}
                trackLookup={trackLookup}
                snippetModeEnabled={snippetModeEnabled}
                setSnippetModeEnabled={setSnippetModeEnabled}
                selectedNowPlayingSnippet={selectedNowPlayingSnippet}
                jump={jump}
                handlePlayPause={handlePlayPause}
                handleSkipNext={handleSkipNext}
                onOpenNowPlaying={openPlayerForTrack}
                onPrefetchPlayer={prefetchPlayerRoute}
              />
            )}

            {token && (
              <BottomNav
                playerState={playerState}
                miniPlayerDocked={!isPlayerRoute}
                activeTab={activeTab}
                pressedTab={pressedTab}
                onTabPress={handleTabPress}
                totalSnippetCount={totalSnippetCount}
              />
            )}
          </main>
        )}
        </PlaybackPositionContext.Provider>
        </AppSearchContext.Provider>
      </AppPlaybackContext.Provider>
    </AuthProvider>
  );
}
