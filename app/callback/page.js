"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const STORAGE_ACCESS = "spotify_access_token";
const STORAGE_REFRESH = "spotify_refresh_token";
const STORAGE_EXPIRES = "spotify_token_expires_at";

export default function CallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Completing Spotify login…");

  useEffect(() => {
    const params = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : ""
    );

    const error = params.get("error");
    const errorDescription = params.get("error_description");
    const code = params.get("code");
    const codeVerifier = params.get("state"); // verifier we sent via OAuth state param

    console.log("[callback] query", {
      hasCode: Boolean(code),
      error,
      errorDescription,
    });

    if (error) {
      console.error("[callback] Spotify error", error, errorDescription);
      router.replace(
        `/?error=${encodeURIComponent(error)}&detail=${encodeURIComponent(errorDescription || "")}`
      );
      return;
    }

    if (!code) {
      console.warn("[callback] no code in URL — use Login from home");
      setMessage("No authorization code. Go back and use “Login with Spotify”.");
      router.replace("/?error=no_code&detail=Start%20login%20from%20the%20home%20page");
      return;
    }

    if (!codeVerifier) {
      router.replace("/?error=pkce_missing&detail=Missing%20PKCE%20verifier%20%E2%80%94%20please%20log%20in%20again");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, code_verifier: codeVerifier }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          console.error("[callback] /api/token failed", res.status, data);
          const detail =
            typeof data.detail === "string" ? data.detail : JSON.stringify(data);
          router.replace(
            `/?error=token_exchange&detail=${encodeURIComponent(data.error || detail)}`
          );
          return;
        }

        if (cancelled) return;

        if (data.access_token) {
          localStorage.setItem(STORAGE_ACCESS, data.access_token);
          console.log("[callback] access_token stored");
        }
        if (data.refresh_token) {
          localStorage.setItem(STORAGE_REFRESH, data.refresh_token);
          console.log("[callback] refresh_token stored");
        }
        if (data.expires_in) {
          const expiresAt = Date.now() + data.expires_in * 1000;
          localStorage.setItem(STORAGE_EXPIRES, String(expiresAt));
        }

        window.history.replaceState({}, "", "/callback");
        router.replace("/");
      } catch (e) {
        console.error("[callback] fetch error", e);
        if (!cancelled) {
          router.replace(
            `/?error=network&detail=${encodeURIComponent(String(e))}`
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main style={{ padding: "2rem" }}>
      <p>{message}</p>
    </main>
  );
}
