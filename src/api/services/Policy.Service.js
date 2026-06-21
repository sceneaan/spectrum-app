import { useQuery } from '@tanstack/react-query';
import { HttpStatusCode } from 'axios';
import { getRequest } from '@api';
import { throwServerError } from '@api/messages/error';
import { ErrorMessages } from '@api/messages/generic';

// Base URL for the policy API (public endpoint)
const MODEL_NAME = '/public/policy';

/**
 * Hook to get Patient Consent Policy
 * @param {Object} params - Query parameters
 * @param {string} params.language - Language: 'english' or 'arabic' (default: 'english')
 * @param {string} params.version - Optional specific version (e.g., '1.0'). If omitted, returns current version
 * @returns {Object} React Query result with policy data
 */
export function useGetPatientConsent({ language = 'english', version } = {}) {
  const queryParams = {
    title: 'Patient Consent',
    language: language,
  };

  // Add version only if provided
  if (version) {
    queryParams.version = version;
  }

  return useQuery({
    queryKey: ['patientConsent', language, version],
    queryFn: async () => {
      try {
        const result = await getRequest(MODEL_NAME, queryParams);

        if (result.status === HttpStatusCode.Ok) {
          // API returns: { status: 'success', data: { content, arabicContent, englishContent, ... }, message }
          const policyData = result.data?.data || {};

          return {
            content: policyData.content || '',
            arabicContent: policyData.arabicContent || '',
            englishContent: policyData.englishContent || '',
            title: policyData.title || 'Patient Consent',
            version: policyData.version || '1.0',
            date: policyData.date || new Date().toISOString(),
            isCurrentVersion: policyData.isCurrentVersion !== false,
          };
        } else {
          throw new Error(ErrorMessages.generalMessage || 'Failed to fetch patient consent policy');
        }
      } catch (err) {
        console.error('Error fetching patient consent policy:', err);
        return throwServerError(err);
      }
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour (policy doesn't change often)
    cacheTime: 1000 * 60 * 60 * 24, // Keep in cache for 24 hours
    retry: 2, // Retry failed requests twice
  });
}

/**
 * Hook to get any policy by title
 * @param {Object} params - Query parameters
 * @param {string} params.title - Policy title (required)
 * @param {string} params.language - Language: 'english' or 'arabic' (default: 'english')
 * @param {string} params.version - Optional specific version
 * @returns {Object} React Query result with policy data
 */
export function useGetPolicy({ title, language = 'english', version } = {}) {
  const queryParams = {
    title: title,
    language: language,
  };

  if (version) {
    queryParams.version = version;
  }

  return useQuery({
    queryKey: ['policy', title, language, version],
    queryFn: async () => {
      try {
        if (!title) {
          throw new Error('Policy title is required');
        }

        const result = await getRequest(MODEL_NAME, queryParams);

        if (result.status === HttpStatusCode.Ok) {
          const policyData = result.data?.data || {};

          return {
            content: policyData.content || '',
            arabicContent: policyData.arabicContent || '',
            englishContent: policyData.englishContent || '',
            title: policyData.title || title,
            version: policyData.version || '1.0',
            date: policyData.date || new Date().toISOString(),
            isCurrentVersion: policyData.isCurrentVersion !== false,
          };
        } else {
          throw new Error(ErrorMessages.generalMessage || 'Failed to fetch policy');
        }
      } catch (err) {
        console.error('Error fetching policy:', err);
        return throwServerError(err);
      }
    },
    enabled: !!title, // Only run query if title is provided
    staleTime: 1000 * 60 * 60,
    cacheTime: 1000 * 60 * 60 * 24,
    retry: 2,
  });
}
