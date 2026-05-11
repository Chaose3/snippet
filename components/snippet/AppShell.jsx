"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
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
import { s } from "./homeStyles";
import { ThemedLoader } from "./ThemedLoader";
import { AppHeader } from "./AppHeader";
import { MiniPlayerBar } from "./MiniPlayerBar";
import { BottomNav } from "./BottomNav";

function routeTrackIdFromPathname(pathname) {
  if (!pathname || !pathname.startsWith("/player/")) return null;
  const rest = pathname.slice("/player/".length).split("/").filter(Boolean);
  return rest[0] ?? null;
}

export function AppShell({ children }) {
  const router = useRouter();
  const pathname = usePathname() || "";
  const routeTrackId = useMemo(() => routeTrackIdFromPathname(pathname), [pathname]);
  const isPlayerRoute = pathname.startsWith("/player/");

  const { token, setToken, doRefresh, withFreshToken } = useSpotifyToken();

  const [hydrated, setHydrated] = useState(false);
  const [urlError, setUrlError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [activeTab, setActiveTab] = useState("home");
  const [pressedTab, setPressedTab] = useState(null);

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
    activeTab,
    deferredSearchQuery,
  });

  const { spotifyResults, searchLoading } = useSpotifySearchTab({
    activeTab,
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

  useEffect(() => {
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
      if (pathname.startsWith("/player/")) {
        router.push("/");
      }
      setPressedTab(tab);
      setActiveTab(tab);
      setTimeout(() => setPressedTab(null), 150);
    },
    [pathname, router]
  );

  const onCopySupportEmail = useCallback(() => {
    navigator.clipboard.writeText("chaose3@outlook.com");
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 2000);
  }, []);

  const prefetchPlayerRoute = useCallback(
    (trackId) => {
      if (trackId) router.prefetch(`/player/${trackId}`);
    },
    [router]
  );

  const openPlayerForTrack = useCallback(
    (track) => {
      if (!track?.id) return;
      playerNavPrimedTrackRef.current = track;
      router.prefetch(`/player/${track.id}`);
      router.push(`/player/${track.id}`);
    },
    [router]
  );

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
      estimatedPos,
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
      prefetchPlayerRoute,
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
      estimatedPos,
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
      prefetchPlayerRoute,
      playerNavPrimedTrackRef,
      emailCopied,
      onCopySupportEmail,
      routeTrackId,
      withFreshToken,
    ]
  );

  return (
    <AuthProvider value={authContextValue}>
      <AppPlaybackContext.Provider value={playbackContextValue}>
        {!hydrated ? (
          <main style={{ ...s.main, ...s.centeredLoaderScreen }}>
            <ThemedLoader size={0.78} label="Loading Snippet" />
          </main>
        ) : (
          <main
            style={{
              ...s.main,
              ...(isPlayerRoute ? s.mainPlayerBleed : {}),
            }}
          >
            {!isPlayerRoute && <AppHeader token={token} onOpenSearch={() => handleTabPress("search")} />}

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
              children
            )}

            {token && playerState && (
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
                activeTab={activeTab}
                pressedTab={pressedTab}
                onTabPress={handleTabPress}
              />
            )}
          </main>
        )}
      </AppPlaybackContext.Provider>
    </AuthProvider>
  );
}
