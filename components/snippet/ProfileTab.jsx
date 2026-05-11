"use client";

import { memo } from "react";
import { s } from "./homeStyles";

export const ProfileTab = memo(function ProfileTab({ onLogout }) {
  return (
    <div style={s.profileTab}>
      <div style={s.profileAvatarWrap}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
      </div>
      <p style={s.profileTitle}>Your Account</p>
      <p style={{ ...s.muted, marginBottom: "2.5rem" }}>Connected via Spotify</p>
      <button type="button" style={{ ...s.btnGhost, padding: "0.6rem 1.75rem" }} onClick={onLogout}>
        Log out of Spotify
      </button>
    </div>
  );
});
