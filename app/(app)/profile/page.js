"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../contexts/AuthContext";
import { useAppPlayback } from "../../../contexts/AppPlaybackContext";
import { ProfileTab } from "../../../components/snippet/ProfileTab";

export default function ProfilePage() {
  const router = useRouter();
  const { handleLogout } = useAuth();
  const { token } = useAppPlayback();

  useEffect(() => {
    if (!token) router.replace("/");
  }, [token, router]);

  if (!token) return null;

  return <ProfileTab onLogout={handleLogout} />;
}
