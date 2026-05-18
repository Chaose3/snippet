"use client";

import { memo } from "react";
import { useAppPlayback } from "../../contexts/AppPlaybackContext";
import { useAppSearch } from "../../contexts/AppSearchContext";
import { s } from "./homeStyles";
import { SearchInputOrb } from "./SearchInputOrb";
import { SearchTab } from "./SearchTab";

/** Search field isolated from playback context so polls do not block keyboard focus. */
const SearchPageHeader = memo(function SearchPageHeader() {
  const { searchQuery, setSearchQuery } = useAppSearch();
  return (
    <>
      <p style={s.tabHeading}>Search</p>
      <SearchInputOrb value={searchQuery} onChange={setSearchQuery} />
    </>
  );
});

const SearchPageResults = memo(function SearchPageResults() {
  const { searchQuery, searchLoading, spotifyResults } = useAppSearch();
  const {
    allTimestamps,
    snippetModeEnabled,
    openPlayerForTrack,
    prefetchPlayerRoute,
    playTrackWithMode,
    jump,
  } = useAppPlayback();

  return (
    <SearchTab
      searchQuery={searchQuery}
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
});

export function SearchPageContent() {
  const { token } = useAppPlayback();
  if (!token) return null;

  return (
    <div style={s.searchPage}>
      <SearchPageHeader />
      <SearchPageResults />
    </div>
  );
}
