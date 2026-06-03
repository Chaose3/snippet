import { mergeTrackMetaMaps } from "./snippet-track-storage";

export const STORAGE_TRACK_META = "snippet_track_meta_v1";

export function loadCachedTrackMeta() {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_TRACK_META);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveCachedTrackMeta(meta) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_TRACK_META, JSON.stringify(meta ?? {}));
  } catch {
    /* quota */
  }
}

export function clearCachedTrackMeta() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_TRACK_META);
}

/** Drop meta for tracks that no longer have snippets. */
export function pruneTrackMeta(meta, allTimestamps) {
  const out = { ...meta };
  for (const trackId of Object.keys(out)) {
    const tss = allTimestamps?.[trackId];
    if (!Array.isArray(tss) || tss.length === 0) delete out[trackId];
  }
  return out;
}

export { mergeTrackMetaMaps };
