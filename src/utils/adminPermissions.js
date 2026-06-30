import { isAdminRole } from './videoAccess';

const CLINICAL_AUDIT_PERMISSIONS = new Set([
  'view_clinical_audit_dashboard',
  'view_patient_clinical_records',
  'view_session_logs_audit',
  'view_clinical_audit_logs',
]);

export function getAdminPermissions(user) {
  return user?.permissions || user?.roleId || {};
}

export function hasAdminPermission(user, permission) {
  if (!isAdminRole(user)) return false;
  const permissions = getAdminPermissions(user);
  if (!permissions || typeof permissions !== 'object') return false;

  const isClinicalAudit = CLINICAL_AUDIT_PERMISSIONS.has(permission);
  if (permissions.name === 'Super-Admin' && !isClinicalAudit) return true;
  return permissions[permission] === true;
}

export function hasAnyAdminPermission(user, permissionList = []) {
  return permissionList.some((p) => hasAdminPermission(user, p));
}

export function isSuperAdmin(user) {
  return getAdminPermissions(user)?.name === 'Super-Admin';
}
