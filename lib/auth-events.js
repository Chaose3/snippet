/** Dispatched after OAuth / native login persists a new access token. */
export const SNIPPET_AUTH_COMPLETE = "snippet:auth-complete";

export function notifyAuthComplete() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SNIPPET_AUTH_COMPLETE));
}
