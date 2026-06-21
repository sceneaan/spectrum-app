import { useQuery } from '@tanstack/react-query';
import { HttpStatusCode } from 'axios';
import { getRequest } from '@api';
import { throwServerError } from '@api/messages/error';
import { ErrorMessages } from '@api/messages/generic';

const MODEL_NAME = '/public';

// Hook to get categories with query parameters
export function useGetAllCategories(query) {
  return useQuery({
    queryKey: ['categories', query],
    queryFn: async () => {
      try {
        const result = await getRequest(`${MODEL_NAME}/categories`, query);
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

// Hook to get services by category
export function useGetServicesByCategory(query) {
  return useQuery({
    queryKey: ['servicesByCategory', query],
    queryFn: async () => {
      try {
        const result = await getRequest(`${MODEL_NAME}/services`, query);
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

// Hook to get all categories
export function useGetCategoriesAll() {
    return useQuery({
        queryKey: ['categoriesAll'],
        queryFn: async () => {
            try {
                const result = await getRequest(`${MODEL_NAME}/categories/all`);
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

// Hook to get services by category ID with query parameters
export function useGetServicesByCategoryId(query) {
    return useQuery(['servicesByCategory', query], {
        queryFn: async () => {
            try {
                const result = await getRequest(`${MODEL_NAME}/category/services`, query);
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

// Hook to get all services with query parameters
export function useGetAllServices(query) {
    return useQuery({
        queryKey: ['allServices', query],
        queryFn: async () => {
            try {
                const result = await getRequest(`${MODEL_NAME}/services`, query);
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

// Hook to get all specialties with query parameters
export function useGetAllSpecialties(query) {
    return useQuery({
        queryKey: ['allSpecialties', query],
        queryFn: async () => {
            try {
                const result = await getRequest(`${MODEL_NAME}/specialties`, query);
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

// Hook to get all specialties with query parameters
export async function GetPolicy(query) {
    try {
        const result = await getRequest(`${MODEL_NAME}/policy`, query);

        if (result.status === HttpStatusCode.Ok) { return result.data.data; }
        else { throw new Error(ErrorMessages.generalMessage); }
    } catch (err) {
        return throwServerError(err);
    }
}

// Hook to get all promotions
export function useGetAllPromotions() {
    return useQuery({
        queryKey: ['promotions'],
        queryFn: async () => {
            try {
                console.log('Fetching promotions from /promotions/all');
                const result = await getRequest('/promotions/all');
                console.log('Promotions API Response:', result);
                console.log('Promotions Status:', result?.status);
                console.log('Promotions Full Data:', result?.data);
                console.log('Promotions Nested Data:', result?.data?.data);

                if (result?.status === HttpStatusCode.Ok) {
                    const promotions = result.data.data;
                    console.log('Returning promotions:', promotions);
                    return promotions;
                } else {
                    console.log('Promotions API returned non-OK status:', result?.status);
                    throw new Error(ErrorMessages.generalMessage);
                }
            } catch (err) {
                console.error('Error fetching promotions - Full Error:', err);
                console.error('Error message:', err?.message);
                console.error('Error response:', err?.response);
                throw err;
            }
        },
        retry: false,
        refetchOnWindowFocus: false,
    });
}
