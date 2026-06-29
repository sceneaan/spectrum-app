import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HttpStatusCode } from 'axios';
import { getRequest, postRequest } from '@api';
import { throwServerError } from '@api/messages/error';
import { ErrorMessages } from '@api/messages/generic';
import { useAuthStore } from '../../store/authStore';
import { isProviderRole } from '../../utils/videoAccess';

const MODEL_NAME = '/referral';

export function useGetIncomingReferrals(query = { page: 1, limit: 20 }) {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ['incomingReferrals', query],
    queryFn: async () => {
      try {
        const result = await getRequest(`${MODEL_NAME}/list/incoming`, query);
        if (result.status === HttpStatusCode.Ok) {
          return result.data.data;
        }
        throw new Error(ErrorMessages.generalMessage);
      } catch (err) {
        return throwServerError(err);
      }
    },
    enabled: isAuthenticated && isProviderRole(user),
  });
}

export function useGetReferralDetails(id) {
  const user = useAuthStore((state) => state.user);
  return useQuery({
    queryKey: ['referralDetails', id],
    queryFn: async () => {
      try {
        const result = await getRequest(`${MODEL_NAME}/details/${id}`);
        if (result.status === HttpStatusCode.Ok) {
          return result.data.data;
        }
        throw new Error(ErrorMessages.generalMessage);
      } catch (err) {
        return throwServerError(err);
      }
    },
    enabled: Boolean(id) && isProviderRole(user),
  });
}

export function useChangeReferralStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      try {
        const result = await postRequest(`${MODEL_NAME}/change/status`, payload);
        if (result.status === HttpStatusCode.Ok) {
          return result.data.data;
        }
        throw new Error(ErrorMessages.generalMessage);
      } catch (err) {
        return throwServerError(err);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomingReferrals'] });
      queryClient.invalidateQueries({ queryKey: ['referralDetails'] });
    },
  });
}
