import { useMutation, useQuery } from '@tanstack/react-query';
import { HttpStatusCode } from 'axios';
import { useEffect, useRef, useCallback, useState } from 'react';
import {
  postFormDataRequest,
  deleteRequest,
  postFormDataWithProgress,
  getArrayBufferRequestWithRetry,
} from '@api';
import { throwServerError } from '@api/messages/error';
import { ErrorMessages } from '@api/messages/generic';

const MODEL_NAME = '/upload';

// ==========================================
// FILE SIZE LIMITS (in bytes)
// ==========================================
const FILE_SIZE_LIMITS = {
  avatar: 5 * 1024 * 1024,           // 5MB
  signature: 2 * 1024 * 1024,        // 2MB
  license: 10 * 1024 * 1024,         // 10MB
  cv: 10 * 1024 * 1024,              // 10MB
  medicalDocument: 2 * 1024 * 1024,  // 2MB
  attachment: 10 * 1024 * 1024,      // 10MB
  category: 5 * 1024 * 1024,         // 5MB
  promotion: 10 * 1024 * 1024,       // 10MB
};

// ==========================================
// ALLOWED FILE TYPES BY ENDPOINT
// ==========================================
const ALLOWED_TYPES = {
  avatar: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  signature: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  license: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'],
  cv: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  medicalDocument: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'],
  attachment: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'],
  category: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  promotion: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
};

// ==========================================
// BLOCKED FILE EXTENSIONS (Security)
// ==========================================
const BLOCKED_EXTENSIONS = [
  'exe', 'bat', 'cmd', 'com', 'msi', 'scr', // Executables
  'js', 'vbs', 'ps1', 'sh', 'php', 'py',    // Scripts
  'svg',                                      // SVG (XSS risk)
  'html', 'htm', 'xhtml',                    // HTML
  'xml', 'xsl', 'xslt',                      // XML
];

// ==========================================
// VALIDATION HELPER FUNCTIONS
// ==========================================

/**
 * Get file extension from filename
 */
function getFileExtension(filename) {
  if (!filename) return '';
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Get file size from various file object formats
 */
function getFileSize(file) {
  if (!file) return null;
  return file.size || file.fileSize || file.length || file.response?.size || null;
}

/**
 * Validate file before upload
 * @param {Object} file - File object
 * @param {string} uploadType - Type of upload (avatar, signature, etc.)
 * @returns {Object} { isValid: boolean, error: string|null }
 */
export function validateFile(file, uploadType) {
  if (!file) {
    return { isValid: false, error: 'No file provided' };
  }

  const filename = file.name || file.filename || file.uri?.split('/').pop() || '';
  const extension = getFileExtension(filename);
  const mimeType = file.type || 'application/octet-stream';
  const fileSize = getFileSize(file);

  // Check blocked extensions
  if (BLOCKED_EXTENSIONS.includes(extension)) {
    return {
      isValid: false,
      error: `File type .${extension} is not allowed for security reasons`,
    };
  }

  // Check allowed types for this upload
  const allowedTypes = ALLOWED_TYPES[uploadType];
  if (allowedTypes && !allowedTypes.includes(mimeType)) {
    return {
      isValid: false,
      error: `File type ${mimeType} is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }

  // Check file size
  const maxSize = FILE_SIZE_LIMITS[uploadType];
  if (maxSize && fileSize && fileSize > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
    const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
    return {
      isValid: false,
      error: `File too large! Your file is ${fileSizeMB} MB but the maximum allowed size is ${maxSizeMB} MB. Please select a smaller file.`,
    };
  }

  return { isValid: true, error: null };
}

/**
 * Create FormData for file upload (React Native compatible)
 */
function createFileFormData(file, fieldName = 'file') {
  let formData = new FormData();

  // Get file size from mobile devices
  let fileSize = file.size || file.fileSize || file.length || file.response?.size;

  formData.append(fieldName, {
    uri: file.uri,
    type: file.type || 'image/jpeg',
    name: file.name || file.filename || file.uri.split('/').pop(),
    size: fileSize,
  });

  return { formData, fileSize };
}

// ==========================================
// LEGACY UPLOAD (for backward compatibility)
// ==========================================

export async function UploadFileOnServer(file) {
  try {
    const { formData, fileSize } = createFileFormData(file);

    const result = await postFormDataRequest(`${MODEL_NAME}/image`, formData);

    if (result.status === HttpStatusCode.Ok) {
      const enhancedResponse = {
        ...result.data,
        size: fileSize || result.data.response?.size,
        response: {
          ...result.data.response,
          size: fileSize || result.data.response?.size,
        },
      };
      return enhancedResponse;
    } else {
      throw new Error(ErrorMessages.generalMessage);
    }
  } catch (err) {
    return throwServerError(err);
  }
}

export function useUploadFileOnServer() {
  return useMutation({
    mutationFn: async (file) => {
      return await UploadFileOnServer(file);
    },
  });
}

// ==========================================
// PUBLIC FILE UPLOADS (return URL)
// ==========================================

/**
 * Upload avatar/profile image (PUBLIC)
 */
export async function uploadAvatar(file, options = {}) {
  // Validate file before upload
  const validation = validateFile(file, 'avatar');
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  try {
    const { formData } = createFileFormData(file);

    // Use progress-enabled upload if callback provided
    if (options.onProgress) {
      const result = await postFormDataWithProgress(
        `${MODEL_NAME}/avatar`,
        formData,
        { onProgress: options.onProgress, abortController: options.abortController }
      );
      if (result.status === HttpStatusCode.Ok) {
        return result.data.data;
      }
    } else {
      const result = await postFormDataRequest(`${MODEL_NAME}/avatar`, formData);
      if (result.status === HttpStatusCode.Ok) {
        return result.data.data;
      }
    }
    throw new Error(ErrorMessages.generalMessage);
  } catch (err) {
    return throwServerError(err);
  }
}

export function useUploadAvatar() {
  return useMutation({
    mutationFn: ({ file, options }) => uploadAvatar(file, options),
  });
}

/**
 * Upload category image (PUBLIC)
 */
export async function uploadCategoryImage(file, options = {}) {
  const validation = validateFile(file, 'category');
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  try {
    const { formData } = createFileFormData(file);

    if (options.onProgress) {
      const result = await postFormDataWithProgress(
        `${MODEL_NAME}/category`,
        formData,
        { onProgress: options.onProgress, abortController: options.abortController }
      );
      if (result.status === HttpStatusCode.Ok) {
        return result.data.data;
      }
    } else {
      const result = await postFormDataRequest(`${MODEL_NAME}/category`, formData);
      if (result.status === HttpStatusCode.Ok) {
        return result.data.data;
      }
    }
    throw new Error(ErrorMessages.generalMessage);
  } catch (err) {
    return throwServerError(err);
  }
}

export function useUploadCategoryImage() {
  return useMutation({
    mutationFn: ({ file, options }) => uploadCategoryImage(file, options),
  });
}

/**
 * Upload promotion image (PUBLIC)
 */
export async function uploadPromotionImage(file, options = {}) {
  const validation = validateFile(file, 'promotion');
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  try {
    const { formData } = createFileFormData(file);

    if (options.onProgress) {
      const result = await postFormDataWithProgress(
        `${MODEL_NAME}/promotion`,
        formData,
        { onProgress: options.onProgress, abortController: options.abortController }
      );
      if (result.status === HttpStatusCode.Ok) {
        return result.data.data;
      }
    } else {
      const result = await postFormDataRequest(`${MODEL_NAME}/promotion`, formData);
      if (result.status === HttpStatusCode.Ok) {
        return result.data.data;
      }
    }
    throw new Error(ErrorMessages.generalMessage);
  } catch (err) {
    return throwServerError(err);
  }
}

export function useUploadPromotionImage() {
  return useMutation({
    mutationFn: ({ file, options }) => uploadPromotionImage(file, options),
  });
}

// ==========================================
// PRIVATE FILE UPLOADS (return fileId)
// ==========================================

/**
 * Upload signature (PRIVATE - requires authentication)
 * Use this for authenticated users updating their signature
 * @param {Object} file - Image file (PNG/JPEG from signature canvas)
 * @param {Object} options - Upload options { onProgress, abortController }
 * @returns {Promise<Object>} { fileId: string }
 */
export async function uploadSignature(file, options = {}) {
  const validation = validateFile(file, 'signature');
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  try {
    const { formData } = createFileFormData(file);

    if (options.onProgress) {
      const result = await postFormDataWithProgress(
        `${MODEL_NAME}/signature`,
        formData,
        { onProgress: options.onProgress, abortController: options.abortController }
      );
      if (result.status === HttpStatusCode.Ok) {
        return result.data.data;
      }
    } else {
      const result = await postFormDataRequest(`${MODEL_NAME}/signature`, formData);
      if (result.status === HttpStatusCode.Ok) {
        return result.data.data;
      }
    }
    throw new Error(ErrorMessages.generalMessage);
  } catch (err) {
    return throwServerError(err);
  }
}

export function useUploadSignature() {
  return useMutation({
    mutationFn: ({ file, options }) => uploadSignature(file, options),
  });
}

/**
 * Upload guest signature (PUBLIC - no authentication required)
 * Use this for new user registration/patient consent
 * @param {Object} file - Image file (PNG/JPEG from signature canvas)
 * @param {Object} options - Upload options { onProgress, abortController }
 * @returns {Promise<Object>} { fileId: string }
 */
export async function uploadGuestSignature(file, options = {}) {
  const validation = validateFile(file, 'signature');
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  try {
    const { formData } = createFileFormData(file);

    if (options.onProgress) {
      const result = await postFormDataWithProgress(
        `${MODEL_NAME}/guest/signature`,
        formData,
        { onProgress: options.onProgress, abortController: options.abortController }
      );
      if (result.status === HttpStatusCode.Ok) {
        return result.data.data;
      }
    } else {
      const result = await postFormDataRequest(`${MODEL_NAME}/guest/signature`, formData);
      if (result.status === HttpStatusCode.Ok) {
        return result.data.data;
      }
    }
    throw new Error(ErrorMessages.generalMessage);
  } catch (err) {
    return throwServerError(err);
  }
}

export function useUploadGuestSignature() {
  return useMutation({
    mutationFn: ({ file, options }) => uploadGuestSignature(file, options),
  });
}

/**
 * Upload license document (PRIVATE)
 * @param {Object} file - Image or PDF file
 * @param {Object} options - Upload options { onProgress, abortController }
 * @returns {Promise<Object>} { fileId: string }
 */
export async function uploadLicense(file, options = {}) {
  const validation = validateFile(file, 'license');
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  try {
    const { formData } = createFileFormData(file);

    if (options.onProgress) {
      const result = await postFormDataWithProgress(
        `${MODEL_NAME}/license`,
        formData,
        { onProgress: options.onProgress, abortController: options.abortController }
      );
      if (result.status === HttpStatusCode.Ok) {
        return result.data.data;
      }
    } else {
      const result = await postFormDataRequest(`${MODEL_NAME}/license`, formData);
      if (result.status === HttpStatusCode.Ok) {
        return result.data.data;
      }
    }
    throw new Error(ErrorMessages.generalMessage);
  } catch (err) {
    return throwServerError(err);
  }
}

export function useUploadLicense() {
  return useMutation({
    mutationFn: ({ file, options }) => uploadLicense(file, options),
  });
}

/**
 * Upload CV document (PRIVATE)
 * @param {Object} file - PDF or DOC file
 * @param {Object} options - Upload options { onProgress, abortController }
 * @returns {Promise<Object>} { fileId: string }
 */
export async function uploadCV(file, options = {}) {
  const validation = validateFile(file, 'cv');
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  try {
    const { formData } = createFileFormData(file);

    if (options.onProgress) {
      const result = await postFormDataWithProgress(
        `${MODEL_NAME}/cv`,
        formData,
        { onProgress: options.onProgress, abortController: options.abortController }
      );
      if (result.status === HttpStatusCode.Ok) {
        return result.data.data;
      }
    } else {
      const result = await postFormDataRequest(`${MODEL_NAME}/cv`, formData);
      if (result.status === HttpStatusCode.Ok) {
        return result.data.data;
      }
    }
    throw new Error(ErrorMessages.generalMessage);
  } catch (err) {
    return throwServerError(err);
  }
}

export function useUploadCV() {
  return useMutation({
    mutationFn: ({ file, options }) => uploadCV(file, options),
  });
}

/**
 * Upload medical document (PRIVATE)
 */
export async function uploadMedicalDocument(file, options = {}) {
  const validation = validateFile(file, 'medicalDocument');
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  try {
    const { formData } = createFileFormData(file);

    if (options.relatedPatient) {
      formData.append('relatedPatient', options.relatedPatient);
    }
    if (options.relatedProvider) {
      formData.append('relatedProvider', options.relatedProvider);
    }
    if (options.relatedAppointment) {
      formData.append('relatedAppointment', options.relatedAppointment);
    }

    if (options.onProgress) {
      const result = await postFormDataWithProgress(
        `${MODEL_NAME}/medical-document`,
        formData,
        { onProgress: options.onProgress, abortController: options.abortController }
      );
      if (result.status === HttpStatusCode.Ok) {
        return result.data.data;
      }
    } else {
      const result = await postFormDataRequest(`${MODEL_NAME}/medical-document`, formData);
      if (result.status === HttpStatusCode.Ok) {
        return result.data.data;
      }
    }
    throw new Error(ErrorMessages.generalMessage);
  } catch (err) {
    return throwServerError(err);
  }
}

export function useUploadMedicalDocument() {
  return useMutation({
    mutationFn: ({ file, options }) => uploadMedicalDocument(file, options),
  });
}

/**
 * Upload general document (PRIVATE)
 */
export async function uploadDocument(file, options = {}) {
  const validation = validateFile(file, 'medicalDocument');
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  try {
    const { formData } = createFileFormData(file);

    if (options.relatedPatient) {
      formData.append('relatedPatient', options.relatedPatient);
    }
    if (options.relatedProvider) {
      formData.append('relatedProvider', options.relatedProvider);
    }

    if (options.onProgress) {
      const result = await postFormDataWithProgress(
        `${MODEL_NAME}/document`,
        formData,
        { onProgress: options.onProgress, abortController: options.abortController }
      );
      if (result.status === HttpStatusCode.Ok) {
        return result.data.data;
      }
    } else {
      const result = await postFormDataRequest(`${MODEL_NAME}/document`, formData);
      if (result.status === HttpStatusCode.Ok) {
        return result.data.data;
      }
    }
    throw new Error(ErrorMessages.generalMessage);
  } catch (err) {
    return throwServerError(err);
  }
}

export function useUploadDocument() {
  return useMutation({
    mutationFn: ({ file, options }) => uploadDocument(file, options),
  });
}

/**
 * Upload chat attachment (PRIVATE)
 */
export async function uploadAttachment(file, options = {}) {
  const validation = validateFile(file, 'attachment');
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  try {
    const { formData, fileSize } = createFileFormData(file);

    console.log('📤 [uploadAttachment] Uploading with options:', {
      threadId: options.threadId,
      fileName: file.name,
      fileType: file.type,
      fileSize: fileSize,
    });

    if (options.threadId) {
      formData.append('relatedThread', options.threadId);
      console.log('📤 [uploadAttachment] Added relatedThread to formData:', options.threadId);
    } else {
      console.warn('📤 [uploadAttachment] WARNING: No threadId provided!');
    }

    if (options.onProgress) {
      const result = await postFormDataWithProgress(
        `${MODEL_NAME}/attachment`,
        formData,
        { onProgress: options.onProgress, abortController: options.abortController }
      );
      if (result.status === HttpStatusCode.Ok) {
        return result.data.data;
      }
    } else {
      const result = await postFormDataRequest(`${MODEL_NAME}/attachment`, formData);
      if (result.status === HttpStatusCode.Ok) {
        return result.data.data;
      }
    }
    throw new Error(ErrorMessages.generalMessage);
  } catch (err) {
    // Handle specific error cases with user-friendly messages
    const status = err.response?.status;
    const serverMessage = err.response?.data?.message;

    console.log('📤 [uploadAttachment] Error:', { status, serverMessage, message: err.message });

    // File too large error (413 Payload Too Large or multer limit error)
    if (status === 413 || (serverMessage && serverMessage.toLowerCase().includes('large'))) {
      const maxSizeMB = (FILE_SIZE_LIMITS.attachment / (1024 * 1024)).toFixed(0);
      throw new Error(`File is too large. Maximum size is ${maxSizeMB}MB. Please select a smaller file.`);
    }

    // Unsupported file type
    if (serverMessage && (serverMessage.toLowerCase().includes('type') || serverMessage.toLowerCase().includes('allowed'))) {
      throw new Error('This file type is not supported. Please upload an image (JPEG, PNG) or PDF file.');
    }

    // Network timeout
    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      throw new Error('Upload timed out. Please check your internet connection and try again.');
    }

    // Network error
    if (err.message === 'Network Error' || !err.response) {
      throw new Error('Unable to upload. Please check your internet connection and try again.');
    }

    return throwServerError(err);
  }
}

export function useUploadAttachment() {
  return useMutation({
    mutationFn: ({ file, options }) => uploadAttachment(file, options),
  });
}

// ==========================================
// PRIVATE FILE RETRIEVAL (with retry logic)
// ==========================================

/**
 * Get private file by fileId (returns arraybuffer, with retry)
 * @param {string} fileId - File ID
 * @param {Object} retryOptions - Optional retry configuration
 */
export async function getPrivateFile(fileId, retryOptions = {}) {
  try {
    const result = await getArrayBufferRequestWithRetry(
      `${MODEL_NAME}/private/${fileId}`,
      {},
      {},
      retryOptions
    );
    if (result.status === HttpStatusCode.Ok) {
      return result.data;
    } else {
      throw new Error(ErrorMessages.generalMessage);
    }
  } catch (err) {
    return throwServerError(err);
  }
}

/**
 * Convert ArrayBuffer to base64 string (React Native compatible)
 * Note: React Native doesn't have btoa, so we use a custom implementation
 */
function arrayBufferToBase64(buffer, mimeType = 'application/octet-stream') {
  const bytes = new Uint8Array(buffer);
  const len = bytes.length;

  // Base64 encoding characters
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let base64 = '';

  for (let i = 0; i < len; i += 3) {
    const byte1 = bytes[i];
    const byte2 = i + 1 < len ? bytes[i + 1] : 0;
    const byte3 = i + 2 < len ? bytes[i + 2] : 0;

    const enc1 = byte1 >> 2;
    const enc2 = ((byte1 & 3) << 4) | (byte2 >> 4);
    const enc3 = ((byte2 & 15) << 2) | (byte3 >> 6);
    const enc4 = byte3 & 63;

    base64 += chars.charAt(enc1) + chars.charAt(enc2);

    if (i + 1 < len) {
      base64 += chars.charAt(enc3);
    } else {
      base64 += '=';
    }

    if (i + 2 < len) {
      base64 += chars.charAt(enc4);
    } else {
      base64 += '=';
    }
  }

  return `data:${mimeType};base64,${base64}`;
}

/**
 * Get private file as base64 string (for React Native Image components)
 * Uses retry logic for transient network failures
 */
export async function getPrivateFileAsBase64(fileId, retryOptions = {}) {
  try {
    console.log(`📥 [getPrivateFileAsBase64] Fetching file: ${fileId}`);
    const result = await getArrayBufferRequestWithRetry(
      `${MODEL_NAME}/private/${fileId}`,
      {},
      {},
      retryOptions
    );

    if (result.status === HttpStatusCode.Ok) {
      const contentType = result.headers['content-type'] || 'application/octet-stream';
      const dataSize = result.data?.byteLength || 0;
      console.log(`📥 [getPrivateFileAsBase64] Received ${dataSize} bytes, type: ${contentType}`);

      const base64Url = arrayBufferToBase64(result.data, contentType);
      console.log(`📥 [getPrivateFileAsBase64] Base64 URL length: ${base64Url?.length || 0}, starts with: ${base64Url?.substring(0, 50)}...`);

      return base64Url;
    } else {
      throw new Error(ErrorMessages.generalMessage);
    }
  } catch (err) {
    // Handle authorization errors gracefully - don't throw, just return null
    const errorMessage = err?.response?.data?.message || err?.message || '';
    const isAuthError =
      err?.response?.status === 403 ||
      err?.response?.status === 401 ||
      errorMessage.toLowerCase().includes('not authorized') ||
      errorMessage.toLowerCase().includes('access denied') ||
      errorMessage.toLowerCase().includes('forbidden');

    if (isAuthError) {
      console.warn(`📥 [getPrivateFileAsBase64] Access denied for file ${fileId} - user may not have permission`);
      return null; // Return null instead of throwing for auth errors
    }

    console.error(`📥 [getPrivateFileAsBase64] Error fetching file ${fileId}:`, err);
    return null; // Return null for other errors too to prevent app crashes
  }
}

/**
 * Delete private file by fileId
 */
export async function deletePrivateFile(fileId) {
  try {
    const result = await deleteRequest(`${MODEL_NAME}/private/${fileId}`);
    if (result.status === HttpStatusCode.Ok) {
      return result.data.data;
    } else {
      throw new Error(ErrorMessages.generalMessage);
    }
  } catch (err) {
    return throwServerError(err);
  }
}

export function useDeletePrivateFile() {
  return useMutation({
    mutationFn: deletePrivateFile,
  });
}

// ==========================================
// REACT QUERY HOOKS FOR PRIVATE FILES
// ==========================================

/**
 * Hook to fetch private file as base64
 * Includes proper retry logic via the underlying request
 * Silently handles authorization errors (returns null)
 */
export function usePrivateFile(fileId, options = {}) {
  return useQuery({
    queryKey: ['privateFile', fileId],
    queryFn: () => getPrivateFileAsBase64(fileId, options.retryOptions),
    enabled: !!fileId && options.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (renamed from cacheTime in v5)
    retry: false, // We handle retries in the request layer
    throwOnError: false, // Don't throw errors to prevent console errors for auth issues
    ...options,
  });
}

/**
 * Hook to get signature URL with fallback to legacy
 * @param {Object} user - User object
 */
export function useSignatureUrl(user) {
  const fileId = user?.signatureFileId;
  const legacyUrl = user?.signatureUrl;

  const { data: privateUrl, isLoading, error } = usePrivateFile(fileId, {
    enabled: !!fileId,
  });

  return {
    signatureUrl: fileId ? privateUrl : legacyUrl,
    isLoading: !!fileId && isLoading,
    error,
    isPrivate: !!fileId,
  };
}

/**
 * Hook to get license URL with fallback to legacy
 */
export function useLicenseUrl(user) {
  const fileId = user?.licenseFileId;
  const legacyUrl = user?.licenseImage;

  const { data: privateUrl, isLoading, error } = usePrivateFile(fileId, {
    enabled: !!fileId,
  });

  return {
    licenseUrl: fileId ? privateUrl : legacyUrl,
    isLoading: !!fileId && isLoading,
    error,
    isPrivate: !!fileId,
  };
}

/**
 * Hook to get CV URL with fallback to legacy
 */
export function useCVUrl(user) {
  const fileId = user?.cvFileId;
  const legacyUrl = user?.cv;

  const { data: privateUrl, isLoading, error } = usePrivateFile(fileId, {
    enabled: !!fileId,
  });

  return {
    cvUrl: fileId ? privateUrl : legacyUrl,
    isLoading: !!fileId && isLoading,
    error,
    isPrivate: !!fileId,
  };
}

/**
 * Hook to get profile image URL with fallback to legacy
 * Handles both patient (private) and provider (public) profile images
 */
export function useProfileImageUrl(user) {
  const fileId = user?.profileImageFileId;
  const legacyUrl = user?.profileImage;

  const { data: privateUrl, isLoading, error } = usePrivateFile(fileId, {
    enabled: !!fileId,
  });

  return {
    profileImageUrl: fileId ? privateUrl : legacyUrl,
    isLoading: !!fileId && isLoading,
    error,
    isPrivate: !!fileId,
  };
}

/**
 * Hook to get document URL with fallback to legacy
 */
export function useDocumentUrl(doc) {
  const fileId = doc?.documentFileId;
  const legacyUrl = doc?.document;

  const { data: privateUrl, isLoading, error } = usePrivateFile(fileId, {
    enabled: !!fileId,
  });

  return {
    documentUrl: fileId ? privateUrl : legacyUrl,
    isLoading: !!fileId && isLoading,
    error,
    isPrivate: !!fileId,
  };
}

/**
 * Hook to get attachment URL with fallback to legacy
 */
export function useAttachmentUrl(attachment) {
  const fileId = attachment?.fileId;
  const legacyUrl = attachment?.url;

  const { data: privateUrl, isLoading, error } = usePrivateFile(fileId, {
    enabled: !!fileId,
  });

  return {
    attachmentUrl: fileId ? privateUrl : legacyUrl,
    isLoading: !!fileId && isLoading,
    error,
    isPrivate: !!fileId,
  };
}

// ==========================================
// UPLOAD WITH PROGRESS HOOK
// ==========================================

/**
 * Hook for file upload with progress tracking
 * @param {function} uploadFn - The upload function to use
 * @returns {Object} { upload, progress, isUploading, error, reset, cancel }
 */
export function useUploadWithProgress(uploadFn) {
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  const reset = useCallback(() => {
    setProgress(0);
    setError(null);
    setIsUploading(false);
  }, []);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    reset();
  }, [reset]);

  const upload = useCallback(async (file, options = {}) => {
    setIsUploading(true);
    setProgress(0);
    setError(null);

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      const result = await uploadFn(file, {
        ...options,
        onProgress: (percent) => {
          setProgress(percent);
          if (options.onProgress) {
            options.onProgress(percent);
          }
        },
        abortController: abortControllerRef.current,
      });

      setProgress(100);
      setIsUploading(false);
      return result;
    } catch (err) {
      if (err.name === 'AbortError' || err.message === 'canceled') {
        setError({ message: 'Upload cancelled' });
      } else {
        setError(err);
      }
      setIsUploading(false);
      throw err;
    }
  }, [uploadFn]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    upload,
    progress,
    isUploading,
    error,
    reset,
    cancel,
  };
}

// ==========================================
// BLOB URL MANAGEMENT HOOK
// ==========================================

/**
 * Hook for managing blob URLs with automatic cleanup
 * Prevents memory leaks by revoking URLs when component unmounts
 * @returns {Object} { createBlobUrl, revokeBlobUrl, revokeAll }
 */
export function useBlobUrlManager() {
  const blobUrlsRef = useRef(new Set());

  const createBlobUrl = useCallback((blob) => {
    const url = URL.createObjectURL(blob);
    blobUrlsRef.current.add(url);
    return url;
  }, []);

  const revokeBlobUrl = useCallback((url) => {
    if (blobUrlsRef.current.has(url)) {
      URL.revokeObjectURL(url);
      blobUrlsRef.current.delete(url);
    }
  }, []);

  const revokeAll = useCallback(() => {
    blobUrlsRef.current.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    blobUrlsRef.current.clear();
  }, []);

  // Cleanup all URLs on unmount
  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      blobUrlsRef.current.clear();
    };
  }, []);

  return {
    createBlobUrl,
    revokeBlobUrl,
    revokeAll,
  };
}

// ==========================================
// EXPORT CONSTANTS FOR EXTERNAL USE
// ==========================================

export { FILE_SIZE_LIMITS, ALLOWED_TYPES, BLOCKED_EXTENSIONS };
