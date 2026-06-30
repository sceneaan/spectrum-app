import { useMutation, useQuery } from '@tanstack/react-query';
import { HttpStatusCode } from 'axios';
import { getRequest, postRequest } from '@api';
import { ErrorMessages } from '@api/messages/generic';
import { throwServerError } from '@api/messages/error';
import { useAuthStore } from '../../store/authStore';

const MODEL_NAME = '/refill';

export const useCreateRefillRequestFromPatient = () => {
    return useMutation({
        mutationFn: async (payload) => {
            try {
                const result = await postRequest(`${MODEL_NAME}/patient/request-refill`, payload);

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
};

export const useProcessRefillRequest = () => {
    return useMutation({
        mutationFn: async ({ id, payload }) => {
            try {
                const result = await postRequest(`${MODEL_NAME}/provider/process-refill/${id}`, payload);

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
};

export const usePatientToProviderRequests = () => {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const isProvider = useAuthStore((state) => state.user?.role?.toLowerCase() === 'provider');

    return useQuery({
        queryKey: ['patientRefillRequests'],
        queryFn: async () => {
            try {
                const result = await getRequest(`${MODEL_NAME}/provider/patient-requests`);

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
    });
};

export const usePendingMedications = () => {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    return useQuery({
        queryKey: ['pendingMedications'],
        queryFn: async () => {
            try {
                const result = await getRequest(`${MODEL_NAME}/patient/pending-medications`);

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
};

// Additional utility functions for direct API calls (if needed)
export const RefillRequestService = {
    createFromPatient: async (payload) => {
        try {
            const result = await postRequest(`${MODEL_NAME}/patient/request-refill`, payload);
            return result.data;
        } catch (error) {
            throw error;
        }
    },

    processRequest: async (id, payload) => {
        try {
            const result = await postRequest(`${MODEL_NAME}/provider/process-refill/${id}`, payload);
            return result.data;
        } catch (error) {
            throw error;
        }
    },

    getPatientRequests: async () => {
        try {
            const result = await getRequest(`${MODEL_NAME}/provider/patient-requests`);
            return result.data;
        } catch (error) {
            throw error;
        }
    },
};
