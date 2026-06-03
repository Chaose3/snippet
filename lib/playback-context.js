/** Last playlist/album context_uri used for Web API play (survives queue-only track objects). */
let activeContextUri = null;

export function rememberPlaybackContext(contextUri) {
  if (contextUri) activeContextUri = contextUri;
}

export function getActivePlaybackContextUri() {
  return activeContextUri;
}

export function pickPlaybackContextFields(track) {
  if (!track) return {};
  return {
    contextUri: track.contextUri ?? null,
    offsetUri: track.offsetUri ?? null,
    offsetPosition: track.offsetPosition,
  };
}

export function hasPlaybackContext(track) {
  return Boolean(
    track?.contextUri && (track.offsetUri || track.offsetPosition != null)
  );
}

/** Find a track index inside loaded playlist track lists. */
export function findInPlaylistTracks(trackId, playlistTracks) {
  if (!trackId || !playlistTracks) return null;
  for (const tracks of Object.values(playlistTracks)) {
    const index = tracks.findIndex((t) => t.id === trackId);
    if (index >= 0) {
      return {
        tracks,
        index,
        contextUri: tracks[0]?.contextUri ?? null,
      };
    }
  }
  return null;
}

/**
 * Attach context_uri + offset for Spotify /play when the track object is queue-only.
 */
export function withPlaybackContext(
  track,
  { trackLookup = {}, playlistTracks = {}, playerState = null } = {}
) {
  if (!track?.id) return track;
  if (hasPlaybackContext(track)) return track;

  const fromLookup = trackLookup[track.id];
  if (hasPlaybackContext(fromLookup)) {
    return { ...track, ...pickPlaybackContextFields(fromLookup) };
  }

  const inPlaylist = findInPlaylistTracks(track.id, playlistTracks);
  if (inPlaylist?.contextUri) {
    const row = inPlaylist.tracks[inPlaylist.index];
    return {
      ...track,
      contextUri: inPlaylist.contextUri,
      offsetUri: track.uri ?? row?.uri ?? null,
      offsetPosition: inPlaylist.index,
    };
  }

  const ctxUri = playerState?.contextUri ?? getActivePlaybackContextUri();
  if (ctxUri) {
    for (const tracks of Object.values(playlistTracks)) {
      if (tracks[0]?.contextUri && tracks[0].contextUri !== ctxUri) continue;
      const index = tracks.findIndex((t) => t.id === track.id);
      if (index >= 0) {
        return {
          ...track,
          contextUri: ctxUri,
          offsetUri: track.uri ?? tracks[index]?.uri ?? null,
          offsetPosition: index,
        };
      }
    }
    if (track.uri) {
      return {
        ...track,
        contextUri: ctxUri,
        offsetUri: track.uri,
      };
    }
  }

  return track;
}
