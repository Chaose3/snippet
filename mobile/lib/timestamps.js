/**
 * Timestamps API — calls the Next.js backend.
 *
 * Set EXPO_PUBLIC_API_URL in your .env file:
 *   - Local dev:   http://<your-LAN-ip>:3000  (not 127.0.0.1 — the device can't reach that)
 *   - Production:  https://your-app.vercel.app
 */
const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');

export async function fetchAllTimestamps(token) {
  try {
    const res = await fetch(`${API_URL}/api/timestamps`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return {};
    return res.json();
  } catch {
    return {};
  }
}

export async function saveTimestamp(token, trackId, positionMs, label) {
  const res = await fetch(`${API_URL}/api/timestamps`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ trackId, positionMs, label: label || null }),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function deleteTimestamp(token, trackId, index) {
  const res = await fetch(`${API_URL}/api/timestamps`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ trackId, index }),
  });
  if (!res.ok) return null;
  return res.json();
}

export function formatMs(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}
