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

import { formatPersonName } from './displayName';

export function getPatientDisplayName(patient, isRTL) {
  if (!patient) return '';
  let raw = '';
  if (typeof patient === 'string') {
    raw = patient;
  } else if (isRTL) {
    raw = patient.fullNameArabic || patient.fullName || patient.fullNameEnglish || patient.name || '';
  } else {
    raw = patient.fullNameEnglish || patient.fullName || patient.fullNameArabic || patient.name || '';
  }
  return formatPersonName(raw);
}

export function getAppointmentId(appointment) {
  return appointment?._id || appointment?.id || appointment?.appointmentId;
}
