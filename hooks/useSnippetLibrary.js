import { startTransition, useCallback, useEffect, useState } from "react";
import {
  getUserPlaylists,
  getPlaylistTracks,
  getLikedTracks,
  getRecentlyPlayed,
} from "../lib/snippet";

export function useSnippetLibrary({ token, withFreshToken }) {
  const [playlists, setPlaylists] = useState([]);
  const [openPlaylistId, setOpenPlaylistId] = useState(null);
  const [playlistTracks, setPlaylistTracks] = useState({});
  const [loadingPlaylistId, setLoadingPlaylistId] = useState(null);
  const [playlistErrors, setPlaylistErrors] = useState({});
  const [likedTracks, setLikedTracks] = useState(null);
  const [recentlyPlayedTracks, setRecentlyPlayedTracks] = useState([]);

  useEffect(() => {
    if (!token || playlists.length > 0) return;
    withFreshToken((accessToken) => getUserPlaylists(accessToken))
      .then((items) => {
        if (items) {
          startTransition(() => setPlaylists(items));
        }
      })
      .catch((err) => console.warn("[playlists] failed to load", err));
  }, [token, playlists.length, withFreshToken]);

  useEffect(() => {
    if (!token || likedTracks !== null) return;
    withFreshToken((accessToken) => getLikedTracks(accessToken))
      .then((tracks) => {
        if (tracks) {
          startTransition(() => setLikedTracks(tracks));
        }
      })
      .catch((err) => console.warn("[likedTracks] failed to load", err));
  }, [token, likedTracks, withFreshToken]);

  useEffect(() => {
    if (!token) {
      setRecentlyPlayedTracks([]);
      return;
    }
    withFreshToken((accessToken) => getRecentlyPlayed(accessToken))
      .then((tracks) => {
        if (tracks) {
          startTransition(() => setRecentlyPlayedTracks(tracks));
        }
      })
      .catch((err) => console.warn("[recentlyPlayed] failed to load", err));
  }, [token, withFreshToken]);

  const handleTogglePlaylist = useCallback(
    async (playlistId) => {
      if (openPlaylistId === playlistId) {
        setOpenPlaylistId(null);
        return;
      }
      setOpenPlaylistId(playlistId);
      if (playlistTracks[playlistId]) return;
      setLoadingPlaylistId(playlistId);
      try {
        const result = await withFreshToken((accessToken) => getPlaylistTracks(accessToken, playlistId))
          .catch((err) => {
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
              [playlistId]: "This playlist can't be accessed. It may be private or managed by Spotify.",
            }));
          }
        }
      } finally {
        setLoadingPlaylistId(null);
      }
    },
    [openPlaylistId, playlistTracks, withFreshToken]
  );

  const resetLibrary = useCallback(() => {
    setPlaylists([]);
    setOpenPlaylistId(null);
    setPlaylistTracks({});
    setLikedTracks(null);
    setRecentlyPlayedTracks([]);
  }, []);

  return {
    playlists,
    openPlaylistId,
    playlistTracks,
    loadingPlaylistId,
    playlistErrors,
    likedTracks,
    recentlyPlayedTracks,
    handleTogglePlaylist,
    resetLibrary,
  };
}
