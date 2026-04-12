/**
 * Spotify API helpers — identical logic to the web lib/snippet.js,
 * but runs natively in React Native (fetch is available globally).
 */

export async function playSnippet(accessToken, snippet) {
  const body = {
    uris: [snippet.trackUri],
    position_ms: snippet.positionMs,
  };

  const res = await fetch('https://api.spotify.com/v1/me/player/play', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  return res;
}

export async function getPlayerState(accessToken) {
  const res = await fetch('https://api.spotify.com/v1/me/player', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 204 || !res.ok) return null;

  const data = await res.json();
  if (!data || !data.item) return null;

  return {
    id: data.item.id,
    name: data.item.name,
    uri: data.item.uri,
    artists: data.item.artists.map((a) => a.name).join(', '),
    albumArt: data.item.album.images[0]?.url ?? null,
    durationMs: data.item.duration_ms,
    positionMs: data.progress_ms,
    isPlaying: data.is_playing,
    shuffle: data.shuffle_state,
    volumePercent: data.device?.volume_percent ?? null,
  };
}

export async function seekToPosition(accessToken, positionMs) {
  return fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${positionMs}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function pausePlayback(accessToken) {
  return fetch('https://api.spotify.com/v1/me/player/pause', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function resumePlayback(accessToken) {
  return fetch('https://api.spotify.com/v1/me/player/play', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function setVolume(accessToken, volumePercent) {
  return fetch(
    `https://api.spotify.com/v1/me/player/volume?volume_percent=${Math.round(volumePercent)}`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
}

export async function setShuffle(accessToken, state) {
  return fetch(`https://api.spotify.com/v1/me/player/shuffle?state=${state}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function getLikedTracks(accessToken) {
  const tracks = [];
  let url = 'https://api.spotify.com/v1/me/tracks?limit=50';

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) break;
    const data = await res.json();
    const page = (data.items || [])
      .filter((item) => item.track?.id)
      .map((item) => ({
        id: item.track.id,
        name: item.track.name,
        uri: item.track.uri,
        artists: item.track.artists.map((a) => a.name).join(', '),
        durationMs: item.track.duration_ms,
        albumArt: item.track.album.images?.[0]?.url ?? null,
      }));
    tracks.push(...page);
    url = data.next ?? null;
  }

  return tracks;
}

export async function getUserPlaylists(accessToken) {
  const res = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.items || []).map((p) => ({
    id: p.id,
    name: p.name,
    trackCount: p.tracks.total,
    coverArt: p.images?.[0]?.url ?? null,
  }));
}

export async function getPlaylistTracks(accessToken, playlistId) {
  const fields = 'items(track(id,name,uri,duration_ms,artists(name),album(images)))';
  const res = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100&fields=${encodeURIComponent(fields)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.items || [])
    .filter((item) => item.track?.id)
    .map((item) => ({
      id: item.track.id,
      name: item.track.name,
      uri: item.track.uri,
      artists: item.track.artists.map((a) => a.name).join(', '),
      durationMs: item.track.duration_ms,
      albumArt: item.track.album.images?.[0]?.url ?? null,
    }));
}
