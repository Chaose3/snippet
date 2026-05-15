import { startTransition, useEffect, useState } from "react";
import { getStoredToken } from "../lib/auth-storage";
import { searchTracks } from "../lib/snippet";

export function useSpotifySearchTab({ isSearchRoute, deferredSearchQuery, doRefresh }) {
  const [spotifyResults, setSpotifyResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (!isSearchRoute || !deferredSearchQuery.trim()) {
      setSpotifyResults([]);
      setSearchLoading(false);
      return;
    }

    let cancelled = false;
    setSearchLoading(true);
    const id = setTimeout(async () => {
      try {
        const t = getStoredToken();
        if (!t || cancelled) {
          if (!cancelled) setSearchLoading(false);
          return;
        }
        const results = await searchTracks(t, deferredSearchQuery.trim());
        if (cancelled) return;
        startTransition(() => setSpotifyResults(results));
      } catch (err) {
        if (cancelled) return;
        if (err.message === "TOKEN_EXPIRED") {
          const newToken = await doRefresh();
          if (newToken && !cancelled) {
            const results = await searchTracks(newToken, deferredSearchQuery.trim()).catch(() => []);
            if (!cancelled) startTransition(() => setSpotifyResults(results));
          }
        }
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [deferredSearchQuery, isSearchRoute, doRefresh]);

  return { spotifyResults, searchLoading };
}
