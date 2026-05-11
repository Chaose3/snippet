import type { CapacitorConfig } from '@capacitor/cli';
import dotenv from 'dotenv';
import { basename, resolve } from 'node:path';

// Capacitor transpiles this file as CommonJS — avoid `import.meta` here.
// `cap sync` is normally run with cwd = `mobile/` (see root `npm run ios:sync`).
const cwd = process.cwd();
const mobileDir = basename(cwd) === 'mobile' ? cwd : resolve(cwd, 'mobile');
const repoRoot = basename(cwd) === 'mobile' ? resolve(cwd, '..') : cwd;

// Repo root first (where Next `.env.local` usually lives), then `mobile/` overrides.
dotenv.config({ path: resolve(repoRoot, '.env') });
dotenv.config({ path: resolve(repoRoot, '.env.local'), override: true });
dotenv.config({ path: resolve(mobileDir, '.env') });
dotenv.config({ path: resolve(mobileDir, '.env.local'), override: true });

/**
 * Live-reload URL for native WebView (optional).
 * Set `CAP_SERVER_URL` in `mobile/.env.local` (recommended), or in the shell:
 *   CAP_SERVER_URL=http://192.168.x.x:3000 npx cap sync ios
 * If unset, the native app uses bundled assets from `webDir` only (no dev server).
 */
const devServerUrl =
  process.env.CAP_SERVER_URL?.trim() ||
  process.env.CAPACITOR_SERVER_URL?.trim() ||
  '';

const config = {
  appId: 'com.snippet.app',
  appName: 'Snippet',
  // Capacitor sync expects a webDir with an index.html.
  // We'll keep a minimal `mobile/www/index.html` for sync stability.
  webDir: 'www',
  ...(devServerUrl
    ? {
        server: {
          url: devServerUrl,
          cleartext: true,
          allowNavigation: ['accounts.spotify.com'],
        },
      }
    : {}),
  ios: {
    scheme: 'snippet',
  },
  // Local native plugin (must match class name); keep core plugins listed so sync does not drop them.
  packageClassList: ['AppPlugin', 'CAPBrowserPlugin', 'SpotifyBridgePlugin'],
} as CapacitorConfig;

export default config;
