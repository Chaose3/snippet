"use client";

import { useAppPlayback } from "../../contexts/AppPlaybackContext";
import { usePlaybackPosition } from "../../contexts/PlaybackPositionContext";
import { LandingView } from "../../components/snippet/LandingView";
import { HomeTab } from "../../components/snippet/HomeTab";

export default function HomePage() {
  const pb = useAppPlayback();
  const { estimatedPos } = usePlaybackPosition();
  const {
    token,
    isNativeApp,
    webPlayerId,
    webPlayerError,
    devices,
    loadingDevices,
    fetchDevices,
    playerState,
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
    openPlayerForTrack,
    prefetchPlayerRoute,
    emailCopied,
    onCopySupportEmail,
  } = pb;

  if (!token) {
    return <LandingView emailCopied={emailCopied} onCopyEmail={onCopySupportEmail} />;
  }

  return (
    <HomeTab
      isNativeApp={isNativeApp}
      webPlayerId={webPlayerId}
      devices={devices}
      playerState={playerState}
      webPlayerError={webPlayerError}
      browserPlaybackHelp={pb.browserPlaybackHelp}
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
      onOpenPlayer={openPlayerForTrack}
      onPrefetchPlayer={prefetchPlayerRoute}
    />
  );
}
