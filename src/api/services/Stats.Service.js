import { useQuery } from '@tanstack/react-query';
import { HttpStatusCode } from 'axios';
import { getRequest } from '@api';
import { throwServerError } from '@api/messages/error';
import { useAuthStore } from '../../store/authStore';
import { isProviderRole } from '../../utils/videoAccess';

const MODEL_NAME = '/stats';

export function useGetProviderEarningStats() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ['providerEarningStats'],
    queryFn: async () => {
      try {
        const result = await getRequest(`${MODEL_NAME}/provider/earnings`);
        if (result.status === HttpStatusCode.Ok) {
          return result.data?.data ?? result.data;
        }
        throw new Error('Failed to load earnings');
      } catch (err) {
        return throwServerError(err);
      }
    },
    enabled: isAuthenticated && isProviderRole(user),
  });
}
