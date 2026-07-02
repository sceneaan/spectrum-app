import axios from 'axios';
import { environmentUrls } from '../config';
import { ErrorMessages } from '@api/messages/generic';
import { NativeModules, Platform } from 'react-native';
import { DeviceEventEmitter } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { refreshAccessToken } from '../utils/tokenRefresh';
import { fullLogout } from '../utils/fullLogout';
import { getSpectrumAppUserAgent } from '../utils/deviceActivity';
import i18n from '../config/i18n';

// ==========================================
// CONFIGURATION
// ==========================================

const defaultTimeout = 60000;
const uploadTimeout = 120000;

// Offline detection state
let isNetworkOffline = false;

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
  retryMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

// Function to get device timezone
const getDeviceTimezone = () => {
  try {
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
    if (Platform.OS === 'ios') {
      return NativeModules.SettingsManager?.settings?.AppleLocale || 'Asia/Riyadh';
    } else if (Platform.OS === 'android') {
      return NativeModules.I18nManager?.localeIdentifier || 'Asia/Riyadh';
    }
    return 'Asia/Riyadh';
  } catch (error) {
    return 'Asia/Riyadh';
  }
};

const formDataRequestHeaders = {
  headers: { 'Content-Type': 'multipart/form-data' },
};

const jsonRequestHeaders = {
  headers: { 'Content-Type': 'application/json' },
};

axios.defaults.baseURL = environmentUrls.api_url;
axios.defaults.timeout = defaultTimeout;

// ==========================================
// REQUEST INTERCEPTOR
// Read token from Zustand store (synchronous, no disk I/O)
// ==========================================
axios.interceptors.request.use(
  (config) => {
    try {
      // Synchronous read from Zustand in-memory state — no EncryptedStorage I/O
      const token = useAuthStore.getState().token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error setting auth header:', error);
    }

    config.headers['X-Timezone'] = getDeviceTimezone();
    try {
      config.headers['X-Spectrum-App'] = getSpectrumAppUserAgent();
    } catch {
      config.headers['X-Spectrum-App'] = `Spectrum/${Platform.OS}`;
    }
    const language = i18n.language || 'en';
    config.headers['Accept-Language'] = language;
    config.headers['X-Language'] = language;
    config.timeoutErrorMessage = ErrorMessages.timeoutMessage;
    return config;
  },
  (error) => Promise.reject(error),
);

// ==========================================
// RESPONSE INTERCEPTOR - Token Refresh & Rate Limiting
// ==========================================
axios.interceptors.response.use(
  (response) => {
    // Restore online banner if we were previously offline
    if (isNetworkOffline) {
      isNetworkOffline = false;
      DeviceEventEmitter.emit('network:online');
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Detect network-level failure (no response received)
    if (!error.response && error.request) {
      if (!isNetworkOffline) {
        isNetworkOffline = true;
        DeviceEventEmitter.emit('network:offline');
      }
      return Promise.reject(error);
    }

    // Handle rate limiting (429)
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      const waitTime = retryAfter ? parseInt(retryAfter, 10) : 60;
      const rateLimitError = new Error(
        `${ErrorMessages.rateLimitExceeded || 'Too many attempts.'} Please wait ${waitTime} seconds.`
      );
      rateLimitError.isRateLimited = true;
      rateLimitError.retryAfter = waitTime;
      rateLimitError.response = error.response;
      DeviceEventEmitter.emit('api:rateLimited', { waitTime });
      return Promise.reject(rateLimitError);
    }

    // Handle unauthorized (401) - attempt token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't retry refresh-token or logout endpoints
      if (
        originalRequest.url?.includes('/refresh-token') ||
        originalRequest.url?.includes('/logout')
      ) {
        await handleSessionExpired();
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        const newToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axios(originalRequest);
      } catch (refreshError) {
        const refreshStatus = refreshError.response?.status;
        if (refreshStatus === 401 || refreshStatus === 403) {
          await handleSessionExpired();
        }
        return Promise.reject(refreshError);
      }
    }

    // Handle forbidden (403)
    if (error.response?.status === 403) {
      const forbiddenError = new Error(ErrorMessages.unauthorized || 'Access denied');
      forbiddenError.response = error.response;
      return Promise.reject(forbiddenError);
    }

    return Promise.reject(error);
  }
);

// Clear both Zustand state and React Query cache, then emit event for UI
let sessionExpiryInProgress = false;

const handleSessionExpired = async () => {
  if (sessionExpiryInProgress) return;
  sessionExpiryInProgress = true;

  try {
    await fullLogout({ callServer: false });
    DeviceEventEmitter.emit('auth:sessionExpired');
  } catch (err) {
    console.error('Error during session expiry cleanup:', err);
  } finally {
    sessionExpiryInProgress = false;
  }
};

export const getRequest = (url, params = {}, config = { ...jsonRequestHeaders }) =>
  axios.get(url, { params, ...config });

export const postRequest = (url, data, config = { ...jsonRequestHeaders }) =>
  axios.post(url, data, config);

export const putRequest = (url, data, config = { ...jsonRequestHeaders }) =>
  axios.put(url, data, config);

export const deleteRequest = (url, config = { ...jsonRequestHeaders }) =>
  axios.delete(url, config);

export const getFormDataRequest = (url, params = {}, config = { ...formDataRequestHeaders }) =>
  axios.get(url, { params, ...config });

export const postFormDataRequest = (url, data, config = { ...formDataRequestHeaders }) =>
  axios.post(url, data, config);

export const putFormDataRequest = (url, data, config = { ...formDataRequestHeaders }) =>
  axios.put(url, data, config);

export const deleteFormDataRequest = (url, config = { ...formDataRequestHeaders }) =>
  axios.delete(url, config);

export const getBlobRequest = (url, params = {}, config = {}) =>
  axios.get(url, { params, ...config, responseType: 'blob' });

// ==========================================
// UPLOAD WITH PROGRESS SUPPORT
// ==========================================
export const postFormDataWithProgress = (url, data, options = {}) => {
  const { onProgress, abortController } = options;
  return axios.post(url, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: uploadTimeout,
    signal: abortController?.signal,
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentCompleted);
      }
    },
  });
};

// ==========================================
// RETRY LOGIC FOR PRIVATE FILE FETCHES
// ==========================================
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const getBlobRequestWithRetry = async (url, params = {}, config = {}, retryOptions = {}) => {
  const maxRetries = retryOptions.maxRetries ?? RETRY_CONFIG.maxRetries;
  const retryDelay = retryOptions.retryDelay ?? RETRY_CONFIG.retryDelay;
  const retryMultiplier = retryOptions.retryMultiplier ?? RETRY_CONFIG.retryMultiplier;
  const retryableStatuses = retryOptions.retryableStatuses ?? RETRY_CONFIG.retryableStatuses;

  let lastError;
  let currentDelay = retryDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await axios.get(url, { params, ...config, responseType: 'blob' });
    } catch (error) {
      lastError = error;
      const status = error.response?.status;
      if (status === 401 || status === 403 || status === 404) throw error;
      const isRetryable = !status || retryableStatuses.includes(status);
      if (attempt < maxRetries && isRetryable) {
        await sleep(currentDelay);
        currentDelay *= retryMultiplier;
      }
    }
  }
  throw lastError;
};

export const getArrayBufferRequestWithRetry = async (url, params = {}, config = {}, retryOptions = {}) => {
  const maxRetries = retryOptions.maxRetries ?? RETRY_CONFIG.maxRetries;
  const retryDelay = retryOptions.retryDelay ?? RETRY_CONFIG.retryDelay;
  const retryMultiplier = retryOptions.retryMultiplier ?? RETRY_CONFIG.retryMultiplier;
  const retryableStatuses = retryOptions.retryableStatuses ?? RETRY_CONFIG.retryableStatuses;

  let lastError;
  let currentDelay = retryDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await axios.get(url, { params, ...config, responseType: 'arraybuffer' });
    } catch (error) {
      lastError = error;
      const status = error.response?.status;
      if (status === 401 || status === 403 || status === 404) throw error;
      const isRetryable = !status || retryableStatuses.includes(status);
      if (attempt < maxRetries && isRetryable) {
        await sleep(currentDelay);
        currentDelay *= retryMultiplier;
      }
    }
  }
  throw lastError;
};
