"use client";

import { useEffect } from "react";
import { isNativeCapacitor, NATIVE_OAUTH_REDIRECT_URI } from "../lib/capacitor/platform";
import { takePkceVerifier } from "../lib/capacitor/native-spotify-login";
import { spotifyConnectError, spotifyConnectLog, spotifyConnectWarn } from "../lib/capacitor/spotify-connect-log";
import { notifyAuthComplete } from "../lib/auth-events";
import { AUTH_MODE_WEB_API, persistSpotifySession } from "../lib/auth-storage";
import { warmNativeSpotifyConnection } from "../lib/capacitor/native-spotify-login";
import { accessTokenHasRequiredWebApiScopes } from "../lib/spotify-web-api-token";
import { grantedScopesIncludeRequired } from "../lib/spotify-scopes";

async function exchangeCodeForToken({ code, verifier, redirectUri }) {
  spotifyConnectLog("token.exchange.request", {
    redirectUri,
    codePrefix: code ? `${code.slice(0, 8)}…` : null,
    verifierLength: verifier?.length ?? 0,
  });
  const res = await fetch("/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      code_verifier: verifier,
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    spotifyConnectError("token.exchange.failed", { status: res.status, body });
    throw new Error(body?.detail || body?.error || `Token exchange failed (${res.status})`);
  }
  const data = await res.json();
  spotifyConnectLog("token.exchange.ok", {
    expiresIn: data.expires_in,
    hasRefreshToken: Boolean(data.refresh_token),
    scope: data.scope,
  });
  return data;
}

/** PKCE uses ?code=; Spotify app SDK may use ?access_token= or #access_token=. */
function extractAccessTokenFromCallbackUrl(url) {
  try {
    const parsed = new URL(url);
    const fromQuery = parsed.searchParams.get("access_token");
    if (fromQuery) return fromQuery;
    const hash = parsed.hash?.replace(/^#/, "");
    if (hash) {
      return new URLSearchParams(hash).get("access_token");
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Deep link (snippet://callback) after in-app Browser sheet or Spotify app auth.
 * WebView OAuth uses /callback HTML instead — no deep link needed.
 */
export function useCapacitorOAuth({ setToken, setUrlError }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isNativeCapacitor()) {
      spotifyConnectLog("deeplink.skip", { reason: "not native Capacitor" });
      return;
    }

    let remove = null;
    let removeBrowserFinished = null;
    (async () => {
      try {
        spotifyConnectLog("deeplink.init", { listeningFor: NATIVE_OAUTH_REDIRECT_URI });
        const { App } = await import("@capacitor/app");
        const { Browser } = await import("@capacitor/browser");

        try {
          const browserSub = await Browser.addListener("browserFinished", () => {
            spotifyConnectLog("browser.finished", {
              hint: "Auth sheet closed — if login succeeded you should have seen deeplink.init → deeplink.received first",
            });
          });
          removeBrowserFinished = () => browserSub?.remove?.();
        } catch (browserListenErr) {
          spotifyConnectWarn("browser.listener.failed", { message: browserListenErr?.message });
        }

        const finishLogin = async (data) => {
          spotifyConnectLog("login.finish", {
            hasAccessToken: Boolean(data?.access_token),
            source: data?.source ?? null,
            scope: data?.scope ?? null,
          });
          if (!data?.access_token) {
            setUrlError("Spotify login did not return an access token.");
            await Browser.close().catch(() => {});
            return;
          }

          const scopeOk =
            grantedScopesIncludeRequired(data.scope) ||
            (await accessTokenHasRequiredWebApiScopes(data.access_token, { scope: data.scope }));
          if (!scopeOk) {
            spotifyConnectWarn("login.missingScopes", { source: data.source ?? null });
            setUrlError(
              "Spotify login succeeded but required permissions were not granted. Log out, tap Connect again, and approve all permissions."
            );
            await Browser.close().catch(() => {});
            return;
          }

          persistSpotifySession({
            ...data,
            auth_mode: AUTH_MODE_WEB_API,
          });
          setToken(data.access_token);
          setUrlError(null);
          notifyAuthComplete();
          warmNativeSpotifyConnection();
          await Browser.close().catch(() => {});
        };

        const handler = async ({ url }) => {
          try {
            spotifyConnectLog("deeplink.raw", { url: url ?? null });
            if (!url) return;
            if (!url.startsWith("snippet://callback")) {
              spotifyConnectLog("deeplink.ignored", {
                reason: "URL is not snippet://callback",
                url,
              });
              return;
            }
            spotifyConnectLog("deeplink.received", { url });
            const parsed = new URL(url);
            const code = parsed.searchParams.get("code");
            const accessTokenFromUrl = extractAccessTokenFromCallbackUrl(url);
            const verifierFromState = parsed.searchParams.get("state");
            const verifier = verifierFromState || takePkceVerifier();
            const error = parsed.searchParams.get("error");

            spotifyConnectLog("deeplink.parsed", {
              hasCode: Boolean(code),
              hasAccessToken: Boolean(accessTokenFromUrl),
              hasVerifier: Boolean(verifier),
              verifierSource: verifierFromState ? "state" : "sessionStorage",
              error,
            });

            if (error) {
              spotifyConnectWarn("deeplink.spotifyError", { error });
              setUrlError(error);
              await Browser.close().catch(() => {});
              return;
            }

            // PKCE ?code= must win over App Remote #access_token= (same redirect, wrong token).
            if (code && verifier) {
              const data = await exchangeCodeForToken({
                code,
                verifier,
                redirectUri: NATIVE_OAUTH_REDIRECT_URI,
              });
              await finishLogin({ ...data, source: "pkce" });
              return;
            }

            if (accessTokenFromUrl) {
              spotifyConnectLog("deeplink.appRemoteToken.ignored", {
                hint: "App Remote token is kept by the Spotify SDK; Snippet session uses PKCE Web API token only",
              });
              warmNativeSpotifyConnection();
              await Browser.close().catch(() => {});
              return;
            }

            spotifyConnectWarn("deeplink.missingParams", { hasCode: Boolean(code), hasVerifier: Boolean(verifier) });
            setUrlError("Missing OAuth code or verifier. Try connecting again.");
            await Browser.close().catch(() => {});
          } catch (e) {
            spotifyConnectError("deeplink.handler.failed", { error: e });
            setUrlError(String(e?.message || e || "OAuth callback error"));
            await Browser.close().catch(() => {});
          }
        };

        const sub = await App.addListener("appUrlOpen", handler);
        remove = () => sub?.remove?.();
        spotifyConnectLog("deeplink.listener.ready", { event: "appUrlOpen" });

        const launch = await App.getLaunchUrl().catch((e) => {
          spotifyConnectWarn("deeplink.getLaunchUrl.failed", { message: e?.message });
          return null;
        });
        if (launch?.url) {
          spotifyConnectLog("deeplink.coldStart", { url: launch.url });
          await handler({ url: launch.url });
        } else {
          spotifyConnectLog("deeplink.coldStart", { url: null });
        }
      } catch (e) {
        spotifyConnectError("deeplink.init.failed", { error: e });
      }
    })();

    return () => {
      try {
        if (remove) remove();
        if (removeBrowserFinished) removeBrowserFinished();
      } catch {
        /* ignore */
      }
    };
  }, [setToken, setUrlError]);
}
