import { useQuery, useMutation } from '@tanstack/react-query';
import { HttpStatusCode } from 'axios';
import { getRequest, postRequest, putRequest } from '@api';
import { throwServerError } from '@api/messages/error';
import { ErrorMessages } from '@api/messages/generic';

const MODEL_NAME = '/wallet';

// Hook to update a wallet
export function useUpdateWallet() {
  return useMutation({
    mutationFn: async (payload) => {
      try {
        const result = await putRequest(`${MODEL_NAME}/update`, payload);
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

// Hook to update wallet for multiple transactions
export function useUpdateWalletForMultipleTransactions() {
  return useMutation({
    mutationFn: async (payload) => {
      try {
        const result = await putRequest(`${MODEL_NAME}/multiple`, payload);
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

// Hook to list wallet transactions
export function useWalletListing(payload) {
  return useQuery({
    queryKey: ['walletListing', payload],
    queryFn: async () => {
      try {
        const result = await getRequest(`${MODEL_NAME}/listing`, payload);
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

// Hook to make a payout for a specific wallet
export function useMakePayout() {
  return useMutation({
    mutationFn: async ({ data, id }) => {
      try {
        const result = await postRequest(`${MODEL_NAME}/${id}/payout`, data);
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

export function useGetMyWallet() {
  return useQuery({
    queryKey: ['myWallet'],
    queryFn: async () => {
      try {
        const result = await getRequest(`${MODEL_NAME}/get/my`);
        if (result.status === HttpStatusCode.Ok) {
          return result.data.data;
        } else {
          throw new Error(ErrorMessages.generalMessage);
        }
      } catch (err) {
        return throwServerError(err);
      }
    },
    staleTime: 0, // Always consider data stale, refetch on mount
    cacheTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}
