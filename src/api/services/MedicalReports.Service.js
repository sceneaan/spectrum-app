import { useQuery, useMutation } from '@tanstack/react-query';
import { HttpStatusCode } from 'axios';
import { getRequest, postRequest, putRequest } from '@api';
import { throwServerError } from '@api/messages/error';
import { ErrorMessages } from '@api/messages/generic';
import { useAuthStore } from '../../store/authStore';

const MODEL_NAME = '/medical/reports';

// Hook to get my providers
export function useGetMyProviders() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
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
        enabled: isAuthenticated,
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
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
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
        enabled: isAuthenticated,
    });
}

// Hook to get patient medical reports with pagination
export function useGetPatientMedicalReportsPaginated(queryParams = {}) {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
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
        staleTime: 30000,
        cacheTime: 300000,
        keepPreviousData: true,
        refetchOnWindowFocus: false,
        retry: 2,
        enabled: isAuthenticated,
    });
}

async function fetchProviderReportById(reportId) {
    let page = 1;
    const limit = 50;
    const maxPages = 20;

    while (page <= maxPages) {
        const result = await getRequest(`${MODEL_NAME}/provider/reports`, { page, limit });
        if (result.status !== HttpStatusCode.Ok) {
            throw new Error(ErrorMessages.generalMessage);
        }
        const data = result.data.data;
        const docs = data?.docs || [];
        const found = docs.find((item) => String(item._id || item.id) === String(reportId));
        if (found) return found;
        if (!data?.hasNextPage && page >= (data?.totalPages || 1)) break;
        page += 1;
    }
    return null;
}

export function useGetProviderReportById(reportId, initialReport) {
    const user = useAuthStore((state) => state.user);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const isProvider = user?.role?.toLowerCase() === 'provider';
    const hasInitial = initialReport
        && String(initialReport._id || initialReport.id) === String(reportId);

    return useQuery({
        queryKey: ['providerReport', reportId],
        queryFn: async () => {
            if (hasInitial) return initialReport;
            return fetchProviderReportById(reportId);
        },
        enabled: isAuthenticated && isProvider && Boolean(reportId),
        initialData: hasInitial ? initialReport : undefined,
    });
}

// Hook to get provider reports with query params
export function useGetProviderReports(query = { page: 1, limit: 20 }) {
    const user = useAuthStore((state) => state.user);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const isProvider = user?.role?.toLowerCase() === 'provider';

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
        enabled: isAuthenticated && isProvider,
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
