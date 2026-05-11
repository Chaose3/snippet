import { useCallback, useEffect, useState } from "react";
import {
  getStoredRefreshToken,
  getStoredToken,
  getStoredExpiry,
  STORAGE_KEY,
  STORAGE_REFRESH,
  STORAGE_EXPIRES,
} from "../lib/auth-storage";

export function useSpotifyToken() {
  const [token, setToken] = useState(null);

  const doRefresh = useCallback(async () => {
    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) return null;

    const res = await fetch("/api/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) {
      console.warn("[doRefresh] refresh failed", res.status);
      return null;
    }

    const data = await res.json();
    const newToken = data.access_token;
    const expiresAt = Date.now() + (data.expires_in ?? 3600) * 1000;

    localStorage.setItem(STORAGE_KEY, newToken);
    localStorage.setItem(STORAGE_EXPIRES, String(expiresAt));
    if (data.refresh_token) {
      localStorage.setItem(STORAGE_REFRESH, data.refresh_token);
    }

    setToken(newToken);
    console.log("[doRefresh] token refreshed, expires in", data.expires_in, "s");
    return newToken;
  }, []);

  const withFreshToken = useCallback(
    async (requestFn) => {
      let currentToken = getStoredToken();
      if (!currentToken) return null;

      try {
        return await requestFn(currentToken);
      } catch (err) {
        if (err.message !== "TOKEN_EXPIRED") throw err;
        const newToken = await doRefresh();
        if (!newToken) return null;
        return requestFn(newToken);
      }
    },
    [doRefresh]
  );

  useEffect(() => {
    if (!token) return;
    const expiry = getStoredExpiry();
    if (!expiry) return;

    const msUntilRefresh = expiry - Date.now() - 5 * 60 * 1000;
    if (msUntilRefresh <= 0) {
      doRefresh();
      return;
    }

    const id = setTimeout(() => doRefresh(), msUntilRefresh);
    return () => clearTimeout(id);
  }, [token, doRefresh]);

  return { token, setToken, doRefresh, withFreshToken };
}
