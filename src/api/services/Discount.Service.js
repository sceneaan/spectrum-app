import { useQuery, useMutation } from '@tanstack/react-query';
import { HttpStatusCode } from 'axios';
import { getRequest, postRequest, putRequest, deleteRequest } from '@api';
import { throwServerError } from '@api/messages/error';
import { ErrorMessages } from '@api/messages/generic';

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
