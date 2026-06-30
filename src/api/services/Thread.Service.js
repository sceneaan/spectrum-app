import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HttpStatusCode } from 'axios';
import { getRequest, postRequest } from '@api';
import { throwServerError } from '@api/messages/error';
import { ErrorMessages } from '@api/messages/generic';
import { useAuthStore } from '../../store/authStore';

const MODEL_NAME = '/thread';

// Hook for a patient to create a thread
export function usePatientCreateThread() {
    return useMutation({
        mutationFn: async (payload) => {
            try {
                const result = await postRequest(`${MODEL_NAME}/patient/create`, payload);
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

// Hook for a provider to create a thread
export function useProviderCreateThread() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload) => {
            try {
                const result = await postRequest(`${MODEL_NAME}/provider/create`, payload);
                if (result.status === HttpStatusCode.Ok) {
                    return result.data.data;
                } else {
                    throw new Error(ErrorMessages.generalMessage);
                }
            } catch (err) {
                return throwServerError(err);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['providerThreads'] });
            queryClient.invalidateQueries({ queryKey: ['providerMessageUnreadCount'] });
        },
    });
}

// Hook for a patient to get their threads
export function usePatientGetThreads() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    return useQuery({
        queryKey: ['patientThreads'],
        queryFn: async () => {
            try {
                const result = await getRequest(`${MODEL_NAME}/patient/list`);
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

// Hook for a provider to get their threads
export function useProviderGetThreads() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const isProvider = useAuthStore((state) => state.user?.role?.toLowerCase() === 'provider');

    return useQuery({
        queryKey: ['providerThreads'],
        queryFn: async () => {
            try {
                const result = await getRequest(`${MODEL_NAME}/provider/list`, { limit: 50 });
                if (result.status === HttpStatusCode.Ok) {
                    return result.data.data;
                } else {
                    throw new Error(ErrorMessages.generalMessage);
                }
            } catch (err) {
                return throwServerError(err);
            }
        },
        enabled: isAuthenticated && isProvider,
        staleTime: 0,
        refetchOnMount: 'always',
    });
}

// Hook to send a reply in a thread
export function useSendThreadReply() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (body) => {
            try {
                const result = await postRequest(`${MODEL_NAME}/reply`, body);
                if (result.status === HttpStatusCode.Ok) {
                    return result.data.data;
                } else {
                    throw new Error(ErrorMessages.generalMessage);
                }
            } catch (err) {
                return throwServerError(err);
            }
        },
        onSuccess: (_data, variables) => {
            const threadId = variables?.thread;
            if (threadId) {
                queryClient.invalidateQueries({ queryKey: ['threadMessages', threadId] });
            }
            queryClient.invalidateQueries({ queryKey: ['providerThreads'] });
            queryClient.invalidateQueries({ queryKey: ['patientThreads'] });
            queryClient.invalidateQueries({ queryKey: ['providerMessageUnreadCount'] });
            queryClient.invalidateQueries({ queryKey: ['patientMessageUnreadCount'] });
        },
    });
}

export function useMarkThreadAsRead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (threadId) => {
            try {
                const result = await postRequest(`${MODEL_NAME}/mark-read`, { threadId });
                if (result.status === HttpStatusCode.Ok) {
                    return result.data.data;
                }
                throw new Error(ErrorMessages.generalMessage);
            } catch (err) {
                return throwServerError(err);
            }
        },
        onSuccess: (_data, threadId) => {
            if (threadId) {
                queryClient.invalidateQueries({ queryKey: ['threadMessages', threadId] });
            }
            queryClient.invalidateQueries({ queryKey: ['providerThreads'] });
            queryClient.invalidateQueries({ queryKey: ['patientThreads'] });
            queryClient.invalidateQueries({ queryKey: ['providerMessageUnreadCount'] });
            queryClient.invalidateQueries({ queryKey: ['patientMessageUnreadCount'] });
        },
    });
}

export function useGetProviderMessageUnreadCount() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const isProvider = useAuthStore((state) => state.user?.role?.toLowerCase() === 'provider');

    return useQuery({
        queryKey: ['providerMessageUnreadCount'],
        queryFn: async () => {
            const result = await getRequest(`${MODEL_NAME}/provider/unread-count`);
            if (result.status === HttpStatusCode.Ok) {
                return result.data?.data?.unreadCount ?? result.data?.unreadCount ?? 0;
            }
            throw new Error(ErrorMessages.generalMessage);
        },
        enabled: isAuthenticated && isProvider,
        staleTime: 0,
        refetchOnMount: 'always',
    });
}

export function useGetThreadMessages(threadId) {
    return useQuery({
        queryKey: ['threadMessages', threadId],
        enabled: Boolean(threadId),
        staleTime: 0,
        refetchOnMount: 'always',
        queryFn: async () => {
            try {
                const result = await getRequest(`${MODEL_NAME}/messages/${threadId}`);
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
