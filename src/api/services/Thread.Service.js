import { useQuery, useMutation } from '@tanstack/react-query';
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
    return useQuery({
        queryKey: ['providerThreads'],
        queryFn: async () => {
            try {
                const result = await getRequest(`${MODEL_NAME}/provider/list`);
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

// Hook to send a reply in a thread
export function useSendThreadReply() {
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
    });
}

export function useGetThreadMessages(threadId) {
    return useQuery({
        queryKey: ['threadMessages',threadId],
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
