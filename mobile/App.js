import React, { useState, useEffect } from 'react';
import { View, StatusBar } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import { getItem } from './lib/storage';

// Required for expo-auth-session to close the browser after redirect
WebBrowser.maybeCompleteAuthSession();

export default function App() {
  const [token, setToken] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function init() {
      const stored = await getItem('spotify_access_token');
      const expiresAt = await getItem('spotify_token_expires_at');
      // Restore session only if token hasn't expired
      if (stored && expiresAt && Number(expiresAt) > Date.now()) {
        setToken(stored);
      }
      setReady(true);
    }
    init();
  }, []);

  // Don't render until we've checked SecureStore
  if (!ready) return null;

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a10' }}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a10" />
      {token ? (
        <HomeScreen
          token={token}
          onLogout={() => setToken(null)}
          onTokenRefresh={setToken}
        />
      ) : (
        <LoginScreen onLogin={setToken} />
      )}
    </View>
  );
}
