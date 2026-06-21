import { useQuery, useMutation } from '@tanstack/react-query';
import { HttpStatusCode } from 'axios';
import { getRequest, postRequest, putRequest, deleteRequest } from '@api';
import { throwServerError } from '@api/messages/error';
import { ErrorMessages } from '@api/messages/generic';

const MODEL_NAME = '/providerService';

// Hook to create a provider service
export function useCreateService() {
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

// Hook to list all services with query parameters
export function useListServices(query) {
    return useQuery({
        queryKey: ['listServices', query],
        queryFn: async () => {
            try {
                const result = await getRequest(`${MODEL_NAME}/list`, query);
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

// Hook to update a provider service
export function useUpdateService() {
    return useMutation({
        mutationFn: async (payload) => {
            try {
                const result = await putRequest(`${MODEL_NAME}`, payload);
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

// Hook to delete a provider service
export function useDeleteService() {
    return useMutation({
        mutationFn: async (id) => {
            try {
                const result = await deleteRequest(`${MODEL_NAME}/delete/${id}`);
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

// Hook to get services by provider ID
export function useGetServicesByProvider(id) {
    return useQuery({
        queryKey: ['servicesByProvider', id],
        queryFn: async () => {
            try {
                const result = await getRequest(`${MODEL_NAME}/by/provider/${id}`);
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
