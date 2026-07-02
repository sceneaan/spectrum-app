import { useMemo } from 'react';
import { usePatientGetThreads, useProviderGetThreads } from '@api/services/Thread.Service';
import { isProviderRole } from '../utils/videoAccess';
import { useAuthStore } from '../store/authStore';

const normalizeThreadsList = (data) => {
  if (!data) return [];
  const raw = data.threads ?? data;
  return Array.isArray(raw) ? raw : [];
};

/**
 * Resolve a thread object from navigation params (full thread, threadId, or providerId).
 */
export function useResolvedChatThread(routeParams) {
  const { user } = useAuthStore();
  const isProvider = isProviderRole(user);

  const {
    thread: routeThread,
    threadId: routeThreadId,
    providerId: routeProviderId,
    providerName: routeProviderName,
  } = routeParams || {};

  const { data: patientThreads, isLoading: patientThreadsLoading } = usePatientGetThreads();
  const { data: providerThreads, isLoading: providerThreadsLoading } = useProviderGetThreads();

  const threadsLoading = isProvider ? providerThreadsLoading : patientThreadsLoading;

  const thread = useMemo(() => {
    if (routeThread?.provider || routeThread?.patient) {
      return routeThread;
    }

    const targetId = routeThreadId || routeThread?._id || routeThread?.id;
    const list = normalizeThreadsList(isProvider ? providerThreads : patientThreads);

    if (targetId) {
      const found = list.find((item) => String(item._id || item.id) === String(targetId));
      if (found) return found;

      // Thread may not be in cached list yet (e.g. push with threadId only)
      if (!threadsLoading) {
        return {
          _id: targetId,
          id: targetId,
          ...(routeProviderId || routeProviderName
            ? {
                provider: {
                  ...(routeProviderId ? { _id: routeProviderId, id: routeProviderId } : {}),
                  fullName: routeProviderName || 'Provider',
                },
              }
            : {}),
        };
      }
    }

    if (routeProviderId) {
      const byProvider = list.find(
        (item) => String(item.provider?._id || item.provider?.id || item.providerId) === String(routeProviderId),
      );
      if (byProvider) return byProvider;

      return {
        _id: targetId,
        id: targetId,
        provider: {
          _id: routeProviderId,
          id: routeProviderId,
          fullName: routeProviderName || 'Provider',
        },
      };
    }

    return routeThread || null;
  }, [
    routeThread,
    routeThreadId,
    routeProviderId,
    routeProviderName,
    patientThreads,
    providerThreads,
    isProvider,
    threadsLoading,
  ]);

  const threadId = thread?._id || thread?.id || routeThreadId;
  const hasValidThread = Boolean(
    isProvider
      ? thread?.patient || (threadId && !threadsLoading)
      : thread?.provider || (threadId && !threadsLoading),
  );

  return { thread, threadId, hasValidThread, threadsLoading };
}
