"use client";

import { memo } from "react";
import { HomeBrowserPlaybackHint } from "./HomeBrowserPlaybackHint";
import { HomeNowPlayingCard } from "./HomeNowPlayingCard";
import { HomePlaylistsSection } from "./HomePlaylistsSection";
import { HomeRecentlyPlayedSection } from "./HomeRecentlyPlayedSection";

export const HomeTab = memo(function HomeTab({
  isNativeApp,
  webPlayerId,
  devices,
  playerState,
  webPlayerError,
  browserPlaybackHelp,
  fetchDevices,
  loadingDevices,
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
  setSelectedTrack,
}) {
  return (
    <>
      {!playerState && !isNativeApp && !webPlayerId && devices.length === 0 ? (
        <HomeBrowserPlaybackHint
          browserPlaybackHelp={browserPlaybackHelp}
          webPlayerError={webPlayerError}
          fetchDevices={fetchDevices}
          loadingDevices={loadingDevices}
        />
      ) : (
        <HomeNowPlayingCard
          playerState={playerState}
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
          snippetTrackCount={snippetTracks.length}
        />
      )}

      <HomePlaylistsSection
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
      />

      <HomeRecentlyPlayedSection
        recentlyPlayedTracks={recentlyPlayedTracks}
        prioritizedRecentlyPlayed={prioritizedRecentlyPlayed}
        remainingRecentlyPlayed={remainingRecentlyPlayed}
        recentlyPlayedOpen={recentlyPlayedOpen}
        setRecentlyPlayedOpen={setRecentlyPlayedOpen}
        setSelectedTrack={setSelectedTrack}
      />
    </>
  );
});
