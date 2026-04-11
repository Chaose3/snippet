/**
 * Browser-safe PKCE using Web Crypto API (no Node.js crypto needed).
 */

function base64URLEncode(buffer) {
  const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
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
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return base64URLEncode(hash);
}
