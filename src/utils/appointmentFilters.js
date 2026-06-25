import moment from 'moment-timezone';

export const TERMINAL_APPOINTMENT_STATUSES = ['Completed', 'Cancelled', 'No-show', 'No Show'];
export const SESSION_EXIT_GRACE_MINS = 15;

/**
 * Filter upcoming appointments for display (excludes terminal, expired rescheduled-unpaid, past hard end).
 */
export function filterUpcomingAppointments(appointments) {
  if (!appointments || appointments.length === 0) return [];

  return appointments.filter((appt) => {
    if (TERMINAL_APPOINTMENT_STATUSES.includes(appt.status)) return false;

    if (appt.status === 'Rescheduled' && appt.paymentStatus !== 'Completed' && appt.expiresAt) {
      if (!moment(appt.expiresAt).isAfter(moment())) return false;
    }

    const clientTz = appt.clientTz || moment.tz.guess();
    const hardEnd = moment.tz(appt.endTime, clientTz).add(SESSION_EXIT_GRACE_MINS, 'minutes');
    const now = moment.tz(clientTz);
    return hardEnd.isSameOrAfter(now);
  });
}

/**
 * Sort appointments by start time ascending.
 */
export function sortAppointmentsByStart(appointments) {
  return [...appointments].sort(
    (a, b) => moment(a.startTime).valueOf() - moment(b.startTime).valueOf()
  );
}

/**
 * Nearest eligible upcoming appointment (for Home screen card).
 */
export function getNearestUpcomingAppointment(appointments) {
  const eligible = filterUpcomingAppointments(appointments);
  if (eligible.length === 0) return null;
  return sortAppointmentsByStart(eligible)[0];
}
