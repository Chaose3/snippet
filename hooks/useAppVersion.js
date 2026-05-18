"use client";

import { useEffect, useState } from "react";
import { isNativeCapacitor } from "../lib/capacitor/platform";

const WEB_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";

function formatVersionLabel(version, build) {
  if (!version) return null;
  if (build && String(build) !== String(version)) {
    return `v${version} (${build})`;
  }
  return `v${version}`;
}

/**
 * Installed app version (native) or package version (web).
 */
export function useAppVersion() {
  const [label, setLabel] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (isNativeCapacitor()) {
        try {
          const { App } = await import("@capacitor/app");
          const info = await App.getInfo();
          if (!cancelled) {
            setLabel(formatVersionLabel(info.version, info.build) ?? `v${WEB_VERSION}`);
          }
          return;
        } catch {
          /* fall through to web label */
        }
      }
      if (!cancelled) setLabel(formatVersionLabel(WEB_VERSION, null));
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return label;
}
