import { useQuery } from '@tanstack/react-query';
import { HttpStatusCode } from 'axios';
import { getRequest } from '@api';
import { throwServerError } from '@api/messages/error';
import { useAuthStore } from '../../store/authStore';
import { isProviderRole } from '../../utils/videoAccess';

const MODEL_NAME = '/stats';

export const EMPTY_PROVIDER_METRICS = {
  period: 'Daily',
  categories: [],
  consultations: { data: [], total: 0 },
  totalConsultationMinutes: { data: [], total: 0 },
  satisfaction: { data: [], average: 0, totalSurveys: 0 },
  cancellationRate: { data: [], average: 0 },
  revenue: { data: [], total: 0, currency: 'SAR' },
  punctuality: { data: [], average: 0 },
};

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

export function useGetProviderPerformanceMetrics(period = 'Daily') {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ['providerPerformanceMetrics', period],
    queryFn: async () => {
      try {
        const result = await getRequest('/stats/provider/performance-metrics', { period });
        if (result.status === HttpStatusCode.Ok) {
          return result.data.data || result.data;
        }
        throw new Error('Failed to load performance metrics');
      } catch (err) {
        return throwServerError(err);
      }
    },
    enabled: isAuthenticated && isProviderRole(user),
  });
}
