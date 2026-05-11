"use client";

import { memo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { s } from "./homeStyles";

function ConnectSpotifyButtonInner({ style }) {
  const { goLogin } = useAuth();
  return (
    <button type="button" style={style ?? s.btnPrimaryLg} onClick={goLogin}>
      Connect Spotify
    </button>
  );
}

export const ConnectSpotifyButton = memo(ConnectSpotifyButtonInner);
