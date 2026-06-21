import { useQuery } from '@tanstack/react-query';
import { HttpStatusCode } from 'axios';
import { getRequest } from '@api';
import { throwServerError } from '@api/messages/error';
import { ErrorMessages } from '@api/messages/generic';

// Hook to get search filter options (issues, approaches, ageGroups, languages, etc.)
export function useGetSearchFilters() {
    return useQuery({
        queryKey: ['searchFilters'],
        queryFn: async () => {
            try {
                const result = await getRequest('/public/search-filters');
                if (result.status === HttpStatusCode.Ok) {
                    return result.data.data;
                } else {
                    throw new Error(ErrorMessages.generalMessage);
                }
            } catch (err) {
                return throwServerError(err);
            }
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

// Hook to search providers with advanced filters + pagination
export function useSearchProviders(filters, options) {
    // Build query params, serializing arrays as repeated keys (issues=x&issues=y)
    const buildParams = (filtersObj) => {
        const params = new URLSearchParams();
        if (!filtersObj) return params.toString();

        Object.entries(filtersObj).forEach(([key, value]) => {
            if (value === null || value === undefined || value === '') return;
            if (Array.isArray(value)) {
                value.forEach(v => {
                    if (v !== null && v !== undefined && v !== '') {
                        params.append(key, v);
                    }
                });
            } else {
                params.append(key, value);
            }
        });
        return params.toString();
    };

    const queryString = buildParams(filters);

    return useQuery({
        queryKey: ['searchProviders', filters],
        queryFn: async () => {
            try {
                const url = queryString
                    ? `/availability/providers/search?${queryString}`
                    : '/availability/providers/search';
                const result = await getRequest(url);
                if (result.status === HttpStatusCode.Ok) {
                    return result.data.data;
                } else {
                    throw new Error(ErrorMessages.generalMessage);
                }
            } catch (err) {
                return throwServerError(err);
            }
        },
        placeholderData: (previousData) => previousData,
        ...options,
    });
}

// Hook to get full therapist profile by provider ID
export function useGetTherapistProfile(providerId, serviceId) {
    const query = serviceId ? { serviceId } : {};

    return useQuery({
        queryKey: ['therapistProfile', providerId, serviceId],
        queryFn: async () => {
            try {
                const result = await getRequest(`/provider-profile/${providerId}`, query);
                if (result.status === HttpStatusCode.Ok) {
                    return result.data.data;
                } else {
                    throw new Error(ErrorMessages.generalMessage);
                }
            } catch (err) {
                return throwServerError(err);
            }
        },
        enabled: !!providerId,
        staleTime: 0, // Always refetch — slot counts change throughout the day
    });
}
