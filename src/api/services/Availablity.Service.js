import { useQuery, useMutation } from '@tanstack/react-query';
import { HttpStatusCode } from 'axios';
import { getRequest, postRequest } from '@api';
import { throwServerError } from '@api/messages/error';
import { ErrorMessages } from '@api/messages/generic';

const MODEL_NAME = '/availability';

// Hook to create availability
export function useCreateAvailability() {
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

// Hook to get slots by ID with query params
export function useGetSlots(id, query, options) {
    return useQuery({
        queryKey: ['slots', id, query],
        queryFn: async () => {
            try {
                const result = await getRequest(`${MODEL_NAME}/getSlots/${id}`, query);
                if (result.status === HttpStatusCode.Ok) {
                    return result.data.data;
                } else {
                    throw new Error(ErrorMessages.generalMessage);
                }
            } catch (err) {
                return throwServerError(err);
            }
        },
        ...options,
    });
}

export function useGetProvidersAvailability(query) {
    return useQuery({
        queryKey: ['providersAvailability', query],
        queryFn: async () => {
            try {
                const result = await getRequest(`${MODEL_NAME}/app/available-providers`, query);

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

// Hook to get availability by provider ID
export function useGetAvailabilityByProviderId(id) {
    return useQuery({
        queryKey: ['availabilityByProvider', id],
        queryFn: async () => {
            try {
                const result = await getRequest(`${MODEL_NAME}/${id}`);
                if (result.status === HttpStatusCode.Ok) {
                    return result.data.data;
                } else {
                    throw new Error(ErrorMessages.generalMessage);
                }
            } catch (err) {
                return throwServerError(err);
            }
        },
        enabled: !!id, // Ensures the query only runs if an ID is provided
    });
}

export function useGetDoctorSlots(providerId, query) {
    return useQuery({
        queryKey: ['doctorSlots'],
        queryFn: async () => {
            try {
                const result = await getRequest(`${MODEL_NAME}/app/slots/${providerId}`, query);
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

// Hook to get available providers with filters (version 2)
export function useGetAvailableProviders2(query) {
    // Add default date range if not provided
    const queryWithDefaults = {
        ...query,
        startDate: query?.startDate || new Date().toISOString(),
        endDate: query?.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        currentTime: new Date().toISOString(),
    };

    return useQuery({
        queryKey: ['availableProviders', query],
        queryFn: async () => {
            try {
                const result = await getRequest(`${MODEL_NAME}/providers2`, queryWithDefaults);
                if (result.status === HttpStatusCode.Ok) {
                    const providers = result.data.data?.providers || [];
                    return providers;
                } else {
                    throw new Error(ErrorMessages.generalMessage);
                }
            } catch (err) {
                console.error('Error fetching available providers:', err);
                throw err;
            }
        },
        enabled: !!(query?.category && query?.service && query?.type), // Only run when required fields are present
    });
}
