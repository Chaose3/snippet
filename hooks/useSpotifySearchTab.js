import { startTransition, useEffect, useState } from "react";
import { getStoredToken } from "../lib/auth-storage";
import { searchTracks } from "../lib/snippet";

export function useSpotifySearchTab({ activeTab, deferredSearchQuery, doRefresh }) {
  const [spotifyResults, setSpotifyResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (activeTab !== "search" || !deferredSearchQuery) {
      setSpotifyResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const id = setTimeout(async () => {
      try {
        const t = getStoredToken();
        if (!t) {
          setSearchLoading(false);
          return;
        }
        const results = await searchTracks(t, deferredSearchQuery);
        startTransition(() => setSpotifyResults(results));
      } catch (err) {
        if (err.message === "TOKEN_EXPIRED") {
          const newToken = await doRefresh();
          if (newToken) {
            const results = await searchTracks(newToken, deferredSearchQuery).catch(() => []);
            startTransition(() => setSpotifyResults(results));
          }
        }
      } finally {
        setSearchLoading(false);
      }
    }, 350);
    return () => clearTimeout(id);
  }, [deferredSearchQuery, activeTab, doRefresh]);

  return { spotifyResults, searchLoading };
}
