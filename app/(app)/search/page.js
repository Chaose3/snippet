"use client";

import { useAppPlayback } from "../../../contexts/AppPlaybackContext";
import { SearchTab } from "../../../components/snippet/SearchTab";

export default function SearchPage() {
  const {
    token,
    searchQuery,
    setSearchQuery,
    searchLoading,
    spotifyResults,
    allTimestamps,
    snippetModeEnabled,
    openPlayerForTrack,
    prefetchPlayerRoute,
    playTrackWithMode,
    jump,
  } = useAppPlayback();

  if (!token) return null;

  return (
    <SearchTab
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
      searchLoading={searchLoading}
      spotifyResults={spotifyResults}
      allTimestamps={allTimestamps}
      snippetModeEnabled={snippetModeEnabled}
      onOpenTrack={openPlayerForTrack}
      onPrefetchPlayer={prefetchPlayerRoute}
      onPlayTrackWithMode={playTrackWithMode}
      jump={jump}
    />
  );
}
