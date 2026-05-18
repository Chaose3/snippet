import { grantedScopesIncludeRequired } from "./spotify-scopes";

const PROBE_URL =
  "https://api.spotify.com/v1/me/player/recently-played?limit=1";

function isPermissionsError(res) {
  return res.status === 401 || res.status === 403;
}

/**
 * App Remote / implicit tokens often lack Web API scopes (401 "Permissions missing").
 * PKCE tokens include a space-separated scope string — prefer that when present.
 */
export async function accessTokenHasRequiredWebApiScopes(accessToken, { scope: grantedScope } = {}) {
  if (!accessToken) return false;
  if (grantedScope && grantedScopesIncludeRequired(grantedScope)) return true;

  try {
    const res = await fetch(PROBE_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (isPermissionsError(res)) return false;
    return res.ok || res.status === 204;
  } catch {
    return false;
  }
}

/** @deprecated Use accessTokenHasRequiredWebApiScopes */
export async function accessTokenSupportsWebPlaybackRead(accessToken) {
  return accessTokenHasRequiredWebApiScopes(accessToken);
}
