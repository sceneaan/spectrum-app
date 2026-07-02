import EncryptedStorage from 'react-native-encrypted-storage';

const STORAGE_TIMEOUT_MS = 3500;

function withTimeout(promise, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out`)), STORAGE_TIMEOUT_MS);
    }),
  ]);
}

/**
 * EncryptedStorage can hang on iOS keychain reads (TestFlight / Low Power Mode).
 * Never block app startup waiting forever for auth rehydration.
 */
export function createResilientEncryptedStorage() {
  return {
    getItem: async (name) => {
      try {
        return await withTimeout(EncryptedStorage.getItem(name), `read ${name}`);
      } catch (error) {
        console.warn('[resilientStorage] getItem failed:', error?.message || error);
        return null;
      }
    },
    setItem: async (name, value) => {
      try {
        await withTimeout(EncryptedStorage.setItem(name, value), `write ${name}`);
      } catch (error) {
        console.warn('[resilientStorage] setItem failed:', error?.message || error);
      }
    },
    removeItem: async (name) => {
      try {
        await withTimeout(EncryptedStorage.removeItem(name), `remove ${name}`);
      } catch (error) {
        console.warn('[resilientStorage] removeItem failed:', error?.message || error);
      }
    },
  };
}
