import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HttpStatusCode } from 'axios';
import { getRequest, postRequest, putRequest, deleteRequest } from '@api';
import { throwServerError } from '@api/messages/error';
import { ErrorMessages } from '@api/messages/generic';
import { useAuthStore } from '../../store/authStore';

const MODEL_NAME = '/discount';

// Hook to create a discount
export function useCreateDiscount() {
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

// Hook for admin to create a discount
export function useAdminCreateDiscount() {
    return useMutation({
        mutationFn: async (payload) => {
            try {
                const result = await postRequest(`${MODEL_NAME}/admin/create`, payload);
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

// Hook to update a discount
export function useUpdateDiscount() {
    return useMutation({
        mutationFn: async (payload) => {
            try {
                const result = await putRequest(`${MODEL_NAME}/update`, payload);
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

// Hook for admin to update a discount
export function useAdminUpdateDiscount() {
    return useMutation({
        mutationFn: async (payload) => {
            try {
                const result = await putRequest(`${MODEL_NAME}/admin/update`, payload);
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

// Hook to delete a discount
export function useDeleteDiscount() {
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

// Hook to list all discounts
export function useListDiscounts() {
    return useQuery({
        queryKey: ['discounts'],
        queryFn: async () => {
            try {
                const result = await getRequest(`${MODEL_NAME}/list`);
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

// Hook for admin to list all discounts
export function useAdminListDiscounts() {
    const user = useAuthStore((state) => state.user);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const isAdmin = user?.role?.toLowerCase() === 'admin';

    return useQuery({
        queryKey: ['adminDiscounts'],
        queryFn: async () => {
            try {
                const result = await getRequest(`${MODEL_NAME}/admin/list`);
                if (result.status === HttpStatusCode.Ok) {
                    return result.data.data;
                } else {
                    throw new Error(ErrorMessages.generalMessage);
                }
            } catch (err) {
                return throwServerError(err);
            }
        },
        enabled: isAuthenticated && isAdmin,
    });
}

// Hook to update discount status
export function useUpdateStatus() {
    return useMutation({
        mutationFn: async (payload) => {
            try {
                const result = await putRequest(`${MODEL_NAME}/update/status`, payload);
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

// Hook to get pending status of discounts
export function useGetPendingStatus() {
    return useQuery({
        queryKey: ['pendingStatus'],
        queryFn: async () => {
            try {
                const result = await getRequest(`${MODEL_NAME}/pending/status`);
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

// Hook to apply a discount code
export function useApplyDiscountCode() {
    return useMutation({
        mutationFn: async (payload) => {
            try {
                const result = await postRequest(`${MODEL_NAME}/apply`, payload);
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

// Hook to get discount history
export function useGetDiscountHistory() {
    return useQuery({
        queryKey: ['discountHistory'],
        queryFn: async (discount) => {
            try {
                const result = await getRequest(`${MODEL_NAME}/history/${discount}`);
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

export function useGetPendingDiscountInvitations() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const user = useAuthStore((state) => state.user);

    return useQuery({
        queryKey: ['pendingDiscountInvitations'],
        queryFn: async () => {
            try {
                const result = await getRequest(`${MODEL_NAME}/invitations/pending`);
                if (result.status === HttpStatusCode.Ok) {
                    return result.data.data;
                }
                throw new Error(ErrorMessages.generalMessage);
            } catch (err) {
                return throwServerError(err);
            }
        },
        enabled: isAuthenticated && user?.role?.toLowerCase() === 'provider',
    });
}

export function useRespondToDiscountInvitation() {
    const queryClient = useQueryClient();
    const user = useAuthStore((state) => state.user);

    return useMutation({
        mutationFn: async ({ discountId, status }) => {
            try {
                const providerId = user?._id || user?.id;
                const result = await putRequest(`${MODEL_NAME}/respond/${discountId}/${providerId}`, { status });
                if (result.status === HttpStatusCode.Ok) {
                    return result.data.data;
                }
                throw new Error(ErrorMessages.generalMessage);
            } catch (err) {
                return throwServerError(err);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pendingDiscountInvitations'] });
            queryClient.invalidateQueries({ queryKey: ['discounts'] });
        },
    });
}
