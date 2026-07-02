import { useAuthStore } from '../store/authStore';
import { isProviderRole } from './videoAccess';
import { parseSafeJson } from './parseSafeJson';

export const ALLOWED_NOTIFICATION_SCREENS = new Set([
  'Main',
  'Notifications',
  'ChatDetails',
  'VideoConsultation',
  'GuestVideoInvite',
  'DoctorProfile',
  'TherapistProfile',
  'Checkout',
  'RescheduleAppointment',
  'CancelAppointment',
  'Profile',
  'FindTherapist',
  'SearchResults',
  'WalletScreen',
  'BillingScreen',
  'RefillRequestScreen',
  'MedicalReportsScreen',
  'MedicalRecordScreen',
  'PaymentSuccessScreen',
  'PaymentFailureScreen',
  'ProviderRefills',
  'ProviderRevenue',
  'ProviderPerformance',
  'ProviderReferralDetail',
  'ProviderNewMessage',
  'ProviderReportDetail',
  'ProviderEncounterDetail',
  'ProviderProfile',
  'ProviderPatients',
  'ProviderPatientDetail',
  'ProviderDiscounts',
  'AdminProfile',
  'AdminNotifications',
  'AdminDiscounts',
  'AdminAppointments',
  'AdminClinicBookings',
  'AdminRefunds',
  'AdminFinancial',
  'AdminWalletLookup',
  'PromoDetail',
]);

export const PROVIDER_ONLY_SCREENS = new Set([
  'ProviderRefills',
  'ProviderRevenue',
  'ProviderPerformance',
  'ProviderReferralDetail',
  'ProviderNewMessage',
  'ProviderReportDetail',
  'ProviderEncounterDetail',
  'ProviderProfile',
  'ProviderPatients',
  'ProviderPatientDetail',
  'ProviderDiscounts',
]);

export const ADMIN_ONLY_SCREENS = new Set([
  'AdminProfile',
  'AdminNotifications',
  'AdminDiscounts',
  'AdminAppointments',
  'AdminClinicBookings',
  'AdminRefunds',
  'AdminFinancial',
  'AdminWalletLookup',
]);

export const PATIENT_ONLY_SCREENS = new Set([
  'Checkout',
  'WalletScreen',
  'BillingScreen',
  'RefillRequestScreen',
  'MedicalReportsScreen',
  'MedicalRecordScreen',
  'FindTherapist',
  'DoctorProfile',
  'TherapistProfile',
  'SupportCard',
]);

export const PROTECTED_NOTIFICATION_SCREENS = new Set([
  'Notifications',
  'ChatDetails',
  'VideoConsultation',
  'Checkout',
  'RescheduleAppointment',
  'CancelAppointment',
  'Profile',
  'WalletScreen',
  'BillingScreen',
  'RefillRequestScreen',
  'MedicalReportsScreen',
  'MedicalRecordScreen',
  'PaymentSuccessScreen',
  'PaymentFailureScreen',
  'ProviderRefills',
  'ProviderRevenue',
  'ProviderPerformance',
  'ProviderReferralDetail',
  'ProviderNewMessage',
  'ProviderReportDetail',
  'ProviderEncounterDetail',
  'ProviderProfile',
  'ProviderPatients',
  'ProviderPatientDetail',
  'ProviderDiscounts',
  'AdminProfile',
  'AdminNotifications',
  'AdminDiscounts',
  'AdminAppointments',
  'AdminClinicBookings',
  'AdminRefunds',
  'AdminFinancial',
  'AdminWalletLookup',
  'PromoDetail',
]);

export const parseNotificationParams = (raw) => parseSafeJson(raw);

export const isScreenAllowedForUser = (screen, user) => {
  const role = user?.role?.toLowerCase();
  if (ADMIN_ONLY_SCREENS.has(screen)) return role === 'admin';
  if (PROVIDER_ONLY_SCREENS.has(screen)) return isProviderRole(user);
  if (PATIENT_ONLY_SCREENS.has(screen)) return role === 'patient';
  return true;
};

export const sanitizeNotificationTarget = (screen, params, user) => {
  const rawScreen = typeof screen === 'string' ? screen : null;
  const targetScreen = ALLOWED_NOTIFICATION_SCREENS.has(rawScreen) ? rawScreen : 'Notifications';
  const safeParams = parseNotificationParams(params);

  if (PROTECTED_NOTIFICATION_SCREENS.has(targetScreen)) {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
      return {
        screen: 'LoginScreen',
        params: { targetScreen, targetParams: safeParams },
        requiresAuth: true,
      };
    }
    if (!isScreenAllowedForUser(targetScreen, user)) {
      return { screen: 'Main', params: undefined, requiresAuth: false };
    }
  }

  return { screen: targetScreen, params: safeParams, requiresAuth: false };
};

/** Navigate from in-app notification list or FCM with allowlist + role checks. */
export const navigateToNotificationTarget = (navigation, screen, params) => {
  const { user } = useAuthStore.getState();
  const { screen: targetScreen, params: targetParams } = sanitizeNotificationTarget(screen, params, user);
  navigation.navigate(targetScreen, targetParams);
};
