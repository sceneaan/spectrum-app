import axios from 'axios';
import { environmentUrls } from '../config';
import { ErrorMessages } from '@api/messages/generic';
import { NativeModules, Platform } from 'react-native';
import { DeviceEventEmitter } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { queryClient } from './queryClient';

// ==========================================
// CONFIGURATION
// ==========================================

const defaultTimeout = 60000;
const uploadTimeout = 120000;

// Token refresh state management
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

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
    config.timeoutErrorMessage = ErrorMessages.timeoutMessage;
    return config;
  },
  (error) => Promise.reject(error),
);

// ==========================================
// RESPONSE INTERCEPTOR - Token Refresh & Rate Limiting
// ==========================================
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

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

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axios(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Read refresh token directly from Zustand store
        const { refreshToken } = useAuthStore.getState();

        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await axios.post('/auth/refresh-token', { refreshToken });
        const { token: newToken, refreshToken: newRefreshToken, expiresIn } = response.data.data;

        // Update Zustand store directly — persist middleware writes to EncryptedStorage automatically
        useAuthStore.getState().updateTokens(newToken, newRefreshToken, expiresIn);

        processQueue(null, newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axios(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await handleSessionExpired();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
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
const handleSessionExpired = async () => {
  try {
    await useAuthStore.getState().logout();
    queryClient.clear();
    DeviceEventEmitter.emit('auth:sessionExpired');
  } catch (err) {
    console.error('Error during session expiry cleanup:', err);
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
