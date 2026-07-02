import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createResilientEncryptedStorage } from './resilientStorage';

const decodeJwtExpMs = (token) => {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url || typeof atob !== 'function') return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join('')
    );
    const payload = JSON.parse(json);
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

const resolveTokenExpiresAt = (state, data) => {
  if (data.expiresIn) {
    return Date.now() + data.expiresIn * 1000;
  }
  if (data.tokenExpiresAt !== undefined) {
    return data.tokenExpiresAt;
  }
  if (data.token) {
    return decodeJwtExpMs(data.token) ?? state.tokenExpiresAt;
  }
  return state.tokenExpiresAt;
};

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      tokenExpiresAt: null,
      isAuthenticated: false,
      elmVerificationDeferred: false,
      _hasHydrated: false,

      setHasHydrated: (hydrated) => set({ _hasHydrated: hydrated }),

      isPatient: () => {
        const user = get().user;
        return user?.role?.toLowerCase() === 'patient';
      },

      getUserRole: () => {
        return get().user?.role?.toLowerCase() || null;
      },

      setElmVerificationDeferred: (deferred) => set({ elmVerificationDeferred: deferred }),

      // Merge partial updates — preserve refreshToken when omitted (e.g. patient consent)
      setAuth: (data) => set((state) => ({
        user: data.user !== undefined ? data.user : state.user,
        token: data.token ?? state.token,
        refreshToken: data.refreshToken ?? state.refreshToken,
        tokenExpiresAt: resolveTokenExpiresAt(state, data),
        isAuthenticated: true,
      })),

      updateTokens: (token, refreshToken, expiresIn) => set({
        token,
        refreshToken,
        tokenExpiresAt: expiresIn ? Date.now() + expiresIn * 1000 : null,
      }),

      isTokenExpiringSoon: () => {
        const { tokenExpiresAt, token } = get();
        const expiresAt = tokenExpiresAt ?? (token ? decodeJwtExpMs(token) : null);
        if (!expiresAt) return false;
        const fiveMinutes = 5 * 60 * 1000;
        return Date.now() > expiresAt - fiveMinutes;
      },

      isTokenExpired: () => {
        const { tokenExpiresAt, token } = get();
        if (!token) return false;
        const expiresAt = tokenExpiresAt ?? decodeJwtExpMs(token);
        if (!expiresAt) return false;
        return Date.now() > expiresAt;
      },

      logout: async () => {
        set({
          user: null,
          token: null,
          refreshToken: null,
          tokenExpiresAt: null,
          isAuthenticated: false,
          elmVerificationDeferred: false,
          biometricsEnabled: false,
          pendingBiometricOffer: false,
        });
        try {
          await createResilientEncryptedStorage().removeItem('auth-storage');
        } catch {
          // ignore
        }
      },

      biometricsEnabled: false,
      setBiometricsEnabled: (enabled) => set({ biometricsEnabled: enabled }),

      pendingBiometricOffer: false,
      setPendingBiometricOffer: (value) => set({ pendingBiometricOffer: value }),

      initializeAuth: async () => {
        const storage = createResilientEncryptedStorage();
        const sessionJson = await storage.getItem('auth-storage');
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
      storage: createJSONStorage(() => createResilientEncryptedStorage()),
      skipHydration: true,
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        tokenExpiresAt: state.tokenExpiresAt,
        isAuthenticated: state.isAuthenticated,
        biometricsEnabled: state.biometricsEnabled,
      }),
      onRehydrateStorage: () => (rehydratedState, error) => {
        if (error) {
          console.warn('[authStore] Rehydration error — starting fresh:', error);
        } else if (rehydratedState?.user && rehydratedState?.token) {
          rehydratedState.isAuthenticated = true;
        }
        useAuthStore.getState().setHasHydrated(true);
      },
    }
  )
);
