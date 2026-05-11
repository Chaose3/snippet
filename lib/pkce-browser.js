/**
 * Browser-safe PKCE using Web Crypto API (no Node.js crypto needed).
 */

import { sha256 } from "js-sha256";

function base64URLEncode(buffer) {
  const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64URLEncodeFromBytes(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

export async function generateCodeChallenge(verifier) {
  const encoded = new TextEncoder().encode(verifier);
  // On iOS WKWebView over non-HTTPS origins, crypto.subtle can be unavailable.
  // Fall back to a pure-JS SHA-256 implementation so PKCE still works on local LAN URLs.
  if (crypto?.subtle?.digest) {
    const hash = await crypto.subtle.digest("SHA-256", encoded);
    return base64URLEncode(hash);
  }
  const hashBytes = sha256.array(encoded); // number[]
  return base64URLEncodeFromBytes(hashBytes);
}
