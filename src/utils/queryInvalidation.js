/** Shared React Query v5 invalidation helpers for appointment & profile flows. */

export const APPOINTMENT_QUERY_KEYS = {
  upcoming: ['upcomingAppointments'],
  pendingGrouped: ['pendingAppointmentsGroupedByDoctor'],
  appointments: ['appointments'],
  completed: ['completedAppointments'],
  wallet: ['myWallet'],
};

export const REFILL_QUERY_KEYS = {
  prescriptions: ['prescriptions', 'patient'],
  refillRequests: ['patientRefillRequests'],
  pendingMedications: ['pendingMedications'],
};

export function invalidateAppointmentCaches(queryClient) {
  const tasks = [
    ...Object.values(APPOINTMENT_QUERY_KEYS).map((queryKey) =>
      queryClient.invalidateQueries({ queryKey }),
    ),
    queryClient.invalidateQueries({ queryKey: ['pendingAppointmentsByDoctorId'] }),
    queryClient.invalidateQueries({ queryKey: ['appointmentsCount'] }),
  ];
  return Promise.all(tasks);
}

export function invalidateRefillCaches(queryClient) {
  return Promise.all(
    Object.values(REFILL_QUERY_KEYS).map((queryKey) =>
      queryClient.invalidateQueries({ queryKey }),
    ),
  );
}
