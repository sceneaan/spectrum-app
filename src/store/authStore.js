import { create } from 'zustand';
import EncryptedStorage from 'react-native-encrypted-storage';
import { createJSONStorage, persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      tokenExpiresAt: null,
      isAuthenticated: false,

      // Helper to check if user is a patient
      isPatient: () => {
        const user = get().user;
        return user?.role?.toLowerCase() === 'patient';
      },

      // Get user role
      getUserRole: () => {
        return get().user?.role?.toLowerCase() || null;
      },

      // Updated to handle new auth response with refresh token
      setAuth: (data) => set({
        user: data.user,
        token: data.token,
        refreshToken: data.refreshToken || null,
        tokenExpiresAt: data.expiresIn
          ? Date.now() + (data.expiresIn * 1000)
          : null,
        isAuthenticated: true,
      }),

      // Update tokens after refresh
      updateTokens: (token, refreshToken, expiresIn) => set({
        token: token,
        refreshToken: refreshToken,
        tokenExpiresAt: expiresIn ? Date.now() + (expiresIn * 1000) : null,
      }),

      // Check if token is about to expire (within 5 minutes)
      isTokenExpiringSoon: () => {
        const { tokenExpiresAt } = get();
        if (!tokenExpiresAt) return false;
        const fiveMinutes = 5 * 60 * 1000;
        return Date.now() > (tokenExpiresAt - fiveMinutes);
      },

      // Check if token is expired
      isTokenExpired: () => {
        const { tokenExpiresAt } = get();
        if (!tokenExpiresAt) return false;
        return Date.now() > tokenExpiresAt;
      },

      logout: async () => {
        set({
          user: null,
          token: null,
          refreshToken: null,
          tokenExpiresAt: null,
          isAuthenticated: false,
        });
        await EncryptedStorage.clear();
      },

      initializeAuth: async () => {
        const sessionJson = await EncryptedStorage.getItem('auth-storage');
        if (sessionJson) {
          const { state } = JSON.parse(sessionJson);
          if (state.user && state.token) {
            set({
              user: state.user,
              token: state.token,
              refreshToken: state.refreshToken || null,
              tokenExpiresAt: state.tokenExpiresAt || null,
              isAuthenticated: true,
            });
          }
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => EncryptedStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        tokenExpiresAt: state.tokenExpiresAt,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (rehydratedState) => {
        // Derive isAuthenticated from persisted user+token in case it was missing
        if (rehydratedState && rehydratedState.user && rehydratedState.token) {
          rehydratedState.isAuthenticated = true;
        }
      },
    }
  )
);
