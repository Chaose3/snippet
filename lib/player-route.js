/** Canonical full-screen player path (track id lives in context + optional `?t=`). */
export const PLAYER_PATH = "/player";

export function isPlayerPathname(pathname) {
  if (!pathname) return false;
  return pathname === PLAYER_PATH || pathname.startsWith(`${PLAYER_PATH}/`);
}

/** Legacy `/player/:trackId` segment (before redirect). */
export function trackIdFromPlayerPathname(pathname) {
  if (!pathname?.startsWith(`${PLAYER_PATH}/`)) return null;
  const rest = pathname.slice(`${PLAYER_PATH}/`.length).split("/").filter(Boolean);
  return rest[0] ?? null;
}

export function trackIdFromSearchParams(searchParams) {
  if (!searchParams) return null;
  const raw = typeof searchParams.get === "function" ? searchParams.get("t") : searchParams.t;
  return raw || null;
}

export function playerHref(trackId) {
  if (!trackId) return PLAYER_PATH;
  return `${PLAYER_PATH}?t=${encodeURIComponent(trackId)}`;
}
