/** Bottom-nav tab ids aligned with app routes. */
export const APP_TABS = ["home", "search", "profile"];

export function tabFromPathname(pathname) {
  if (!pathname) return "home";
  if (pathname.startsWith("/search")) return "search";
  if (pathname.startsWith("/profile")) return "profile";
  if (pathname === "/player" || pathname.startsWith("/player/")) return null;
  return "home";
}

export function tabHref(tab) {
  if (tab === "search") return "/search";
  if (tab === "profile") return "/profile";
  return "/";
}

export function isSearchPathname(pathname) {
  return Boolean(pathname?.startsWith("/search"));
}
