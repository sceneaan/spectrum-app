import { Logout } from '../api/services/Auth.Service';
import { queryClient } from '../api/queryClient';
import { useAuthStore } from '../store/authStore';
import socketService from './socket';

let logoutInProgress = false;

/**
 * Centralized logout: server invalidation, socket teardown, auth wipe, cache clear.
 * Re-entrancy safe (e.g. 401 on /logout during session expiry).
 */
export async function fullLogout({ callServer = true } = {}) {
  if (logoutInProgress) return;
  logoutInProgress = true;

  try {
    if (callServer) {
      try {
        await Logout();
      } catch {
        // Local logout still proceeds if server call fails
      }
    }

    socketService.disconnect();
    await useAuthStore.getState().logout();
    queryClient.clear();
  } finally {
    logoutInProgress = false;
  }
}
