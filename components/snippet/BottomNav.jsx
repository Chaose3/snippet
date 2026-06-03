"use client";

import { memo } from "react";
import { s } from "./homeStyles";

const TABS = [
  {
    id: "home",
    label: "Home",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V10.5z" />
        <path d="M9 21V13h6v8" />
      </svg>
    ),
  },
  {
    id: "snippets",
    label: "Snippets",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="6" r="2.25" />
        <circle cx="6" cy="18" r="2.25" />
        <path d="M20 4L8.5 15.5" />
        <path d="M14.5 8.5L20 4l-4 4" />
        <path d="M8.5 15.5L4 20l4-4" />
      </svg>
    ),
  },
  {
    id: "search",
    label: "Search",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7.5" />
        <line x1="21" y1="21" x2="16.5" y2="16.5" />
      </svg>
    ),
  },
  {
    id: "profile",
    label: "Profile",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
];

export const BottomNav = memo(function BottomNav({
  playerState,
  /** When false, nav uses full pill shape (mini player strip hidden — e.g. full-screen /player route). */
  miniPlayerDocked = true,
  activeTab,
  pressedTab,
  onTabPress,
  totalSnippetCount = 0,
}) {
  const dockedMini = Boolean(playerState && miniPlayerDocked);
  return (
    <nav
      style={{
        ...s.bottomNav,
        ...(dockedMini ? s.bottomNavWithMiniPlayer : {}),
      }}
    >
      <div
        style={{
          ...s.bottomNavSheen,
          ...(dockedMini ? s.bottomNavSheenWithMiniPlayer : {}),
        }}
      />
      {TABS.map(({ id, label, icon }) => {
        const showBadge = id === "snippets" && totalSnippetCount > 0;
        return (
          <button
            key={id}
            type="button"
            aria-label={showBadge ? `${label}, ${totalSnippetCount} snippets` : label}
            style={{
              ...s.navBtn,
              ...(activeTab != null && activeTab === id ? s.navBtnActive : {}),
              transform: pressedTab === id ? "scale(0.8)" : "scale(1)",
              position: "relative",
            }}
            onClick={() => onTabPress(id)}
          >
            {icon}
            {showBadge && (
              <span style={s.navSnippetBadge} aria-hidden="true">
                {totalSnippetCount > 99 ? "99+" : totalSnippetCount}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
});
