import { useQuery, useMutation } from '@tanstack/react-query';
import { HttpStatusCode } from 'axios';
import { getRequest, postRequest, putRequest } from '@api';
import { throwServerError } from '@api/messages/error';
import { ErrorMessages } from '@api/messages/generic';
import { useAuthStore } from '../../store/authStore';

const MODEL_NAME = '/appointment';

// Hook to create an appointment
export function useCreateAppointment() {
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

// Hook to get all appointments
export function useGetAllAppointments(query) {
    return useQuery({
        queryKey: ['appointments'],
        queryFn: async () => {
            try {
                const result = await getRequest(`${MODEL_NAME}/appointments`, query);
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

// Hook to get appointments count
export function useGetAppointmentsCount() {
    return useQuery({
        queryKey: ['appointmentsCount'],
        queryFn: async () => {
            try {
                const result = await getRequest(`${MODEL_NAME}/appointments-count`);
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

// Hook to get pending appointments grouped by doctor
export function useGetPendingAppointmentsGroupedByDoctor() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    return useQuery({
        queryKey: ['pendingAppointmentsGroupedByDoctor'],
        queryFn: async () => {
            try {
                const result = await getRequest(`${MODEL_NAME}/pending/grouped/by/doctor`);
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

// Hook to check room ID
export function useCheckRoomId(id) {
    return useQuery({
        queryKey: ['checkRoomId', id],
        queryFn: async () => {
            try {
                const result = await getRequest(`${MODEL_NAME}/check-roomId/${id}`);
                if (result.status === HttpStatusCode.Ok) {
                    return result.data.data;
                } else {
                    throw new Error(ErrorMessages.generalMessage);
                }
            } catch (err) {
                return throwServerError(err);
            }
        },
        enabled: !!id, // Only run query if `id` is provided
        refetchOnMount: 'always', // Always refetch when component mounts (for rejoin)
        staleTime: 0, // Data is immediately stale (force refetch)
    });
}

// Hook to get associated patients
export function useGetAssociatedPatients() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const isProvider = useAuthStore((state) => state.user?.role?.toLowerCase() === 'provider');

    return useQuery({
        queryKey: ['associatedPatients'],
        queryFn: async () => {
            try {
                const result = await getRequest(`${MODEL_NAME}/associated-patients`);
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
        staleTime: 0,
        refetchOnMount: 'always',
    });
}

// Hook to create a recurring appointment
export function useCreateRecurringAppointment() {
    return useMutation({
        mutationFn: async (payload) => {
            try {
                const result = await postRequest('recurring/create', payload);
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

export function useCancelAppointment() {
    return useMutation({
        mutationFn: async ({ id, payload }) => {

            try {
                const result = await putRequest(`${MODEL_NAME}/cancel/${id}`, payload);
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

export function useRescheduleAppointment() {
    return useMutation({
        mutationFn: async (payload) => {
            try {
                const result = await putRequest(`${MODEL_NAME}/reschedule`, payload);
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

export function useGetAppointmentStatus(id) {
    return useQuery({
        queryKey: ['appointmentStatus', id],
        enabled: !!id,
        queryFn: async () => {
            try {
                const result = await getRequest(`${MODEL_NAME}/status/${id}`);
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

export function useGetPendingAppointmentsByDoctorId(id) {
    return useQuery({
        queryKey: ['pendingAppointmentsByDoctorId', id],
        queryFn: async () => {
            try {
                const result = await getRequest(`${MODEL_NAME}/pending/${id}`);
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

export function useGetUpcomingAppointments(query = {}) {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    return useQuery({
        queryKey: ['upcomingAppointments', query],
        queryFn: async () => {
            try {
                const result = await getRequest(`${MODEL_NAME}/upcoming`, query);
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

export function useGetProviderAppointments() {
    const user = useAuthStore((state) => state.user);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const isProvider = user?.role?.toLowerCase() === 'provider';

    return useQuery({
        queryKey: ['providerAppointments'],
        queryFn: async () => {
            try {
                const result = await getRequest(`${MODEL_NAME}/provider-appointments`);
                if (result.status === HttpStatusCode.Ok) {
                    return result.data.data;
                }
                throw new Error(ErrorMessages.generalMessage);
            } catch (err) {
                return throwServerError(err);
            }
        },
        enabled: isAuthenticated && isProvider,
    });
}

export function useApproveAppointment() {
    return useMutation({
        mutationFn: async (id) => {
            try {
                const result = await putRequest(`${MODEL_NAME}/approve/${id}`);
                if (result.status === HttpStatusCode.Ok) {
                    return result.data.data;
                }
                throw new Error(ErrorMessages.generalMessage);
            } catch (err) {
                return throwServerError(err);
            }
        },
    });
}

export function useRejectAppointment() {
    return useMutation({
        mutationFn: async (id) => {
            try {
                const result = await putRequest(`${MODEL_NAME}/reject/${id}`);
                if (result.status === HttpStatusCode.Ok) {
                    return result.data.data;
                }
                throw new Error(ErrorMessages.generalMessage);
            } catch (err) {
                return throwServerError(err);
            }
        },
    });
}

// Hook to send invitation
export function useSendInvitation() {
    return useMutation({
        mutationFn: async (payload) => {
            try {
                const result = await postRequest(`${MODEL_NAME}/invite`, payload);
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

// Hook to get completed appointments for medical reports
export function useGetCompletedAppointments() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const isPatient = useAuthStore((state) => state.user?.role?.toLowerCase() === 'patient');
    return useQuery({
        queryKey: ['completedAppointments'],
        queryFn: async () => {
            try {
                const result = await getRequest(`${MODEL_NAME}/completed`);
                if (result.status === HttpStatusCode.Ok) {
                    return result.data.data;
                } else {
                    throw new Error(ErrorMessages.generalMessage);
                }
            } catch (err) {
                return throwServerError(err);
            }
        },
        enabled: isAuthenticated && isPatient,
    });
}