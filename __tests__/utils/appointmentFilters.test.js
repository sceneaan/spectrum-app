import moment from 'moment-timezone';
import {
  filterUpcomingAppointments,
  getNearestUpcomingAppointment,
  TERMINAL_APPOINTMENT_STATUSES,
} from '../../src/utils/appointmentFilters';

const futureStart = moment().add(2, 'hours').toISOString();
const futureEnd = moment().add(3, 'hours').toISOString();
const pastEnd = moment().subtract(2, 'hours').toISOString();

describe('appointmentFilters', () => {
  test('filters terminal statuses', () => {
    for (const status of TERMINAL_APPOINTMENT_STATUSES) {
      const result = filterUpcomingAppointments([
        { status, startTime: futureStart, endTime: futureEnd },
      ]);
      expect(result).toHaveLength(0);
    }
  });

  test('filters expired rescheduled-unpaid', () => {
    const result = filterUpcomingAppointments([
      {
        status: 'Rescheduled',
        paymentStatus: 'Pending',
        expiresAt: moment().subtract(1, 'hour').toISOString(),
        startTime: futureStart,
        endTime: futureEnd,
      },
    ]);
    expect(result).toHaveLength(0);
  });

  test('keeps active upcoming appointment', () => {
    const result = filterUpcomingAppointments([
      {
        status: 'Scheduled',
        paymentStatus: 'Completed',
        startTime: futureStart,
        endTime: futureEnd,
        clientTz: 'Asia/Riyadh',
      },
    ]);
    expect(result).toHaveLength(1);
  });

  test('getNearestUpcomingAppointment returns earliest', () => {
    const sooner = moment().add(1, 'hour').toISOString();
    const later = moment().add(5, 'hours').toISOString();
    const nearest = getNearestUpcomingAppointment([
      { status: 'Scheduled', startTime: later, endTime: futureEnd },
      { status: 'Scheduled', startTime: sooner, endTime: futureEnd },
    ]);
    expect(nearest.startTime).toBe(sooner);
  });
});
