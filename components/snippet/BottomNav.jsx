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

export const BottomNav = memo(function BottomNav({ playerState, activeTab, pressedTab, onTabPress }) {
  return (
    <nav
      style={{
        ...s.bottomNav,
        ...(playerState ? s.bottomNavWithMiniPlayer : {}),
      }}
    >
      <div
        style={{
          ...s.bottomNavSheen,
          ...(playerState ? s.bottomNavSheenWithMiniPlayer : {}),
        }}
      />
      {TABS.map(({ id, label, icon }) => (
        <button
          key={id}
          type="button"
          aria-label={label}
          style={{
            ...s.navBtn,
            ...(activeTab === id ? s.navBtnActive : {}),
            transform: pressedTab === id ? "scale(0.8)" : "scale(1)",
          }}
          onClick={() => onTabPress(id)}
        >
          {icon}
        </button>
      ))}
    </nav>
  );
});
