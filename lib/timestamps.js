const STORAGE_KEY = "snippet_timestamps";

function loadAll() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveAll(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getTimestamps(trackId) {
  return loadAll()[trackId] || [];
}

export function saveTimestamp(trackId, positionMs, label) {
  const all = loadAll();
  const timestamps = all[trackId] || [];
  timestamps.push({ positionMs, label: label || formatMs(positionMs) });
  timestamps.sort((a, b) => a.positionMs - b.positionMs);
  all[trackId] = timestamps;
  saveAll(all);
  return timestamps;
}

export function deleteTimestamp(trackId, index) {
  const all = loadAll();
  const timestamps = all[trackId] || [];
  timestamps.splice(index, 1);
  all[trackId] = timestamps;
  saveAll(all);
  return timestamps;
}

export function formatMs(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}