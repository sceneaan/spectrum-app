import { environmentUrls } from '../config';
import { useAuthStore } from '../store/authStore';
import socketService from './socket';
import { fullLogout } from './fullLogout';

let refreshPromise = null;

/**
 * Exchange refresh token for new access + refresh tokens.
 * Serialized so proactive, reactive, and resume refreshes cannot race.
 */
export async function refreshAccessToken() {
  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const response = await fetch(`${environmentUrls.api_url}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: useAuthStore.getState().refreshToken }),
    });

    if (!response.ok) {
      const err = new Error('Token refresh failed');
      err.response = { status: response.status };
      throw err;
    }

    const data = await response.json();
    const { token: newToken, refreshToken: newRefreshToken, expiresIn } = data.data;
    useAuthStore.getState().updateTokens(newToken, newRefreshToken, expiresIn);
    socketService.updateToken();
    return newToken;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

/** Refresh when access token is expired or within 5 minutes of expiry. */
export async function refreshTokenIfNeeded() {
  const { isAuthenticated, refreshToken, isTokenExpiringSoon } = useAuthStore.getState();
  if (!isAuthenticated || !refreshToken || !isTokenExpiringSoon()) {
    return false;
  }

  try {
    await refreshAccessToken();
    return true;
  } catch (error) {
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      await fullLogout({ callServer: false });
    }
    return false;
  }
}
