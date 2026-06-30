import moment from 'moment';

export const MIN_BOOKING_LEAD_MINUTES = 60;

export function isSlotBookable(slotStartTime, referenceTime = moment()) {
  const slotTime = moment(slotStartTime);
  if (!slotTime.isValid()) return false;
  return slotTime.isSameOrAfter(referenceTime.clone().add(MIN_BOOKING_LEAD_MINUTES, 'minutes'));
}

/** Mirrors web BookAppoinmentModal — only blocks completely empty patient profiles. */
export function needsMedicalConsentForBooking(user) {
  if (!user || user.role?.toLowerCase() !== 'patient') return false;
  return (
    !user.signatureUrl &&
    !user.fullName &&
    !user.nationality &&
    !user.nationalId &&
    !user.dob
  );
}
