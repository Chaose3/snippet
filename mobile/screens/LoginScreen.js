import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { LinearGradient } from 'expo-linear-gradient';
import { saveItem } from '../lib/storage';
import {
  SPOTIFY_CLIENT_ID,
  SCOPES,
  discovery,
  makeRedirectUri,
  exchangeCodeForTokens,
} from '../lib/auth';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ onLogin }) {
  const redirectUri = makeRedirectUri();

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: SPOTIFY_CLIENT_ID,
      scopes: SCOPES,
      usePKCE: true,
      redirectUri,
    },
    discovery
  );

  useEffect(() => {
    if (!response) return;

    if (response.type === 'success') {
      const { code } = response.params;
      handleCodeExchange(code);
    } else if (response.type === 'error') {
      Alert.alert('Login failed', response.error?.message ?? 'Unknown error');
    }
  }, [response]);

  const handleCodeExchange = async (code) => {
    try {
      const data = await exchangeCodeForTokens(code, request.codeVerifier, redirectUri);
      const expiresAt = Date.now() + (data.expires_in ?? 3600) * 1000;

      await saveItem('spotify_access_token', data.access_token);
      await saveItem('spotify_token_expires_at', String(expiresAt));
      if (data.refresh_token) {
        await saveItem('spotify_refresh_token', data.refresh_token);
      }

      onLogin(data.access_token);
    } catch (err) {
      console.error('[LoginScreen] token exchange failed:', err);
      Alert.alert('Login error', err.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoWrap}>
        <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
      </View>

      <LinearGradient
        colors={['#ff5500', '#7b31c7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.titleGradient}
      >
        <Text style={styles.title}>Jump to the best parts.</Text>
      </LinearGradient>

      <Text style={styles.subtitle}>
        Connect Spotify, start any track, and save the moments worth jumping back to.
      </Text>

      <TouchableOpacity
        onPress={() => promptAsync()}
        disabled={!request}
        activeOpacity={0.85}
        style={styles.btnWrap}
      >
        <LinearGradient
          colors={['#ff5500', '#7b31c7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.btn}
        >
          <Text style={styles.btnText}>Login with Spotify</Text>
        </LinearGradient>
      </TouchableOpacity>

      <Text style={styles.hint}>
        Make sure you've added the redirect URI shown below to your Spotify app on
        developer.spotify.com:{'\n'}
        <Text style={styles.hintCode}>{redirectUri}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a10',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  logoWrap: {
    marginBottom: 32,
    width: 180,
    height: 48,
  },
  logo: {
    width: '100%',
    height: '100%',
    tintColor: '#f0f0f5',
  },
  titleGradient: {
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    color: '#6b6b88',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  btnWrap: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 32,
  },
  btn: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  hint: {
    color: '#44445a',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 18,
  },
  hintCode: {
    color: '#666688',
    fontFamily: 'monospace',
  },
});
