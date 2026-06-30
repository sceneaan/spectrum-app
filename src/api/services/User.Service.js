import { useQuery, useMutation } from '@tanstack/react-query';
import { HttpStatusCode } from 'axios';
import { getRequest, putRequest, postRequest } from '@api';
import { throwServerError } from '@api/messages/error';
import { ErrorMessages } from '@api/messages/generic';
import { useAuthStore } from '../../store/authStore';

const MODEL_NAME = '/user';

// Generic request handler
async function handleRequest(request, ...args) {
  try {
    const result = await request(...args);
    if (result.status === HttpStatusCode.Ok) {
      return result.data.data;
    } else {
      throw new Error(ErrorMessages.generalMessage);
    }
  } catch (err) {
    return throwServerError(err);
  }
}

// Get the current user (direct async function)
export async function GetCurrentUser() {
  return handleRequest(getRequest, `${MODEL_NAME}/context`);
}

// Get user data (direct async function)
export async function GetUserData() {
  return handleRequest(getRequest, `${MODEL_NAME}/user`);
}

// Update ELM verification data for existing patient
export async function updateElmVerification(payload) {
  return handleRequest(putRequest, `${MODEL_NAME}/update-elm-verification`, payload);
}

// Hook to get the current user (React Query version)
export function useGetCurrentUser() {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: () => handleRequest(getRequest, `${MODEL_NAME}/context`),
  });
}

// Hook to get user data (React Query version) — full private profile, matches web getUserData()
export function useGetUserData() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return useQuery({
    queryKey: ['userData'],
    queryFn: () => handleRequest(getRequest, `${MODEL_NAME}/user`),
    staleTime: 0,
    refetchOnMount: 'always',
    enabled: isAuthenticated,
  });
}

// Hook to update user profile
export function useUpdateProfile() {
  return useMutation({
    mutationFn: (payload) => handleRequest(putRequest, `${MODEL_NAME}/update`, payload),
  });
}

export function useUpdateUserLanguage() {
  return useMutation({
    mutationFn: (payload) => handleRequest(putRequest, `${MODEL_NAME}/preferred-language`, payload),
  });
}

export function useGetUserProfile(userId) {
  return useQuery({
    queryKey: ['userId', userId],
    queryFn: () => handleRequest(getRequest, `${MODEL_NAME}/details/${userId}`),
  });
}

export async function setNotificationToken(payload) {
  return handleRequest(putRequest, `${MODEL_NAME}/set-notification-token`, payload);
}

// Direct function version of updateProfile (used in some components)
export async function UpdateProfile(payload) {
  return handleRequest(putRequest, `${MODEL_NAME}/update`, payload);
}

export async function updateUserLanguage(payload) {
  return handleRequest(putRequest, `${MODEL_NAME}/preferred-language`, payload);
}

// Hook to get all providers with optional filters
export function useGetProviders(query = {}) {
  return useQuery({
    queryKey: ['providers', query],
    queryFn: () => handleRequest(getRequest, `${MODEL_NAME}/providers/filters`, query),
  });
}

/**
 * Check if a National ID is already registered
 * @param {string} nationalId - The national ID to check
 * @param {string} excludeUserId - Optional user ID to exclude (for updates)
 * @returns {Promise<{available: boolean, message: string, messageAr: string}>}
 */
export async function sendVerificationOtp() {
  return handleRequest(postRequest, `${MODEL_NAME}/send-otp`);
}

export async function verifyPhoneOtp(otp) {
  return handleRequest(postRequest, `${MODEL_NAME}/verify-phone-otp`, { otp });
}

export async function sendEmailVerificationOtp() {
  return handleRequest(postRequest, `${MODEL_NAME}/send-email-otp`);
}

export async function verifyEmailOtp(otp) {
  return handleRequest(postRequest, `${MODEL_NAME}/verify-email-otp`, { otp });
}

export function useGetPatientMedicalRecord(patientId) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return useQuery({
    queryKey: ['patientMedicalRecord', patientId],
    queryFn: () => handleRequest(getRequest, `${MODEL_NAME}/medical/record/${patientId}`),
    enabled: isAuthenticated && Boolean(patientId),
  });
}

export async function checkNationalIdAvailability(nationalId, excludeUserId = null) {
  try {
    let url = `${MODEL_NAME}/check-national-id/${encodeURIComponent(nationalId)}`;
    if (excludeUserId) {
      url += `?excludeUserId=${excludeUserId}`;
    }
    const result = await getRequest(url);
    if (result.status === HttpStatusCode.Ok) {
      return result.data.data;
    }
    throw new Error(ErrorMessages.generalMessage);
  } catch (err) {
    console.error('Error checking national ID:', err);
    // Return unavailable on error so duplicate IDs are not silently allowed
    return {
      available: false,
      message: 'Could not verify national ID. Please try again.',
      messageAr: 'تعذر التحقق من رقم الهوية. يرجى المحاولة مرة أخرى.',
    };
  }
}
