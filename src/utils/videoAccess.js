/**
 * Mobile video is patient-only and requires login. Providers join from the clinic website.
 */

const STAFF_ROLES = new Set(['provider', 'admin']);

export function isPatientRole(user) {
  return user?.role?.toLowerCase() === 'patient';
}

export function isProviderRole(user) {
  return user?.role?.toLowerCase() === 'provider';
}

export function isAdminRole(user) {
  return user?.role?.toLowerCase() === 'admin';
}

export function isStaffRole(user) {
  return STAFF_ROLES.has(user?.role?.toLowerCase());
}

/** Authenticated users on mobile may join video only as patients. */
export function canAuthenticatedUserJoinMobileVideo(user) {
  return isPatientRole(user);
}
