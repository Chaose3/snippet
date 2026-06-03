import { MAX_SNIPPETS_PER_TRACK } from "./snippet-ui-utils";

export const STORAGE_TIMESTAMPS = "snippet_all_timestamps_v1";

export function loadCachedTimestamps() {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_TIMESTAMPS);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveCachedTimestamps(all) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_TIMESTAMPS, JSON.stringify(all ?? {}));
  } catch {
    /* quota / private mode */
  }
}

export function clearCachedTimestamps() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_TIMESTAMPS);
}

function snippetKey(entry) {
  if (!entry || entry.positionMs == null) return null;
  const label = entry.label ?? "";
  return `${entry.positionMs}:${label}`;
}

function capTrackList(list) {
  const sorted = [...list].sort((a, b) => a.positionMs - b.positionMs);
  if (sorted.length <= MAX_SNIPPETS_PER_TRACK) return sorted;
  return sorted
    .slice()
    .sort((a, b) => {
      const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
      const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
      return tb - ta;
    })
    .slice(0, MAX_SNIPPETS_PER_TRACK)
    .sort((a, b) => a.positionMs - b.positionMs);
}

/** Union per track; remote entries win on duplicate position+label. */
export function mergeTimestampMaps(cached, remote) {
  const trackIds = new Set([
    ...Object.keys(cached || {}),
    ...Object.keys(remote || {}),
  ]);
  const out = {};
  for (const trackId of trackIds) {
    const byKey = new Map();
    for (const entry of cached?.[trackId] || []) {
      const key = snippetKey(entry);
      if (key) byKey.set(key, entry);
    }
    for (const entry of remote?.[trackId] || []) {
      const key = snippetKey(entry);
      if (key) byKey.set(key, entry);
    }
    const merged = capTrackList([...byKey.values()]);
    if (merged.length > 0) out[trackId] = merged;
  }
  return out;
}
