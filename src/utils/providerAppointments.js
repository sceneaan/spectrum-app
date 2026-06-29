import moment from 'moment';

const CLOSED_STATUSES = new Set(['Completed', 'Cancelled', 'No-show', 'Rejected']);

export function isActiveProviderAppointment(appointment) {
  if (!appointment?.endTime) return false;
  if (CLOSED_STATUSES.has(appointment.status)) return false;
  return moment(appointment.endTime).isAfter(moment());
}

export function partitionProviderSchedule(appointments = []) {
  const active = appointments.filter(isActiveProviderAppointment);
  const pendingApprovals = active.filter((a) => a.approvedByDoctor === false);
  const confirmed = active.filter((a) => a.approvedByDoctor !== false);
  return { active, pendingApprovals, confirmed };
}

export function getPatientDisplayName(patient, isRTL) {
  if (!patient) return '';
  if (isRTL) {
    return patient.fullNameArabic || patient.fullName || patient.fullNameEnglish || '';
  }
  return patient.fullNameEnglish || patient.fullName || patient.fullNameArabic || '';
}

export function getAppointmentId(appointment) {
  return appointment?._id || appointment?.id || appointment?.appointmentId;
}
