import { useQuery, useMutation } from '@tanstack/react-query';
import { HttpStatusCode } from 'axios';
import { getRequest, postRequest, putRequest } from '@api';
import { throwServerError } from '@api/messages/error';
import { ErrorMessages } from '@api/messages/generic';

const MODEL_NAME = '/medical/reports';

// Hook to get my providers
export function useGetMyProviders() {
    return useQuery({
        queryKey: ['myProviders'],
        queryFn: async () => {
            try {
                const result = await getRequest(`${MODEL_NAME}/my/providers`);
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

// Hook to create medical reports
export function useCreateMedicalReports() {
    return useMutation({
        mutationFn: async (body) => {
            try {
                const result = await postRequest(`${MODEL_NAME}/create`, body);
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

// Hook to get patient medical reports
export function useGetPatientMedicalReports() {
    return useQuery({
        queryKey: ['patientMedicalReports'],
        queryFn: async () => {
            try {
                const result = await getRequest(`${MODEL_NAME}/patient/reports`);
                if (result.status === HttpStatusCode.Ok) {
                    const data = result.data.data;
                    return {
                        reports: data.docs || [],
                        pagination: {
                            currentPage: data.page || 1,
                            totalPages: data.totalPages || 0,
                            totalItems: data.totalDocs || 0,
                            hasNextPage: data.hasNextPage || false,
                            hasPreviousPage: data.hasPrevPage || false,
                            limit: data.limit || 10,
                            nextPage: data.nextPage,
                            prevPage: data.prevPage,
                        },
                    };
                } else {
                    throw new Error(ErrorMessages.generalMessage);
                }
            } catch (err) {
                return throwServerError(err);
            }
        },
    });
}

// Hook to get patient medical reports with pagination
export function useGetPatientMedicalReportsPaginated(queryParams = {}) {
    return useQuery({
        queryKey: ['patientMedicalReportsPaginated', queryParams],
        queryFn: async () => {
            try {
                // Filter out undefined values
                const cleanParams = Object.entries(queryParams).reduce((acc, [key, value]) => {
                    if (value !== undefined && value !== null && value !== '') {
                        acc[key] = value;
                    }
                    return acc;
                }, {});

                const result = await getRequest(`${MODEL_NAME}/patient/reports`, cleanParams);

                if (result.status === HttpStatusCode.Ok) {
                    const data = result.data.data;
                    return {
                        reports: data.docs || [],
                        pagination: {
                            currentPage: data.page || 1,
                            totalPages: data.totalPages || 1,
                            totalItems: data.totalDocs || 0,
                            hasNextPage: data.hasNextPage || false,
                            hasPreviousPage: data.hasPrevPage || false,
                            limit: data.limit || 10,
                            nextPage: data.nextPage,
                            prevPage: data.prevPage,
                        },
                    };
                } else {
                    throw new Error(ErrorMessages.generalMessage);
                }
            } catch (err) {
                return throwServerError(err);
            }
        },
        // Enhanced query options to prevent excessive refetching
        staleTime: 30000, // 30 seconds
        cacheTime: 300000, // 5 minutes
        keepPreviousData: true,
        refetchOnWindowFocus: false,
        retry: 2,
    });
}

// Hook to get provider reports with query params
export function useGetProviderReports(query) {
    return useQuery({
        queryKey: ['providerReports', query],
        queryFn: async () => {
            try {
                const result = await getRequest(`${MODEL_NAME}/provider/reports`, query);
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

// Hook to update a report
export function useUpdateReport() {
    return useMutation({
        mutationFn: async (body) => {
            try {
                const result = await putRequest(`${MODEL_NAME}/update`, body);
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
