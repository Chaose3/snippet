/**
 * Normalize spotify: URIs and open.spotify.com links to spotify:type:id.
 * @param {string} input
 * @returns {string|null}
 */
export function normalizeSpotifyUri(input) {
  if (!input || typeof input !== "string") return null;
  const s = input.trim();
  const spotify = /^spotify:(track|episode|album|playlist):([a-zA-Z0-9]+)/i.exec(s);
  if (spotify) return `spotify:${spotify[1].toLowerCase()}:${spotify[2]}`;
  const web = /open\.spotify\.com\/(track|episode|album|playlist)\/([a-zA-Z0-9]+)/i.exec(s);
  if (web) return `spotify:${web[1].toLowerCase()}:${web[2]}`;
  return null;
}

/**
 * Build https://open.spotify.com/... for a spotify: URI (track, album, episode, playlist).
 * Used as a fallback when App Remote / Web API playback cannot start.
 * @param {string} spotifyUri e.g. spotify:track:4iV5W9uYEdYUVa79Axb7U9
 * @param {number} [positionMs] start offset; passed as ?t=seconds when > 0
 * @returns {string|null}
 */
export function getSpotifyWebOpenUrl(spotifyUri, positionMs = 0) {
  const normalized = normalizeSpotifyUri(spotifyUri) ?? spotifyUri;
  if (!normalized || typeof normalized !== "string") return null;
  const m = /^spotify:(track|episode|album|playlist):([a-zA-Z0-9]+)/i.exec(normalized);
  if (!m) return null;
  const [, kind, id] = m;
  const sec = Math.max(0, Math.floor(Number(positionMs) / 1000));
  const base = `https://open.spotify.com/${kind}/${id}`;
  return sec > 0 ? `${base}?t=${sec}` : base;
}
