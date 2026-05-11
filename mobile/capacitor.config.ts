import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.snippet.app',
  appName: 'Snippet',
  // Capacitor sync expects a webDir with an index.html.
  // We'll keep a minimal `mobile/www/index.html` for sync stability.
  webDir: 'www',
  server: {
    // For local iOS dev, set this to your Mac's LAN IP + dev port
    // (e.g. http://192.168.x.x:3000) so the native app loads live code.
    // Remove/disable it for a bundled/offline build.
    url: 'http://192.168.88.141:3000',
    cleartext: true,
    allowNavigation: ['accounts.spotify.com'],
  },
  ios: {
    scheme: 'snippet',
  },
};

export default config;
