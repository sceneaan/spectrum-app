import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HttpStatusCode } from 'axios';
import axios from 'axios';
import { getRequest, putRequest } from '@api';
import { throwServerError } from '@api/messages/error';
import { ErrorMessages } from '@api/messages/generic';
import { useAuthStore } from '../../store/authStore';
import { isAdminRole } from '../../utils/videoAccess';

const ADMIN_MODEL = '/admin';
const APPOINTMENT_MODEL = '/appointment';
const CLINIC_MODEL = '/clinic-bookings';

async function adminRequest(request, ...args) {
  try {
    const result = await request(...args);
    if (result.status === HttpStatusCode.Ok) {
      return result.data.data;
    }
    throw new Error(ErrorMessages.generalMessage);
  } catch (err) {
    return throwServerError(err);
  }
}

function useIsAdminEnabled() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated && isAdminRole(user);
}

export function useAdminGetPatients(query = {}, options = {}) {
  const enabled = useIsAdminEnabled();
  return useQuery({
    queryKey: ['adminPatients', query],
    queryFn: () => adminRequest(getRequest, `${ADMIN_MODEL}/patients`, query),
    enabled: enabled && options.enabled !== false,
  });
}

export function useAdminGetProviders(query = {}, options = {}) {
  const enabled = useIsAdminEnabled();
  return useQuery({
    queryKey: ['adminProviders', query],
    queryFn: () => adminRequest(getRequest, `${ADMIN_MODEL}/providers`, query),
    enabled: enabled && options.enabled !== false,
  });
}

export function useAdminUpdateUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, status }) => adminRequest(
      putRequest,
      `${ADMIN_MODEL}/update/user-status/${userId}`,
      { status },
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPatients'] });
      queryClient.invalidateQueries({ queryKey: ['adminProviders'] });
    },
  });
}

export function useAdminGetAppointments(query = {}) {
  const enabled = useIsAdminEnabled();
  return useQuery({
    queryKey: ['adminAppointments', query],
    queryFn: () => adminRequest(getRequest, `${APPOINTMENT_MODEL}/all`, query),
    enabled,
  });
}

export function useAdminGetLiveAppointments() {
  const enabled = useIsAdminEnabled();
  return useQuery({
    queryKey: ['adminLiveAppointments'],
    queryFn: () => adminRequest(getRequest, `${APPOINTMENT_MODEL}/live`),
    enabled,
    refetchInterval: 60000,
  });
}

export function useAdminCancelAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ appointmentId, payload }) => adminRequest(
      putRequest,
      `${APPOINTMENT_MODEL}/cancel/${appointmentId}`,
      payload,
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAppointments'] });
      queryClient.invalidateQueries({ queryKey: ['adminLiveAppointments'] });
    },
  });
}

export function useAdminGetClinicBookings(query = {}) {
  const enabled = useIsAdminEnabled();
  return useQuery({
    queryKey: ['adminClinicBookings', query],
    queryFn: () => adminRequest(getRequest, CLINIC_MODEL, query),
    enabled,
  });
}

export function useAdminGetClinicPendingCount() {
  const enabled = useIsAdminEnabled();
  return useQuery({
    queryKey: ['adminClinicPendingCount'],
    queryFn: () => adminRequest(getRequest, `${CLINIC_MODEL}/pending-count`),
    enabled,
    refetchInterval: 120000,
  });
}

export function useAdminUpdateClinicBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookingId, payload }) => {
      const result = await axios.patch(`${CLINIC_MODEL}/${bookingId}`, payload);
      if (result.status === HttpStatusCode.Ok) {
        return result.data.data;
      }
      throw new Error(ErrorMessages.generalMessage);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminClinicBookings'] });
      queryClient.invalidateQueries({ queryKey: ['adminClinicPendingCount'] });
    },
  });
}

export function useAdminListRefunds(query = {}) {
  const enabled = useIsAdminEnabled();
  return useQuery({
    queryKey: ['adminRefunds', query],
    queryFn: () => adminRequest(getRequest, '/refund/list', query),
    enabled,
  });
}

export function useAdminGetUserWallet(userId, options = {}) {
  const enabled = useIsAdminEnabled();
  return useQuery({
    queryKey: ['adminUserWallet', userId],
    queryFn: () => adminRequest(getRequest, `${ADMIN_MODEL}/get/user/wallet/${userId}`),
    enabled: enabled && Boolean(userId) && options.enabled !== false,
  });
}
