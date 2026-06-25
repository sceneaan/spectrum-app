import moment from 'moment-timezone';

export const JOIN_WINDOW_MINS = 10;
export const HERO_HORIZON_HOURS = 24;
export const SESSION_EXIT_GRACE_MINS = 15;

export function getAppointmentTiming(appointment, nowInput) {
  if (!appointment) {
    return {
      heroState: null,
      isInJoinWindow: false,
      isOngoing: false,
      isWithinHeroHorizon: false,
      isConfirmed: false,
      showVideoButton: false,
      secondsUntilStart: null,
      needsApproval: false,
      isRescheduledUnpaid: false,
    };
  }

  const clientTz = appointment.clientTz || moment.tz.guess();
  const now = nowInput ? moment.tz(nowInput, clientTz) : moment.tz(clientTz);
  const appointmentStart = moment.tz(appointment.startTime, clientTz);
  const appointmentEnd = moment.tz(appointment.endTime, clientTz);
  const joinWindowStart = appointmentStart.clone().subtract(JOIN_WINDOW_MINS, 'minutes');

  const isOngoing = now.isSameOrAfter(appointmentStart) && now.isBefore(appointmentEnd);
  const isInJoinWindow = now.isSameOrAfter(joinWindowStart) && now.isBefore(appointmentEnd);
  const secondsUntilStart = Math.max(0, appointmentStart.diff(now, 'seconds'));
  const isWithinHeroHorizon = secondsUntilStart > 0
    ? secondsUntilStart <= HERO_HORIZON_HOURS * 3600
    : isOngoing;

  const needsApproval = appointment.approvedByDoctor === false;
  const isRescheduledUnpaid =
    appointment.status === 'Rescheduled'
    && appointment.paymentStatus !== 'Completed'
    && appointment.expiresAt;

  const isConfirmed = !needsApproval
    && appointment.paymentStatus === 'Completed'
    && appointment.status !== 'Pending'
    && !isRescheduledUnpaid;

  const showVideoButton = Boolean(appointment.roomId) && isInJoinWindow && isConfirmed;

  let heroState = null;
  if (isOngoing && isConfirmed) {
    heroState = 'live';
  } else if (isInJoinWindow && isConfirmed) {
    heroState = 'join_ready';
  } else if (isWithinHeroHorizon && isConfirmed) {
    heroState = 'upcoming';
  }

  return {
    heroState,
    isInJoinWindow,
    isOngoing,
    isWithinHeroHorizon,
    isConfirmed,
    showVideoButton,
    secondsUntilStart,
    needsApproval,
    isRescheduledUnpaid,
    appointmentStart,
    appointmentEnd,
    clientTz,
  };
}

export function formatCountdownParts(totalSeconds) {
  const safe = Math.max(0, totalSeconds || 0);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return { hours, minutes, seconds };
}

export function padCountdownUnit(value) {
  return String(value).padStart(2, '0');
}
