import { useQuery } from '@tanstack/react-query';
import { HttpStatusCode } from 'axios';
import { getRequest } from '@api';
import { throwServerError } from '@api/messages/error';
import { ErrorMessages } from '@api/messages/generic';
import { useAuthStore } from '../../store/authStore';
import { isProviderRole } from '../../utils/videoAccess';

const MODEL_NAME = '/payout';

export function useGetProviderPayouts(query = { page: 1, limit: 10 }) {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ['providerPayouts', query],
    queryFn: async () => {
      try {
        const result = await getRequest(`${MODEL_NAME}/provider`, query);
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
