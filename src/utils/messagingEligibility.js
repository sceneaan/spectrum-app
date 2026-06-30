import moment from 'moment';

/**
 * Whether the patient had a completed appointment with this provider in the last 30 days.
 * Returns null while appointments are still loading (unknown).
 */
export function getMessagingEligibility(appointments, providerId) {
  if (!providerId) return null;
  if (!appointments) return null;
  if (!Array.isArray(appointments) || appointments.length === 0) return false;

  const thirtyDaysAgo = moment().subtract(30, 'days').startOf('day');
  const today = moment().endOf('day');
  const targetProviderIdStr = String(providerId);

  return appointments.some((apt) => {
    const aptProviderId = apt.provider?._id || apt.provider?.id || apt.provider;
    if (String(aptProviderId) !== targetProviderIdStr) return false;
    const appointmentDate = moment(apt.endTime || apt.startTime);
    return appointmentDate.isSameOrAfter(thirtyDaysAgo) && appointmentDate.isSameOrBefore(today);
  });
}
