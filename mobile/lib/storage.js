import * as SecureStore from 'expo-secure-store';

export async function saveItem(key, value) {
  await SecureStore.setItemAsync(key, value);
}

export async function getItem(key) {
  return SecureStore.getItemAsync(key);
}

export async function deleteItem(key) {
  await SecureStore.deleteItemAsync(key);
}

export async function clearTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync('spotify_access_token'),
    SecureStore.deleteItemAsync('spotify_refresh_token'),
    SecureStore.deleteItemAsync('spotify_token_expires_at'),
  ]);
}
