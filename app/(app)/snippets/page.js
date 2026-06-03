"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppPlayback } from "../../../contexts/AppPlaybackContext";
import { SnippetsPageContent } from "../../../components/snippet/SnippetsPageContent";

export default function SnippetsPage() {
  const router = useRouter();
  const { token } = useAppPlayback();

  useEffect(() => {
    if (!token) router.replace("/");
  }, [token, router]);

  if (!token) return null;

  return <SnippetsPageContent />;
}
