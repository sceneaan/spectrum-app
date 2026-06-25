import {
  isPatientRole,
  isStaffRole,
  canAuthenticatedUserJoinMobileVideo,
} from '../../src/utils/videoAccess';

describe('videoAccess', () => {
  test('isPatientRole', () => {
    expect(isPatientRole({ role: 'patient' })).toBe(true);
    expect(isPatientRole({ role: 'Provider' })).toBe(false);
    expect(isPatientRole(null)).toBe(false);
  });

  test('isStaffRole', () => {
    expect(isStaffRole({ role: 'provider' })).toBe(true);
    expect(isStaffRole({ role: 'admin' })).toBe(true);
    expect(isStaffRole({ role: 'patient' })).toBe(false);
  });

  test('canAuthenticatedUserJoinMobileVideo is patient-only', () => {
    expect(canAuthenticatedUserJoinMobileVideo({ role: 'patient' })).toBe(true);
    expect(canAuthenticatedUserJoinMobileVideo({ role: 'provider' })).toBe(false);
    expect(canAuthenticatedUserJoinMobileVideo({ role: 'admin' })).toBe(false);
  });
});
