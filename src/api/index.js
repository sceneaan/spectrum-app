import axios from 'axios';
import { environmentUrls } from '../config';
import { ErrorMessages } from '@api/messages/generic';
import EncryptedStorage from 'react-native-encrypted-storage';
import { NativeModules, Platform } from 'react-native';
import { DeviceEventEmitter } from 'react-native';

// ==========================================
// CONFIGURATION
// ==========================================

// Increased timeout for image uploads, especially on iOS
const defaultTimeout = 60000; // 60 seconds for better iOS compatibility
const uploadTimeout = 120000; // 2 minutes for large file uploads

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
  retryDelay: 1000, // 1 second initial delay
  retryMultiplier: 2, // Exponential backoff
  retryableStatuses: [408, 429, 500, 502, 503, 504], // Transient errors
};

// Function to get device timezone
const getDeviceTimezone = () => {
  try {
    // Try to use Intl API first (available in newer React Native versions)
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }

    // Fallback to native modules for older React Native versions
    if (Platform.OS === 'ios') {
      // For iOS, we can use the native timezone
      return NativeModules.SettingsManager?.settings?.AppleLocale || 'Asia/Riyadh';
    } else if (Platform.OS === 'android') {
      // For Android, try to get timezone from native module
      return NativeModules.I18nManager?.localeIdentifier || 'Asia/Riyadh';
    }

    // Final fallback
    return 'Asia/Riyadh';
  } catch (error) {
    console.warn('Failed to get device timezone:', error);
    // Default to Saudi Arabia timezone
    return 'Asia/Riyadh';
  }
};

const formDataRequestHeaders = {
  headers: {
    'Content-Type': 'multipart/form-data',
  },
};

const jsonRequestHeaders = {
  headers: {
    'Content-Type': 'application/json',
  },
};

axios.defaults.baseURL = environmentUrls.api_url;
axios.defaults.timeout = defaultTimeout;


axios.interceptors.request.use(
  async config => {
    try {
      // Read token from EncryptedStorage where Zustand persist saves it
      const authStorageJson = await EncryptedStorage.getItem('auth-storage');

      if (authStorageJson) {
        const authStorage = JSON.parse(authStorageJson);
        const token = authStorage?.state?.token;

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (error) {
      console.error('ERROR updating token on server:', error);
    }

    // Add timezone header to all requests
    const timeZone = getDeviceTimezone();
    config.headers['X-Timezone'] = timeZone;

    config.timeoutErrorMessage = ErrorMessages.timeoutMessage;
    return config;
  },
  error => {
    Promise.reject(error);
  },
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

      // Create custom error with rate limit info
      const rateLimitError = new Error(
        `${ErrorMessages.rateLimitExceeded || 'Too many attempts.'} Please wait ${waitTime} seconds.`
      );
      rateLimitError.isRateLimited = true;
      rateLimitError.retryAfter = waitTime;
      rateLimitError.response = error.response;

      // Emit event for UI to handle
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
        // Clear auth and emit session expired event
        await clearAuthStorage();
        DeviceEventEmitter.emit('auth:sessionExpired');
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue the request while token is being refreshed
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
        // Get refresh token from storage
        const authStorageJson = await EncryptedStorage.getItem('auth-storage');
        if (!authStorageJson) {
          throw new Error('No auth storage found');
        }

        const authStorage = JSON.parse(authStorageJson);
        const refreshToken = authStorage?.state?.refreshToken;

        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Call refresh token endpoint
        const response = await axios.post('/auth/refresh-token', {
          refreshToken: refreshToken,
        });

        const { token, refreshToken: newRefreshToken, expiresIn } = response.data.data;

        // Update tokens in storage
        const newState = {
          ...authStorage.state,
          token: token,
          refreshToken: newRefreshToken,
          tokenExpiresAt: expiresIn ? Date.now() + (expiresIn * 1000) : null,
        };
        await EncryptedStorage.setItem('auth-storage', JSON.stringify({ state: newState }));

        // Emit event for store to update
        DeviceEventEmitter.emit('auth:tokensRefreshed', { token, refreshToken: newRefreshToken, expiresIn });

        // Process queued requests
        processQueue(null, token);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return axios(originalRequest);
      } catch (refreshError) {
        // Refresh failed - clear auth and emit session expired
        processQueue(refreshError, null);
        await clearAuthStorage();
        DeviceEventEmitter.emit('auth:sessionExpired');
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

// Helper to clear auth storage
const clearAuthStorage = async () => {
  try {
    await EncryptedStorage.removeItem('auth-storage');
  } catch (error) {
    console.error('Error clearing auth storage:', error);
  }
};

export const getRequest = (
  url,
  params = {},
  config = {
    ...jsonRequestHeaders,
  },
) => axios.get(url, { params, ...config });

export const postRequest = (
  url,
  data,
  config = {
    ...jsonRequestHeaders,
  },
) => axios.post(url, data, config);

export const putRequest = (
  url,
  data,
  config = {
    ...jsonRequestHeaders,
  },
) => axios.put(url, data, config);

export const deleteRequest = (
  url,
  config = {
    ...jsonRequestHeaders,
  },
) => axios.delete(url, config);

export const getFormDataRequest = (
  url,
  params = {},
  config = {
    ...formDataRequestHeaders,
  },
) => axios.get(url, { params, ...config });

export const postFormDataRequest = (
  url,
  data,
  config = {
    ...formDataRequestHeaders,
  },
) => axios.post(url, data, config);

export const putFormDataRequest = (
  url,
  data,
  config = {
    ...formDataRequestHeaders,
  },
) => axios.put(url, data, config);

export const deleteFormDataRequest = (
  url,
  config = {
    ...formDataRequestHeaders,
  },
) => axios.delete(url, config);

// Blob request for downloading files (images, PDFs, etc.)
export const getBlobRequest = (
  url,
  params = {},
  config = {},
) => axios.get(url, {
  params,
  ...config,
  responseType: 'blob',
});

// ==========================================
// UPLOAD WITH PROGRESS SUPPORT
// ==========================================

/**
 * Upload file with progress tracking
 * @param {string} url - Upload endpoint
 * @param {FormData} data - Form data with file
 * @param {Object} options - Upload options
 * @param {function} options.onProgress - Progress callback (0-100)
 * @param {AbortController} options.abortController - For cancellation
 * @returns {Promise} Axios response
 */
export const postFormDataWithProgress = (
  url,
  data,
  options = {},
) => {
  const { onProgress, abortController } = options;

  return axios.post(url, data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: uploadTimeout,
    signal: abortController?.signal,
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      }
    },
  });
};

// ==========================================
// RETRY LOGIC FOR PRIVATE FILE FETCHES
// ==========================================

/**
 * Sleep helper for retry delays
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Get blob request with automatic retry for transient failures
 * @param {string} url - Request URL
 * @param {Object} params - Query parameters
 * @param {Object} config - Additional config
 * @param {Object} retryOptions - Retry configuration overrides
 * @returns {Promise} Axios response
 */
export const getBlobRequestWithRetry = async (
  url,
  params = {},
  config = {},
  retryOptions = {},
) => {
  const maxRetries = retryOptions.maxRetries ?? RETRY_CONFIG.maxRetries;
  const retryDelay = retryOptions.retryDelay ?? RETRY_CONFIG.retryDelay;
  const retryMultiplier = retryOptions.retryMultiplier ?? RETRY_CONFIG.retryMultiplier;
  const retryableStatuses = retryOptions.retryableStatuses ?? RETRY_CONFIG.retryableStatuses;

  let lastError;
  let currentDelay = retryDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.get(url, {
        params,
        ...config,
        responseType: 'blob',
      });
      return response;
    } catch (error) {
      lastError = error;

      // Don't retry on non-retryable errors
      const status = error.response?.status;
      const isRetryable = !status || retryableStatuses.includes(status);

      // Don't retry on 401 (unauthorized) or 403 (forbidden)
      if (status === 401 || status === 403 || status === 404) {
        throw error;
      }

      // Check if we should retry
      if (attempt < maxRetries && isRetryable) {
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} for ${url} after ${currentDelay}ms`);
        await sleep(currentDelay);
        currentDelay *= retryMultiplier;
      }
    }
  }

  // All retries failed
  throw lastError;
};

// ==========================================
// ARRAYBUFFER REQUEST FOR PRIVATE FILES
// ==========================================

/**
 * Get request with arraybuffer response (for React Native blob handling)
 * With retry support for transient failures
 */
export const getArrayBufferRequestWithRetry = async (
  url,
  params = {},
  config = {},
  retryOptions = {},
) => {
  const maxRetries = retryOptions.maxRetries ?? RETRY_CONFIG.maxRetries;
  const retryDelay = retryOptions.retryDelay ?? RETRY_CONFIG.retryDelay;
  const retryMultiplier = retryOptions.retryMultiplier ?? RETRY_CONFIG.retryMultiplier;
  const retryableStatuses = retryOptions.retryableStatuses ?? RETRY_CONFIG.retryableStatuses;

  let lastError;
  let currentDelay = retryDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.get(url, {
        params,
        ...config,
        responseType: 'arraybuffer',
      });
      return response;
    } catch (error) {
      lastError = error;

      const status = error.response?.status;
      const isRetryable = !status || retryableStatuses.includes(status);

      // Don't retry on auth/permission/not-found errors
      if (status === 401 || status === 403 || status === 404) {
        throw error;
      }

      if (attempt < maxRetries && isRetryable) {
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} for ${url} after ${currentDelay}ms`);
        await sleep(currentDelay);
        currentDelay *= retryMultiplier;
      }
    }
  }

  throw lastError;
};
