import moment from 'moment-timezone';
import { getAppointmentTiming, formatCountdownParts, padCountdownUnit, HERO_HORIZON_HOURS } from '../../src/utils/sessionTiming';

describe('sessionTiming', () => {
  const baseAppointment = {
    startTime: '2030-06-01T10:00:00.000Z',
    endTime: '2030-06-01T11:00:00.000Z',
    clientTz: 'UTC',
    paymentStatus: 'Completed',
    status: 'Confirmed',
    approvedByDoctor: true,
    roomId: 'room-1',
  };

  it('returns join_ready inside the 10-minute window', () => {
    const now = moment.utc('2030-06-01T09:55:00.000Z');
    const timing = getAppointmentTiming(baseAppointment, now);
    expect(timing.heroState).toBe('join_ready');
    expect(timing.showVideoButton).toBe(true);
  });

  it('returns upcoming within 24 hours before join window', () => {
    const now = moment.utc('2030-06-01T08:00:00.000Z');
    const timing = getAppointmentTiming(baseAppointment, now);
    expect(timing.heroState).toBe('upcoming');
    expect(timing.showVideoButton).toBe(false);
    expect(timing.secondsUntilStart).toBe(2 * 60 * 60);
  });

  it('returns null hero state beyond 24 hours', () => {
    const now = moment.utc('2030-05-30T10:00:00.000Z');
    const timing = getAppointmentTiming(baseAppointment, now);
    expect(timing.heroState).toBeNull();
    expect(timing.isWithinHeroHorizon).toBe(false);
  });

  it('formats countdown parts with padding', () => {
    expect(formatCountdownParts(3661)).toEqual({ hours: 1, minutes: 1, seconds: 1 });
    expect(padCountdownUnit(3)).toBe('03');
    expect(HERO_HORIZON_HOURS).toBe(24);
  });
});
