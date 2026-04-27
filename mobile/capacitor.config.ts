import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.snippet.app',
  appName: 'Snippet',
  server: {
    url: 'https://snippet-azure.vercel.app',
    cleartext: false,
    allowNavigation: ['accounts.spotify.com'],
  },
  ios: {
    scheme: 'snippet',
  },
};

export default config;
