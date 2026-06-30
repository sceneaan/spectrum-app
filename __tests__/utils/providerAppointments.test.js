import {
  isActiveProviderAppointment,
  partitionProviderSchedule,
  getPatientDisplayName,
} from '../../src/utils/providerAppointments';

describe('providerAppointments', () => {
  const futureEnd = new Date(Date.now() + 3600000).toISOString();
  const pastEnd = new Date(Date.now() - 3600000).toISOString();

  test('isActiveProviderAppointment ignores completed and past', () => {
    expect(isActiveProviderAppointment({ status: 'Confirmed', endTime: futureEnd })).toBe(true);
    expect(isActiveProviderAppointment({ status: 'Completed', endTime: futureEnd })).toBe(false);
    expect(isActiveProviderAppointment({ status: 'Confirmed', endTime: pastEnd })).toBe(false);
  });

  test('partitionProviderSchedule splits approvals', () => {
    const items = [
      { status: 'Confirmed', endTime: futureEnd, approvedByDoctor: false },
      { status: 'Confirmed', endTime: futureEnd, approvedByDoctor: true },
    ];
    const { pendingApprovals, confirmed } = partitionProviderSchedule(items);
    expect(pendingApprovals).toHaveLength(1);
    expect(confirmed).toHaveLength(1);
  });

  test('getPatientDisplayName prefers locale field', () => {
    expect(getPatientDisplayName({
      fullNameEnglish: 'John',
      fullNameArabic: 'جون',
    }, false)).toBe('John');
    expect(getPatientDisplayName({
      fullNameEnglish: 'John',
      fullNameArabic: 'جون',
    }, true)).toBe('جون');
  });
});
