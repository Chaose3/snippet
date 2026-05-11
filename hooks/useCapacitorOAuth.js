"use client";

import { useEffect } from "react";
import { isNativeCapacitor, NATIVE_OAUTH_REDIRECT_URI } from "../lib/capacitor/platform";
import { STORAGE_EXPIRES, STORAGE_KEY, STORAGE_REFRESH } from "../lib/auth-storage";

/**
 * Listens for snippet://callback deep links and exchanges the code via /api/token.
 * Must not change redirect_uri or URL prefix without updating Spotify app + iOS URL types.
 */
export function useCapacitorOAuth({ setToken, setUrlError }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isNativeCapacitor()) return;

    let remove = null;
    (async () => {
      try {
        const { App } = await import("@capacitor/app");
        const { Browser } = await import("@capacitor/browser");

        const handler = async ({ url }) => {
          try {
            if (!url || !url.startsWith("snippet://callback")) return;
            const parsed = new URL(url);
            const code = parsed.searchParams.get("code");
            const verifier = parsed.searchParams.get("state");
            const error = parsed.searchParams.get("error");

            if (error) {
              setUrlError(error);
              await Browser.close().catch(() => {});
              return;
            }

            if (!code || !verifier) {
              setUrlError("Missing OAuth code/verifier");
              await Browser.close().catch(() => {});
              return;
            }

            const res = await fetch("/api/token", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                code,
                code_verifier: verifier,
                redirect_uri: NATIVE_OAUTH_REDIRECT_URI,
              }),
            });

            if (!res.ok) {
              const body = await res.json().catch(() => ({}));
              setUrlError(body?.detail || body?.error || `Token exchange failed (${res.status})`);
              await Browser.close().catch(() => {});
              return;
            }

            const data = await res.json();
            const accessToken = data.access_token;
            const refreshToken = data.refresh_token ?? null;
            const expiresIn = data.expires_in ?? 3600;

            localStorage.setItem(STORAGE_KEY, accessToken);
            if (refreshToken) localStorage.setItem(STORAGE_REFRESH, refreshToken);
            localStorage.setItem(STORAGE_EXPIRES, String(Date.now() + expiresIn * 1000));

            setToken(accessToken);
            setUrlError(null);
            await Browser.close().catch(() => {});
          } catch (e) {
            setUrlError(String(e?.message || e || "OAuth callback error"));
          }
        };

        const sub = await App.addListener("appUrlOpen", handler);
        remove = () => sub?.remove?.();

        const launch = await App.getLaunchUrl().catch(() => null);
        if (launch?.url) {
          await handler({ url: launch.url });
        }
      } catch (e) {
        console.warn("[nativeOAuth] failed to init deep link listener", e);
      }
    })();

    return () => {
      try {
        if (remove) remove();
      } catch {
        /* ignore */
      }
    };
  }, [setToken, setUrlError]);
}
