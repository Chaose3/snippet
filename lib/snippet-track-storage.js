/** @typedef {{ name?: string, artists?: string, albumArt?: string | null, uri?: string, durationMs?: number }} SnippetTrackMeta */

/**
 * Redis / API track entry: legacy array of snippets or v2 { timestamps, meta }.
 * @returns {{ timestamps: Array, meta: SnippetTrackMeta | null }}
 */
export function readTrackEntry(raw) {
  if (raw == null) return { timestamps: [], meta: null };
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (Array.isArray(parsed)) return { timestamps: parsed, meta: null };
  if (parsed && Array.isArray(parsed.timestamps)) {
    return { timestamps: parsed.timestamps, meta: parsed.meta ?? null };
  }
  return { timestamps: [], meta: null };
}

export function serializeTrackEntry(timestamps, meta) {
  if (!meta?.name) {
    return JSON.stringify(timestamps);
  }
  return JSON.stringify({ timestamps, meta });
}

/** @param {import("./snippet-track-meta").SnippetTrackMetaInput | null | undefined} source */
export function trackMetaFromSource(source) {
  if (!source?.name) return null;
  return {
    name: source.name,
    artists: source.artists ?? "",
    albumArt: source.albumArt ?? null,
    uri: source.uri ?? (source.id ? `spotify:track:${source.id}` : undefined),
    durationMs: source.durationMs,
  };
}

/** Normalize GET payload: legacy flat map or { timestamps, trackMeta }. */
export function normalizeTimestampsApiPayload(data) {
  if (!data || typeof data !== "object") {
    return { timestamps: {}, trackMeta: {} };
  }
  if (data.timestamps && typeof data.timestamps === "object" && !Array.isArray(data.timestamps)) {
    return {
      timestamps: data.timestamps,
      trackMeta: data.trackMeta && typeof data.trackMeta === "object" ? data.trackMeta : {},
    };
  }
  const timestamps = {};
  const trackMeta = {};
  for (const [trackId, val] of Object.entries(data)) {
    const { timestamps: tss, meta } = readTrackEntry(val);
    if (tss.length > 0) timestamps[trackId] = tss;
    if (meta?.name) trackMeta[trackId] = meta;
  }
  return { timestamps, trackMeta };
}

export function mergeTrackMetaMaps(...maps) {
  const out = {};
  for (const map of maps) {
    if (!map || typeof map !== "object") continue;
    for (const [trackId, meta] of Object.entries(map)) {
      if (!meta?.name) continue;
      const prev = out[trackId];
      out[trackId] = prev ? { ...prev, ...meta, name: meta.name || prev.name } : { ...meta };
    }
  }
  return out;
}
