import { useQuery, useMutation } from '@tanstack/react-query';
import { HttpStatusCode } from 'axios';
import { getRequest, postRequest } from '@api';
import { ErrorMessages } from '@api/messages/generic';


// Base URL for the API
const MODEL_NAME = '/auth';

// Function to get OTP
export function useRequestOtp() {
  return useQuery({
    queryKey: ['otp'],
    queryFn: async (payload) => {
      try {
        const result = await postRequest(`${MODEL_NAME}/otp`, payload);
        if (result.status === HttpStatusCode.Ok) {
          return result.data.data;
        } else {
          throw new Error(ErrorMessages.generalMessage);
        }
      } catch (err) {
        return throwServerError(err);
      }
    },
  });
}

// Function to verify OTP
export function useVerifyOtp() {
  return useMutation({
    mutationFn: async (payload) => {
      try {
        const result = await postRequest(`${MODEL_NAME}/otp/verify`, payload);
        if (result.status === HttpStatusCode.Ok) {
          return result.data.data;
        } else {
          throw new Error(ErrorMessages.generalMessage);
        }
      } catch (err) {
        // Handle rate limit error (429) specifically
        if (err.response?.status === 429) {
          const error = new Error('RATE_LIMIT_EXCEEDED');
          error.isRateLimited = true;
          error.retryAfter = err.response?.headers?.['retry-after'] || 60;
          throw error;
        }
        throw new Error(err.response?.data?.message || ErrorMessages.generalMessage);
      }
    },
  });
}

// Function for patient consent
export function usePatientConsent() {
  return useMutation({
    mutationFn:
      async (payload) => {
        const result = await postRequest(`${MODEL_NAME}/patient/consent`, payload);
        if (result.status === HttpStatusCode.Ok) {
          return result.data.data;
        } else {
          throw new Error(ErrorMessages.generalMessage);
        }
      },
  });
}

// Function to send OTP
export function useSendOtp() {
  return useMutation({
    mutationFn:
      async (payload) => {
        const result = await postRequest(`${MODEL_NAME}/app/send/otp`, payload);
        if (result.status === HttpStatusCode.Ok) {
          return result.data.data;
        } else {
          throw new Error(ErrorMessages.generalMessage);
        }
      },
  });
}

// Function to resend OTP
export function useResendOtp() {
  return useMutation({
    mutationFn: async (payload) => {
      try {
        const result = await postRequest(`${MODEL_NAME}/app/resend/otp`, payload);
        if (result.status === HttpStatusCode.Ok) {
          return result.data.data;
        } else {
          throw new Error(ErrorMessages.generalMessage);
        }
      } catch (err) {
        throw err; // Propagate the original error with response data
      }
    },
  });
}

// Function to register a provider
export function useSignupProvider() {
  return useMutation({
    mutationFn:
      async (payload) => {
        const result = await postRequest(`${MODEL_NAME}/register/provider`, payload);
        if (result.status === HttpStatusCode.Ok) {
          return result.data.data;
        } else {
          throw new Error(ErrorMessages.generalMessage);
        }
      },
  });
}

// Direct function versions (used in some components)
export async function SendOtp(payload) {
  try {
    const result = await postRequest(`${MODEL_NAME}/app/send/otp`, payload);
    if (result.status === HttpStatusCode.Ok) {
      return result.data.data;
    } else {
      throw new Error(ErrorMessages.generalMessage);
    }
  } catch (err) {
    throw new Error(err.response?.data?.message || ErrorMessages.generalMessage);
  }
}

export async function VerifyOtp(payload) {
  try {
    const result = await postRequest(`${MODEL_NAME}/otp/verify`, payload);
    if (result.status === HttpStatusCode.Ok) {
      return result.data.data;
    } else {
      throw new Error(ErrorMessages.generalMessage);
    }
  } catch (err) {
    throw new Error(err.response?.data?.message || ErrorMessages.generalMessage);
  }
}

export async function ResendOtp(payload) {
  try {
    const result = await postRequest(`${MODEL_NAME}/app/resend/otp`, payload);
    if (result.status === HttpStatusCode.Ok) {
      return result.data.data;
    } else {
      throw new Error(ErrorMessages.generalMessage);
    }
  } catch (err) {
    throw new Error(err.response?.data?.message || ErrorMessages.generalMessage);
  }
}

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken - The refresh token
 * @returns {Promise<{token: string, refreshToken: string, expiresIn: number}>}
 */
export async function RefreshToken(refreshToken) {
  try {
    const result = await postRequest(`${MODEL_NAME}/refresh-token`, {
      refreshToken: refreshToken,
    });
    if (result.status === HttpStatusCode.Ok) {
      return result.data.data;
    } else {
      throw new Error(ErrorMessages.sessionExpired || 'Session expired');
    }
  } catch (err) {
    throw new Error(err.response?.data?.message || ErrorMessages.sessionExpired || 'Session expired');
  }
}

/**
 * Logout user and invalidate refresh token on server
 * @returns {Promise<{message: string}>}
 */
export async function Logout() {
  try {
    const result = await postRequest(`${MODEL_NAME}/logout`);
    if (result.status === HttpStatusCode.Ok) {
      return result.data.data;
    }
    return { message: 'Logged out' };
  } catch (err) {
    // Don't throw error on logout failure - just log it
    console.warn('Logout API call failed:', err.message);
    return { message: 'Logged out locally' };
  }
}

/**
 * Hook for logout mutation
 */
export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      return await Logout();
    },
  });
}

/**
 * Hook for refresh token mutation
 */
export function useRefreshToken() {
  return useMutation({
    mutationFn: async (refreshToken) => {
      return await RefreshToken(refreshToken);
    },
  });
}
