import { normalizeTimestampsApiPayload } from "./snippet-track-storage";

export async function fetchAllTimestamps(token) {
  const res = await fetch("/api/timestamps", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return { timestamps: {}, trackMeta: {} };
  const data = await res.json();
  return normalizeTimestampsApiPayload(data);
}

export async function saveTimestamp(token, trackId, positionMs, label, trackMeta = null) {
  const res = await fetch("/api/timestamps", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      trackId,
      positionMs,
      label: label || null,
      trackMeta: trackMeta || undefined,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const error = new Error(body.error || "SAVE_FAILED");
    error.detail = body.detail || null;
    error.status = res.status;
    throw error;
  }
  return res.json(); // returns updated timestamps array for that track
}

export async function updateTimestamp(token, trackId, index, label) {
  const res = await fetch("/api/timestamps", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ trackId, index, label: label || null }),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function deleteTimestamp(token, trackId, index) {
  const res = await fetch("/api/timestamps", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ trackId, index }),
  });
  if (!res.ok) return null;
  return res.json(); // returns updated timestamps array for that track
}

/** Remove every saved snippet for a track (deletes the whole group). */
export async function deleteAllTimestampsForTrack(token, trackId) {
  const res = await fetch("/api/timestamps", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ trackId, deleteAll: true }),
  });
  if (!res.ok) return null;
  return res.json();
}

export function formatMs(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}
