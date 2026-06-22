import { useQuery, useMutation } from '@tanstack/react-query';
import { HttpStatusCode } from 'axios';
import { getRequest, postRequest } from '@api';
import { throwServerError } from '@api/messages/error';
import { ErrorMessages } from '@api/messages/generic';
import { useAuthStore } from '../../store/authStore';

const MODEL_NAME = '/transaction';

// Hook to create a single transaction
export function useCreateTransaction() {
  return useMutation({
    mutationFn: async (payload) => {
      try {
        const result = await postRequest(`${MODEL_NAME}/create`, payload);
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

// Hook to create multiple transactions
export function useCreateMultipleTransactions() {
  return useMutation({
    mutationFn: async (payload) => {
      try {
        const result = await postRequest(`${MODEL_NAME}/multiple`, payload);
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

export function useGetAllTransactions(patientId, queryParams = {}) {
  return useQuery({
    queryKey: ['allTransactions', patientId, queryParams],
    queryFn: async () => {
      try {


        // Filter out undefined values to avoid sending them to API
        const cleanParams = Object.entries(queryParams).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            acc[key] = value;
          }
          return acc;
        }, {});

        const result = await getRequest(`${MODEL_NAME}/patient`, cleanParams);



        if (result.status === HttpStatusCode.Ok) {
          // Handle response structure
          let responseData = result.data;

          // Check if data is nested under 'data' property
          if (result.data.data) {
            responseData = result.data.data;
          }

          const transactions = responseData.transactions || [];
          const pagination = responseData.pagination || {};

          return {
            transactions,
            pagination: {
              currentPage: pagination.currentPage || 1,
              totalPages: pagination.totalPages || 1,
              totalDocs: pagination.totalDocs || transactions.length,
              hasNextPage: pagination.currentPage < pagination.totalPages,
              hasPreviousPage: pagination.currentPage > 1,
            },
          };
        } else {
          throw new Error(ErrorMessages.generalMessage);
        }
      } catch (err) {
        console.error('Transaction fetch error:', err);
        return throwServerError(err);
      }
    },
    // Enhanced query options
    enabled: !!patientId,
    staleTime: 30000, // 30 seconds - prevents refetching too often
    cacheTime: 300000, // 5 minutes - keeps data in cache
    keepPreviousData: true, // Keeps previous data while loading new data
    refetchOnWindowFocus: false, // Prevents refetch when window gains focus
    retry: 2, // Retry failed requests twice
  });
}
// Hook to get patient transactions
export function useGetPatientTransactions(query) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return useQuery({
    queryKey: ['patientTransactions', query],
    queryFn: async () => {
      try {
        const result = await getRequest(`${MODEL_NAME}/patient`, query);
        if (result.status === HttpStatusCode.Ok) {
          return result.data.data;
        } else {
          throw new Error(ErrorMessages.generalMessage);
        }
      } catch (err) {
        return throwServerError(err);
      }
    },
    enabled: isAuthenticated,
  });
}

export function useGetWalletTransactions(query = { page: 1, limit: 10 }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return useQuery({
    queryKey: ['walletTransactions', query],
    queryFn: async () => {
      try {
        const result = await getRequest(`${MODEL_NAME}/wallet-transactions`, query);
        if (result.status === HttpStatusCode.Ok) {
          const payload = result.data?.data || {};
          const transactions = payload.transactions || [];
          const pagination = payload.pagination || {};
          return {
            transactions,
            pagination: {
              currentPage: pagination.currentPage || query.page || 1,
              totalPages: pagination.totalPages || 1,
              totalDocs: pagination.totalDocs || transactions.length,
              hasNextPage: (pagination.currentPage || query.page || 1) < (pagination.totalPages || 1),
              hasPreviousPage: (pagination.currentPage || query.page || 1) > 1,
            },
          };
        } else {
          throw new Error(ErrorMessages.generalMessage);
        }
      } catch (err) {
        return throwServerError(err);
      }
    },
    keepPreviousData: true,
    refetchOnWindowFocus: false,
    retry: 2,
    enabled: isAuthenticated,
  });
}
