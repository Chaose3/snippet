"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { fetchAllTimestamps } from "../lib/timestamps";
import {
  getStoredToken,
  STORAGE_KEY,
  STORAGE_REFRESH,
  STORAGE_EXPIRES,
  STORAGE_SNIPPET_MODE,
} from "../lib/auth-storage";
import { getNativeSpotifyBridge, isNativeCapacitor, NATIVE_OAUTH_REDIRECT_URI } from "../lib/capacitor/platform";
import { useCapacitorOAuth } from "../hooks/useCapacitorOAuth";
import { useSpotifyToken } from "../hooks/useSpotifyToken";
import { useWebSpotifyPlayer } from "../hooks/useWebSpotifyPlayer";
import { useSpotifyPlayerSnapshot } from "../hooks/useSpotifyPlayerSnapshot";
import { useSpotifyDevices } from "../hooks/useSpotifyDevices";
import { useSnippetLibrary } from "../hooks/useSnippetLibrary";
import { useSpotifySearchTab } from "../hooks/useSpotifySearchTab";
import { useSnippetDerivedData } from "../hooks/useSnippetDerivedData";
import { useSnippetPlayback } from "../hooks/useSnippetPlayback";
import { AuthProvider } from "../contexts/AuthContext";
import { s } from "../components/snippet/homeStyles";
import { ThemedLoader } from "../components/snippet/ThemedLoader";
import { LandingView } from "../components/snippet/LandingView";
import { AppHeader } from "../components/snippet/AppHeader";
import { HomeTab } from "../components/snippet/HomeTab";
import { SearchTab } from "../components/snippet/SearchTab";
import { ProfileTab } from "../components/snippet/ProfileTab";
import { TrackDetailModal } from "../components/snippet/TrackDetailModal";
import { MiniPlayerBar } from "../components/snippet/MiniPlayerBar";
import { BottomNav } from "../components/snippet/BottomNav";

export default function Home() {
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
  const [selectedTrack, setSelectedTrack] = useState(null);
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
    selectedTrack,
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
  }, []);

  useCapacitorOAuth({ setToken, setUrlError });

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_SNIPPET_MODE, String(snippetModeEnabled));
  }, [snippetModeEnabled]);

  const goLogin = useCallback(async () => {
    const { generateCodeVerifier, generateCodeChallenge } = await import("../lib/pkce-browser");
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

  const handleTabPress = useCallback((tab) => {
    setPressedTab(tab);
    setActiveTab(tab);
    setTimeout(() => setPressedTab(null), 150);
  }, []);

  const onCopySupportEmail = useCallback(() => {
    navigator.clipboard.writeText("chaose3@outlook.com");
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 2000);
  }, []);

  if (!hydrated) {
    return (
      <AuthProvider value={authContextValue}>
        <main style={{ ...s.main, ...s.centeredLoaderScreen }}>
          <ThemedLoader size={0.78} label="Loading Snippet" />
        </main>
      </AuthProvider>
    );
  }

  return (
    <AuthProvider value={authContextValue}>
      <main style={s.main}>
        <AppHeader token={token} onOpenSearch={() => handleTabPress("search")} />

        {urlError && <p style={s.error}>Login issue: {urlError}</p>}

        {!token ? (
          <LandingView emailCopied={emailCopied} onCopyEmail={onCopySupportEmail} />
        ) : (
          <>
            {activeTab === "home" && (
              <HomeTab
                isNativeApp={isNativeApp}
                webPlayerId={webPlayerId}
                devices={devices}
                playerState={playerState}
                webPlayerError={webPlayerError}
                browserPlaybackHelp={browserPlaybackHelp}
                fetchDevices={fetchDevices}
                loadingDevices={loadingDevices}
                estimatedPos={estimatedPos}
                handleSeekChange={handleSeekChange}
                handleSeekCommit={handleSeekCommit}
                handleShuffle={handleShuffle}
                handleSaveTimestamp={handleSaveTimestamp}
                snippetModeEnabled={snippetModeEnabled}
                nowPlayingTimestamps={nowPlayingTimestamps}
                selectedNowPlayingSnippetIndex={selectedNowPlayingSnippetIndex}
                handleSelectSnippet={handleSelectSnippet}
                jump={jump}
                handleDelete={handleDelete}
                snippetsOpen={snippetsOpen}
                setSnippetsOpen={setSnippetsOpen}
                snippetTracks={snippetTracks}
                playlists={playlists}
                prioritizedPlaylists={prioritizedPlaylists}
                remainingPlaylists={remainingPlaylists}
                playlistsOpen={playlistsOpen}
                setPlaylistsOpen={setPlaylistsOpen}
                openPlaylistId={openPlaylistId}
                playlistTracks={playlistTracks}
                loadingPlaylistId={loadingPlaylistId}
                playlistErrors={playlistErrors}
                handleTogglePlaylist={handleTogglePlaylist}
                handleQuickPlayPlaylist={handleQuickPlayPlaylist}
                playTrackWithMode={playTrackWithMode}
                recentlyPlayedTracks={recentlyPlayedTracks}
                prioritizedRecentlyPlayed={prioritizedRecentlyPlayed}
                remainingRecentlyPlayed={remainingRecentlyPlayed}
                recentlyPlayedOpen={recentlyPlayedOpen}
                setRecentlyPlayedOpen={setRecentlyPlayedOpen}
                setSelectedTrack={setSelectedTrack}
              />
            )}

            {activeTab === "search" && (
              <SearchTab
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                searchLoading={searchLoading}
                spotifyResults={spotifyResults}
                allTimestamps={allTimestamps}
                snippetModeEnabled={snippetModeEnabled}
                onSelectTrack={setSelectedTrack}
                onPlayTrackWithMode={playTrackWithMode}
                jump={jump}
              />
            )}

            {activeTab === "profile" && <ProfileTab onLogout={handleLogout} />}
          </>
        )}

        {selectedTrack && (
          <TrackDetailModal
            selectedTrack={selectedTrack}
            playerState={playerState}
            trackLookup={trackLookup}
            allTimestamps={allTimestamps}
            playlistTracks={playlistTracks}
            queueTracks={queueTracks}
            fallbackUpcomingTracks={fallbackUpcomingTracks}
            previousPlayerTrack={previousPlayerTrack}
            selectedSnippetIndexByTrack={selectedSnippetIndexByTrack}
            estimatedPos={estimatedPos}
            labelInput={labelInput}
            setLabelInput={setLabelInput}
            snippetModeEnabled={snippetModeEnabled}
            setSnippetModeEnabled={setSnippetModeEnabled}
            modalMenuOpen={modalMenuOpen}
            setModalMenuOpen={setModalMenuOpen}
            modalMenuSnippetsOpen={modalMenuSnippetsOpen}
            setModalMenuSnippetsOpen={setModalMenuSnippetsOpen}
            modalClipPressed={modalClipPressed}
            setModalClipPressed={setModalClipPressed}
            modalClipSaved={modalClipSaved}
            modalClipNotice={modalClipNotice}
            setSelectedTrack={setSelectedTrack}
            handleModalClip={handleModalClip}
            handleShuffle={handleShuffle}
            handleSkipPrevious={handleSkipPrevious}
            handleSkipNext={handleSkipNext}
            handlePlayPause={handlePlayPause}
            handleRepeatCycle={handleRepeatCycle}
            handleSelectSnippet={handleSelectSnippet}
            handleSaveTimestamp={handleSaveTimestamp}
            jump={jump}
            resolvePlaybackPosition={resolvePlaybackPosition}
            playTrackWithMode={playTrackWithMode}
            handleModalRingPointerDown={handleModalRingPointerDown}
            handleModalRingPointerMove={handleModalRingPointerMove}
            handleModalRingPointerUp={handleModalRingPointerUp}
          />
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
            onOpenNowPlaying={(track) => setSelectedTrack(track)}
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
    </AuthProvider>
  );
}
