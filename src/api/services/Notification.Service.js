import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HttpStatusCode } from 'axios';
import { getRequest, postRequest, putRequest, deleteRequest } from '@api';
import { throwServerError } from '@api/messages/error';
import { ErrorMessages } from '@api/messages/generic';

const MODEL_NAME = '/notification';

// Hook to get notifications with pagination and filters
export function useGetNotifications(queryParams = {}) {
  const defaultParams = {
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    ...queryParams,
  };

  const defaultResponse = {
    docs: [],
    totalDocs: 0,
    limit: defaultParams.limit,
    page: defaultParams.page,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  };

  return useQuery({
    queryKey: ['notifications', defaultParams],
    queryFn: async () => {
      try {
        console.log('🔔 [NotificationService] Fetching notifications with params:', defaultParams);
        const result = await getRequest(`${MODEL_NAME}/list`, defaultParams);
        console.log('🔔 [NotificationService] API Response status:', result.status);
        console.log('🔔 [NotificationService] API Response data:', JSON.stringify(result.data, null, 2));

        if (result.status === HttpStatusCode.Ok) {
          // Handle nested data structure: result.data.data
          const data = result.data?.data || result.data || {};
          console.log('🔔 [NotificationService] Parsed data:', JSON.stringify(data, null, 2));

          const response = {
            docs: Array.isArray(data.docs) ? data.docs : [],
            totalDocs: typeof data.totalDocs === 'number' ? data.totalDocs : 0,
            limit: typeof data.limit === 'number' ? data.limit : defaultParams.limit,
            page: typeof data.page === 'number' ? data.page : defaultParams.page,
            totalPages: typeof data.totalPages === 'number' ? data.totalPages : 0,
            hasNextPage: typeof data.hasNextPage === 'boolean' ? data.hasNextPage : false,
            hasPrevPage: typeof data.hasPrevPage === 'boolean' ? data.hasPrevPage : false,
          };

          console.log('🔔 [NotificationService] Final response:', response);
          return response;
        } else {
          console.log('🔔 [NotificationService] Non-OK status, returning default');
          return defaultResponse;
        }
      } catch (err) {
        // Return a default value instead of throwing
        console.error('🔔 [NotificationService] Error fetching notifications:', err.message);
        console.error('🔔 [NotificationService] Error response:', err.response?.data);
        return defaultResponse;
      }
    },
    keepPreviousData: true, // Keep previous data while fetching new data
    retry: 3, // Retry failed requests up to 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    staleTime: 30000, // Consider data stale after 30 seconds
    // Use placeholderData instead of initialData so React Query still fetches
    placeholderData: defaultResponse,
  });
}

// Test function to verify API connectivity
export async function testNotificationAPI() {
  try {
    // Test basic connectivity
    const result = await getRequest(`${MODEL_NAME}/unread-count`);

    // Extract the actual data from nested structure
    const unreadCount = result.data?.data?.unreadCount || result.data?.unreadCount;

    return {
      success: true,
      data: result,
      unreadCount: unreadCount,
      dataStructure: {
        hasNestedData: !!result.data?.data,
        directAccess: !!result.data?.unreadCount,
        nestedAccess: !!result.data?.data?.unreadCount,
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Hook to get unread count
export function useGetUnreadCount() {
  return useQuery({
    queryKey: ['unreadCount'],
    queryFn: async () => {
      try {
        const result = await getRequest(`${MODEL_NAME}/unread-count`);
        // Check if result exists and has expected structure
        if (!result) {
          return 0;
        }

        if (result.status === HttpStatusCode.Ok) {
          // Handle nested data structure: result.data.data.unreadCount
          const count = result.data?.data?.unreadCount || result.data?.unreadCount;

          if (typeof count === 'number' && count >= 0) {
            return count;
          } else {
            return 0;
          }
        } else {
          return 0;
        }
      } catch (err) {
        // Return a default value instead of throwing
        return 0; // Default to 0 unread notifications
      }
    },
    // refetchInterval: 30000, // Refetch every 30 seconds
    // retry: 3, // Retry failed requests up to 3 times
    // retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
}

// Hook to get notification statistics
export function useGetNotificationStats() {
  return useQuery({
    queryKey: ['notificationStats'],
    queryFn: async () => {
      try {
        const result = await getRequest(`${MODEL_NAME}/stats`);
        if (result.status === HttpStatusCode.Ok) {
          // Handle nested data structure: result.data.data
          const stats = result.data?.data || result.data || {};
          return {
            total: typeof stats.total === 'number' ? stats.total : 0,
            unread: typeof stats.unread === 'number' ? stats.unread : 0,
            today: typeof stats.today === 'number' ? stats.today : 0,
            byType: stats.byType || {},
          };
        } else {
          return {
            total: 0,
            unread: 0,
            today: 0,
            byType: {},
          };
        }
      } catch (err) {
        // Return a default value instead of throwing
        return {
          total: 0,
          unread: 0,
          today: 0,
          byType: {},
        };
      }
    },
    retry: 2, // Retry failed requests up to 2 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    staleTime: 300000, // Consider data stale after 5 minutes
    // Ensure we always have a valid initial value
    initialData: {
      total: 0,
      unread: 0,
      today: 0,
      byType: {},
    },
    // Prevent undefined values
    placeholderData: {
      total: 0,
      unread: 0,
      today: 0,
      byType: {},
    },
  });
}

// Hook to mark notifications as read
export function useMarkNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationIds) => {
      try {
        const result = await putRequest(`${MODEL_NAME}/mark-read`, {
          notificationIds,
        });
        if (result.status === HttpStatusCode.Ok) {
          return result.data;
        } else {
          throw new Error(ErrorMessages.generalMessage);
        }
      } catch (err) {
        // Improved error handling to prevent [object Object] errors
        console.error('Mark notifications as read error:', err);

        // If it's already an Error object, throw it directly
        if (err instanceof Error) {
          throw err;
        }

        // If it's a response error with data, extract the message
        if (err.response?.data) {
          const errorMessage = err.response.data.message || err.response.data.error || ErrorMessages.generalMessage;
          throw new Error(errorMessage);
        }

        // If it's a network error or other type, create a proper error message
        if (err.message) {
          throw new Error(err.message);
        }

        // Fallback to generic error message
        throw new Error(ErrorMessages.generalMessage);
      }
    },
    onSuccess: () => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries(['unreadCount']);
      queryClient.invalidateQueries(['notificationStats']);
    },
    onError: (error) => {
      // Log the error for debugging
      console.error('Mark notifications as read mutation error:', error);
    },
  });
}

// Hook to mark all notifications as read
export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      try {
        const result = await putRequest(`${MODEL_NAME}/mark-all-read`);
        if (result.status === HttpStatusCode.Ok) {
          return result.data;
        } else {
          throw new Error(ErrorMessages.generalMessage);
        }
      } catch (err) {
        // Improved error handling to prevent [object Object] errors
        console.error('Mark all notifications as read error:', err);

        // If it's already an Error object, throw it directly
        if (err instanceof Error) {
          throw err;
        }

        // If it's a response error with data, extract the message
        if (err.response?.data) {
          const errorMessage = err.response.data.message || err.response.data.error || ErrorMessages.generalMessage;
          throw new Error(errorMessage);
        }

        // If it's a network error or other type, create a proper error message
        if (err.message) {
          throw new Error(err.message);
        }

        // Fallback to generic error message
        throw new Error(ErrorMessages.generalMessage);
      }
    },
    onSuccess: () => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries(['unreadCount']);
      queryClient.invalidateQueries(['notificationStats']);
    },
    onError: (error) => {
      // Log the error for debugging
      console.error('Mark all notifications as read mutation error:', error);
    },
  });
}

// Hook to delete a single notification
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId) => {
      try {
        const result = await deleteRequest(`${MODEL_NAME}/${notificationId}`);
        if (result.status === HttpStatusCode.Ok) {
          return result.data;
        } else {
          throw new Error(ErrorMessages.generalMessage);
        }
      } catch (err) {
        // Improved error handling to prevent [object Object] errors
        console.error('Delete single notification error:', err);

        // If it's already an Error object, throw it directly
        if (err instanceof Error) {
          throw err;
        }

        // If it's a response error with data, extract the message
        if (err.response?.data) {
          const errorMessage = err.response.data.message || err.response.data.error || ErrorMessages.generalMessage;
          throw new Error(errorMessage);
        }

        // If it's a network error or other type, create a proper error message
        if (err.message) {
          throw new Error(err.message);
        }

        // Fallback to generic error message
        throw new Error(ErrorMessages.generalMessage);
      }
    },
    onSuccess: () => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries(['unreadCount']);
      queryClient.invalidateQueries(['notificationStats']);
    },
    onError: (error) => {
      // Log the error for debugging
      console.error('Delete single notification mutation error:', error);
    },
  });
}

// Hook to delete multiple notifications
export function useDeleteMultipleNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationIds) => {
      try {
        const result = await deleteRequest(`${MODEL_NAME}/delete-multiple`, {
          notificationIds,
        });
        if (result.status === HttpStatusCode.Ok) {
          return result.data;
        } else {
          throw new Error(ErrorMessages.generalMessage);
        }
      } catch (err) {
        // Improved error handling to prevent [object Object] errors
        console.error('Delete multiple notifications error:', err);

        // If it's already an Error object, throw it directly
        if (err instanceof Error) {
          throw err;
        }

        // If it's a response error with data, extract the message
        if (err.response?.data) {
          const errorMessage = err.response.data.message || err.response.data.error || ErrorMessages.generalMessage;
          throw new Error(errorMessage);
        }

        // If it's a network error or other type, create a proper error message
        if (err.message) {
          throw new Error(err.message);
        }

        // Fallback to generic error message
        throw new Error(ErrorMessages.generalMessage);
      }
    },
    onSuccess: () => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries(['unreadCount']);
      queryClient.invalidateQueries(['notificationStats']);
    },
    onError: (error) => {
      // Log the error for debugging
      console.error('Delete multiple notifications mutation error:', error);
    },
  });
}

// Hook to delete all notifications
export function useDeleteAllNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options = {}) => {
      try {
        const result = await deleteRequest(`${MODEL_NAME}/delete-all`, options);
        if (result.status === HttpStatusCode.Ok) {
          return result.data;
        } else {
          throw new Error(ErrorMessages.generalMessage);
        }
      } catch (err) {
        // Improved error handling to prevent [object Object] errors
        console.error('Delete all notifications error:', err);

        // If it's already an Error object, throw it directly
        if (err instanceof Error) {
          throw err;
        }

        // If it's a response error with data, extract the message
        if (err.response?.data) {
          const errorMessage = err.response.data.message || err.response.data.error || ErrorMessages.generalMessage;
          throw new Error(errorMessage);
        }

        // If it's a network error or other type, create a proper error message
        if (err.message) {
          throw new Error(err.message);
        }

        // Fallback to generic error message
        throw new Error(ErrorMessages.generalMessage);
      }
    },
    onSuccess: () => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries(['unreadCount']);
      queryClient.invalidateQueries(['notificationStats']);
    },
    onError: (error) => {
      // Log the error for debugging
      console.error('Delete all notifications mutation error:', error);
    },
  });
}

// Admin hooks

// Hook to get all notifications (admin)
export function useAdminGetAllNotifications(queryParams = {}) {
  const defaultParams = {
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    ...queryParams,
  };

  const defaultResponse = {
    docs: [],
    totalDocs: 0,
    limit: defaultParams.limit,
    page: defaultParams.page,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  };

  return useQuery({
    queryKey: ['adminNotifications', defaultParams],
    queryFn: async () => {
      try {
        const result = await getRequest(`${MODEL_NAME}/admin/list`, defaultParams);
        if (result.status === HttpStatusCode.Ok) {
          // Handle nested data structure: result.data.data
          const data = result.data?.data || result.data || {};
          return {
            docs: Array.isArray(data.docs) ? data.docs : [],
            totalDocs: typeof data.totalDocs === 'number' ? data.totalDocs : 0,
            limit: typeof data.limit === 'number' ? data.limit : defaultParams.limit,
            page: typeof data.page === 'number' ? data.page : defaultParams.page,
            totalPages: typeof data.totalPages === 'number' ? data.totalPages : 0,
            hasNextPage: typeof data.hasNextPage === 'boolean' ? data.hasNextPage : false,
            hasPrevPage: typeof data.hasPrevPage === 'boolean' ? data.hasPrevPage : false,
          };
        } else {
          return defaultResponse;
        }
      } catch (err) {
        // Return a default value instead of throwing
        return defaultResponse;
      }
    },
    keepPreviousData: true,
    retry: 2, // Retry failed requests up to 2 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    staleTime: 300000, // Consider data stale after 5 minutes
    // Ensure we always have a valid initial value
    initialData: defaultResponse,
    // Prevent undefined values
    placeholderData: defaultResponse,
  });
}

// Hook to send notifications (admin)
export function useAdminSendNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      try {
        const result = await postRequest(`${MODEL_NAME}/admin/send`, payload);
        if (result.status === HttpStatusCode.Ok) {
          return result.data;
        } else {
          throw new Error(ErrorMessages.generalMessage);
        }
      } catch (err) {
        return throwServerError(err);
      }
    },
    onSuccess: () => {
      // Invalidate admin notifications query
      queryClient.invalidateQueries(['adminNotifications']);
    },
  });
}

// Hook to cleanup expired notifications (admin)
export function useAdminCleanupExpiredNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      try {
        const result = await deleteRequest(`${MODEL_NAME}/admin/cleanup`);
        if (result.status === HttpStatusCode.Ok) {
          return result.data;
        } else {
          throw new Error(ErrorMessages.generalMessage);
        }
      } catch (err) {
        return throwServerError(err);
      }
    },
    onSuccess: () => {
      // Invalidate all notification-related queries
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries(['adminNotifications']);
      queryClient.invalidateQueries(['unreadCount']);
      queryClient.invalidateQueries(['notificationStats']);
    },
  });
}

// Utility functions for direct API calls (when not using React Query)

// Create and send notification utility function
export async function createAndSendNotification(payload) {
  try {
    const result = await postRequest(`${MODEL_NAME}/admin/send`, payload);
    if (result.status === HttpStatusCode.Ok) {
      return result.data;
    } else {
      throw new Error(ErrorMessages.generalMessage);
    }
  } catch (err) {
    throw throwServerError(err);
  }
}

// Get user notifications utility function
export async function getUserNotifications(userId, queryParams = {}) {
  try {
    const result = await getRequest(`${MODEL_NAME}/list`, queryParams);
    if (result.status === HttpStatusCode.Ok) {
      return result.data;
    } else {
      throw new Error(ErrorMessages.generalMessage);
    }
  } catch (err) {
    throw throwServerError(err);
  }
}

// Mark notifications as read utility function
export async function markNotificationsAsRead(userId, notificationIds) {
  try {
    const result = await putRequest(`${MODEL_NAME}/mark-read`, {
      notificationIds,
    });
    if (result.status === HttpStatusCode.Ok) {
      return result.data;
    } else {
      throw new Error(ErrorMessages.generalMessage);
    }
  } catch (err) {
    throw throwServerError(err);
  }
}

// Notification types constants
export const NOTIFICATION_TYPES = {
  APPOINTMENT: 'appointment',
  PAYMENT: 'payment',
  REFILL_REQUEST: 'refill_request',
  MEDICAL_REPORT: 'medical_report',
  WALLET: 'wallet',
  SUPPORT_CARD: 'support_card',
  DISCOUNT: 'discount',
  SYSTEM: 'system',
  GENERAL: 'general',
  MESSAGE: 'message',
  PRESCRIPTION: 'prescription',
  SURVEY: 'survey',
};

// Priority levels constants
export const NOTIFICATION_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
};

// Default export for convenience
export default {
  useGetNotifications,
  useGetUnreadCount,
  useGetNotificationStats,
  useMarkNotificationsAsRead,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
  useDeleteMultipleNotifications,
  useDeleteAllNotifications,
  useAdminGetAllNotifications,
  useAdminSendNotifications,
  useAdminCleanupExpiredNotifications,
  createAndSendNotification,
  getUserNotifications,
  markNotificationsAsRead,
  testNotificationAPI,
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
};
