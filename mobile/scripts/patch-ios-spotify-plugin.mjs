/**
 * `cap sync` rebuilds packageClassList from npm plugins only and drops local SpotifyBridgePlugin.
 * Re-add it so Capacitor registers the in-app Swift bridge.
 * Also syncs SPOTIFY_CLIENT_ID from repo .env into SpotifyBridgePlugin.swift (App Remote).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../..");
dotenv.config({ path: resolve(repoRoot, ".env") });
dotenv.config({ path: resolve(repoRoot, ".env.local"), override: true });

const configPath = resolve(__dirname, "../ios/App/App/capacitor.config.json");

const config = JSON.parse(readFileSync(configPath, "utf8"));
const list = Array.isArray(config.packageClassList) ? [...config.packageClassList] : [];
if (!list.includes("SpotifyBridgePlugin")) {
  list.push("SpotifyBridgePlugin");
}
config.packageClassList = list;
writeFileSync(configPath, `${JSON.stringify(config, null, "\t")}\n`, "utf8");
console.log("[patch-ios-spotify-plugin] packageClassList:", list.join(", "));

const clientId = process.env.SPOTIFY_CLIENT_ID?.trim();
if (clientId) {
  const swiftPath = resolve(__dirname, "../ios/App/App/SpotifyBridgePlugin.swift");
  let swift = readFileSync(swiftPath, "utf8");
  const next = swift.replace(/private let clientID = "[^"]+"/, `private let clientID = "${clientId}"`);
  if (next !== swift) {
    writeFileSync(swiftPath, next, "utf8");
    console.log("[patch-ios-spotify-plugin] synced SPOTIFY_CLIENT_ID into SpotifyBridgePlugin.swift");
  }
} else {
  console.warn("[patch-ios-spotify-plugin] SPOTIFY_CLIENT_ID not set — Swift bridge keeps existing client ID");
}
