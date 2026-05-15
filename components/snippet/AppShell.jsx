"use client";

import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { fetchAllTimestamps } from "../../lib/timestamps";
import {
  getStoredToken,
  STORAGE_KEY,
  STORAGE_REFRESH,
  STORAGE_EXPIRES,
  STORAGE_SNIPPET_MODE,
} from "../../lib/auth-storage";
import { getNativeSpotifyBridge, isNativeCapacitor, NATIVE_OAUTH_REDIRECT_URI } from "../../lib/capacitor/platform";
import { useCapacitorOAuth } from "../../hooks/useCapacitorOAuth";
import { useSpotifyToken } from "../../hooks/useSpotifyToken";
import { useWebSpotifyPlayer } from "../../hooks/useWebSpotifyPlayer";
import { useSpotifyPlayerSnapshot } from "../../hooks/useSpotifyPlayerSnapshot";
import { useSpotifyDevices } from "../../hooks/useSpotifyDevices";
import { useSnippetLibrary } from "../../hooks/useSnippetLibrary";
import { useSpotifySearchTab } from "../../hooks/useSpotifySearchTab";
import { useSnippetDerivedData } from "../../hooks/useSnippetDerivedData";
import { useSnippetPlayback } from "../../hooks/useSnippetPlayback";
import { AuthProvider } from "../../contexts/AuthContext";
import { AppPlaybackContext } from "../../contexts/AppPlaybackContext";
import { PlaybackPositionContext } from "../../contexts/PlaybackPositionContext";
import { PlayerRouteSkeleton } from "./PlayerRouteSkeleton";
import { getPlayerRouteHintTrack } from "../../lib/player-route-hint";
import { isSearchPathname, tabFromPathname, tabHref } from "../../lib/app-routes";
import {
  isPlayerPathname,
  playerHref,
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
    (trackId) => {
      if (!trackId) return;
      setPlayerViewTrackIdState(trackId);
      const href = playerHref(trackId);
      const current =
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : "";
      if (current !== href) {
        router.replace(href, { scroll: false });
      }
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
    playTrackWithMode,
    handleDelete,
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
  });

  useEffect(() => {
    if (!token) {
      setAllTimestamps({});
      return;
    }
    fetchAllTimestamps(token).then(setAllTimestamps);
  }, [token]);

  useLayoutEffect(() => {
    setHydrated(true);
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
    const { generateCodeVerifier, generateCodeChallenge } = await import("../../lib/pkce-browser");
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    const isNative = isNativeCapacitor();
    const platform = (() => {
      try {
        const c = window.Capacitor;
        if (typeof c?.getPlatform === "function") return c.getPlatform();
        return null;
      } catch {
        return null;
      }
    })();

    const qs = new URLSearchParams({
      code_challenge: challenge,
      verifier,
      ...(isNative ? { redirect_uri: NATIVE_OAUTH_REDIRECT_URI } : {}),
    });

    const loginUrl = `${window.location.origin}/api/login?${qs.toString()}`;
    console.log("[goLogin]", {
      isNative,
      platform,
      origin: window.location.origin,
      loginUrl,
    });

    if (isNative) {
      try {
        const { Browser } = await import("@capacitor/browser");
        console.log("[goLogin] opening native browser", { loginUrl });
        await Browser.open({ url: loginUrl, presentationStyle: "fullscreen" });
        return;
      } catch (e) {
        console.warn("[goLogin] Browser.open failed, falling back", e);
      }
    }

    window.location.href = loginUrl;
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_REFRESH);
    localStorage.removeItem(STORAGE_EXPIRES);
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
      setPlayerViewTrack(track);
      router.prefetch(PLAYER_PATH);
      router.push(PLAYER_PATH);
    },
    [pathname, router, setPlayerViewTrack]
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
      snippetsOpen,
      setSnippetsOpen,
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
      playTrackWithMode,
      recentlyPlayedTracks,
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
      snippetsOpen,
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
      playTrackWithMode,
      recentlyPlayedTracks,
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
              />
            )}
          </main>
        )}
        </PlaybackPositionContext.Provider>
      </AppPlaybackContext.Provider>
    </AuthProvider>
  );
}
