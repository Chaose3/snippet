import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { SNIPPET_AUTH_COMPLETE } from "../lib/auth-events";
import { getStoredScope } from "../lib/auth-storage";
import { grantedScopesIncludeRequired } from "../lib/spotify-scopes";
import {
  getUserPlaylists,
  getPlaylistTracks,
  getLikedTracks,
  getRecentlyPlayed,
  getCurrentUserProfile,
  PLAYLIST_ITEMS_FORBIDDEN_MESSAGE,
  RECENTLY_PLAYED_SCOPE_MESSAGE,
} from "../lib/snippet";

function enrichPlaylistsWithOwnership(playlists, currentUserId) {
  if (!currentUserId) return playlists;
  return playlists.map((pl) => ({
    ...pl,
    canExpandTracks: Boolean(pl.ownerId && pl.ownerId === currentUserId),
  }));
}

export function useSnippetLibrary({ token, withFreshToken }) {
  const [playlists, setPlaylists] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [userMarket, setUserMarket] = useState(null);
  const [openPlaylistId, setOpenPlaylistId] = useState(null);
  const [playlistTracks, setPlaylistTracks] = useState({});
  const [loadingPlaylistId, setLoadingPlaylistId] = useState(null);
  const [playlistErrors, setPlaylistErrors] = useState({});
  const [likedTracks, setLikedTracks] = useState(null);
  const [recentlyPlayedTracks, setRecentlyPlayedTracks] = useState([]);
  const [recentlyPlayedError, setRecentlyPlayedError] = useState(null);
  const [libraryReloadKey, setLibraryReloadKey] = useState(0);

  const playlistsWithAccess = useMemo(
    () => enrichPlaylistsWithOwnership(playlists, currentUserId),
    [playlists, currentUserId]
  );

  const loadLibrary = useCallback(() => {
    if (!token) return;
    setLibraryReloadKey((k) => k + 1);
  }, [token]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onAuth = () => loadLibrary();
    window.addEventListener(SNIPPET_AUTH_COMPLETE, onAuth);
    return () => window.removeEventListener(SNIPPET_AUTH_COMPLETE, onAuth);
  }, [loadLibrary]);

  useEffect(() => {
    if (!token) {
      setCurrentUserId(null);
      setUserMarket(null);
      return;
    }
    withFreshToken((accessToken) => getCurrentUserProfile(accessToken))
      .then((profile) => {
        if (profile?.id) {
          setCurrentUserId(profile.id);
          setUserMarket(profile.country ?? null);
        }
      })
      .catch((err) => console.warn("[currentUser] failed to load", err));
  }, [token, withFreshToken, libraryReloadKey]);

  useEffect(() => {
    if (!token || playlists.length > 0) return;
    withFreshToken((accessToken) => getUserPlaylists(accessToken))
      .then((items) => {
        if (items) {
          startTransition(() => setPlaylists(items));
        }
      })
      .catch((err) => console.warn("[playlists] failed to load", err));
  }, [token, playlists.length, withFreshToken, libraryReloadKey]);

  useEffect(() => {
    if (!token || likedTracks !== null) return;
    withFreshToken((accessToken) => getLikedTracks(accessToken))
      .then((tracks) => {
        if (tracks) {
          startTransition(() => setLikedTracks(tracks));
        }
      })
      .catch((err) => console.warn("[likedTracks] failed to load", err));
  }, [token, likedTracks, withFreshToken, libraryReloadKey]);

  useEffect(() => {
    if (!token) {
      setRecentlyPlayedTracks([]);
      setRecentlyPlayedError(null);
      return;
    }

    const storedScope = getStoredScope();
    if (storedScope && !grantedScopesIncludeRequired(storedScope)) {
      setRecentlyPlayedTracks([]);
      setRecentlyPlayedError(RECENTLY_PLAYED_SCOPE_MESSAGE);
      return;
    }

    withFreshToken((accessToken) => getRecentlyPlayed(accessToken))
      .then((result) => {
        if (!result) return;
        startTransition(() => {
          setRecentlyPlayedTracks(result.tracks ?? []);
          setRecentlyPlayedError(result.error ?? null);
        });
      })
      .catch((err) => console.warn("[recentlyPlayed] failed to load", err));
  }, [token, withFreshToken, libraryReloadKey]);

  const handleTogglePlaylist = useCallback(
    async (playlistId) => {
      if (openPlaylistId === playlistId) {
        setOpenPlaylistId(null);
        return;
      }
      setOpenPlaylistId(playlistId);

      const playlist = playlistsWithAccess.find((pl) => pl.id === playlistId);
      if (playlist && playlist.canExpandTracks === false) {
        setPlaylistErrors((prev) => ({
          ...prev,
          [playlistId]: PLAYLIST_ITEMS_FORBIDDEN_MESSAGE,
        }));
        return;
      }

      if (playlistTracks[playlistId]) return;
      setLoadingPlaylistId(playlistId);
      setPlaylistErrors((prev) => {
        const next = { ...prev };
        delete next[playlistId];
        return next;
      });
      try {
        const result = await withFreshToken((accessToken) =>
          getPlaylistTracks(accessToken, playlistId, { market: userMarket })
        ).catch((err) => {
          console.warn("[playlistTracks] failed to load", playlistId, err);
          return null;
        });
        if (result) {
          startTransition(() => {
            setPlaylistTracks((prev) => ({ ...prev, [playlistId]: result.tracks }));
          });
          if (result.forbidden) {
            setPlaylistErrors((prev) => ({
              ...prev,
              [playlistId]: result.message ?? PLAYLIST_ITEMS_FORBIDDEN_MESSAGE,
            }));
          }
        }
      } finally {
        setLoadingPlaylistId(null);
      }
    },
    [openPlaylistId, playlistTracks, playlistsWithAccess, withFreshToken, userMarket]
  );

  const resetLibrary = useCallback(() => {
    setPlaylists([]);
    setCurrentUserId(null);
    setUserMarket(null);
    setOpenPlaylistId(null);
    setPlaylistTracks({});
    setPlaylistErrors({});
    setLikedTracks(null);
    setRecentlyPlayedTracks([]);
    setRecentlyPlayedError(null);
  }, []);

  return {
    playlists: playlistsWithAccess,
    openPlaylistId,
    playlistTracks,
    loadingPlaylistId,
    playlistErrors,
    likedTracks,
    recentlyPlayedTracks,
    recentlyPlayedError,
    handleTogglePlaylist,
    resetLibrary,
    reloadLibrary: loadLibrary,
  };
}
