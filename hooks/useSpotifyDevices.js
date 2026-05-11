import { useCallback, useEffect, useState } from "react";
import { getStoredToken } from "../lib/auth-storage";
import { getDevices } from "../lib/snippet";

export function useSpotifyDevices({ token, playerState, isNativeApp, withFreshToken }) {
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState(null);
  const [loadingDevices, setLoadingDevices] = useState(false);

  const fetchDevices = useCallback(async () => {
    if (isNativeApp) return;
    const t = getStoredToken();
    if (!t) return;
    setLoadingDevices(true);
    try {
      const list = await withFreshToken((accessToken) => getDevices(accessToken)).catch((err) => {
        console.warn("[devices] failed to load", err);
        return [];
      });
      setDevices(list || []);
      if ((list || []).length === 1 && !deviceId) setDeviceId(list[0].id);
    } finally {
      setLoadingDevices(false);
    }
  }, [deviceId, isNativeApp, withFreshToken]);

  useEffect(() => {
    if (!token || playerState) return;
    fetchDevices();
    const id = setInterval(fetchDevices, 5000);
    return () => clearInterval(id);
  }, [token, playerState, fetchDevices]);

  return { devices, deviceId, setDeviceId, loadingDevices, fetchDevices };
}
