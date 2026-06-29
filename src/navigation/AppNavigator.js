import React, { useEffect, useState } from 'react';
import { View, Linking, DeviceEventEmitter, ActivityIndicator } from 'react-native';
import BootSplash from 'react-native-bootsplash';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import { useAuthStore } from '../store/authStore';
import socketService from '../utils/socket';
import InAppToast from '../components/InAppToast';
import OfflineBanner from '../components/OfflineBanner';
import BiometricLockModal from '../components/BiometricLockModal';
import { makeProtected } from './authGuards';

// Shared ref for imperative navigation outside React context (toasts, deep links, etc.)
export const navigationRef = createNavigationContainerRef();
// --- Auth Screens ---
import LoginScreen from '../screens/LoginScreen';
import OTPScreen from '../screens/OTPScreen';
import ConsentScreen from '../screens/ConsentScreen';
import PatientInfoScreen from '../screens/PatientInfoScreen';
import ElmVerificationRequiredScreen from '../screens/ElmVerificationRequiredScreen';
import OnboardingScreen from '../screens/OnboardingScreen';

import RoleTabNavigator from './RoleTabNavigator';
import { PreSessionJoinProvider } from '../context/PreSessionJoinContext';
import SearchResultsScreen from '../screens/SearchResultsScreen';
import SupportCardScreen from '../screens/SupportCardScreen';
import SupportCardSuccessScreen from '../screens/SupportCardSuccessScreen';
import NewMessageScreen from '../screens/NewMessageScreen';
import ChatDetailsScreen from '../screens/ChatDetailsScreen';
import DoctorProfileScreen from '../screens/DoctorProfileScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import PaymentSuccessScreen from '../screens/PaymentSuccessScreen';
import PaymentFailureScreen from '../screens/PaymentFailureScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import WalletScreen from '../screens/WalletScreen';
import BillingScreen from '../screens/BillingScreen';
import RefillRequestScreen from '../screens/RefillRequestScreen';
import MedicalReportsScreen from '../screens/MedicalReportsScreen';
import MedicalRecordScreen from '../screens/MedicalRecordScreen';
import TermsScreen from '../screens/TermsScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import AboutUsScreen from '../screens/AboutUsScreen';
import { CustomVideoConferenceScreen as VideoConsultationScreen } from '../screens/VideoConference';
import GuestVideoInviteScreen from '../screens/GuestVideoInviteScreen';
import { makePatientOnlyVideo } from './authGuards';

const PatientVideoConsultationScreen = makePatientOnlyVideo(VideoConsultationScreen);
import RescheduleAppointmentScreen from '../screens/RescheduleAppointmentScreen';
import CancelAppointmentScreen from '../screens/CancelAppointmentScreen';
import PaymentFormScreen from '../screens/PaymentFormScreen';
import FindTherapistScreen from '../screens/FindTherapistScreen';
import TherapistProfileScreen from '../screens/TherapistProfileScreen';
import ProviderRefillsScreen from '../screens/provider/ProviderRefillsScreen';
import ProviderRevenueScreen from '../screens/provider/ProviderRevenueScreen';
import ProviderPerformanceScreen from '../screens/provider/ProviderPerformanceScreen';
import ProviderReferralDetailScreen from '../screens/provider/ProviderReferralDetailScreen';
import ProviderNewMessageScreen from '../screens/provider/ProviderNewMessageScreen';
import ProviderReportDetailScreen from '../screens/provider/ProviderReportDetailScreen';
import ProviderEncounterDetailScreen from '../screens/provider/ProviderEncounterDetailScreen';
import ProviderProfileScreen from '../screens/provider/ProviderProfileScreen';
import ProviderPatientsScreen from '../screens/provider/ProviderPatientsScreen';
import AdminProfileScreen from '../screens/admin/AdminProfileScreen';
import AdminNotificationsScreen from '../screens/admin/AdminNotificationsScreen';
import AdminDiscountsScreen from '../screens/admin/AdminDiscountsScreen';
import AdminAppointmentsScreen from '../screens/admin/AdminAppointmentsScreen';
import AdminClinicBookingsScreen from '../screens/admin/AdminClinicBookingsScreen';
import AdminRefundsScreen from '../screens/admin/AdminRefundsScreen';
import AdminWalletLookupScreen from '../screens/admin/AdminWalletLookupScreen';
import PromoDetailScreen from '../screens/PromoDetailScreen';
import COLORS from '../constants/colors';

const Stack = createNativeStackNavigator();

// Screens that FCM may deep-link to (allowlist only — prevents open redirect)
const ALLOWED_NOTIFICATION_SCREENS = new Set([
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
  'ProviderRefills',
  'ProviderRevenue',
  'ProviderPerformance',
  'ProviderReferralDetail',
  'ProviderNewMessage',
  'ProviderReportDetail',
  'ProviderEncounterDetail',
  'ProviderProfile',
  'ProviderPatients',
  'ProviderDiscounts',
  'AdminProfile',
  'AdminNotifications',
  'AdminDiscounts',
  'AdminAppointments',
  'AdminClinicBookings',
  'AdminRefunds',
  'AdminWalletLookup',
  'PromoDetail',
]);

// Require login before navigating to these targets
const PROTECTED_NOTIFICATION_SCREENS = new Set([
  'Notifications',
  'ChatDetails',
  'VideoConsultation',
  'Checkout',
  'RescheduleAppointment',
  'CancelAppointment',
  'Profile',
  'WalletScreen',
  'BillingScreen',
  'ProviderRefills',
  'ProviderRevenue',
  'ProviderPerformance',
  'ProviderReferralDetail',
  'ProviderNewMessage',
  'ProviderReportDetail',
  'ProviderEncounterDetail',
  'ProviderProfile',
  'ProviderPatients',
  'ProviderDiscounts',
  'AdminProfile',
  'AdminNotifications',
  'AdminDiscounts',
  'AdminAppointments',
  'AdminClinicBookings',
  'AdminRefunds',
  'AdminWalletLookup',
  'PromoDetail',
]);

const parseNotificationParams = (raw) => {
  if (!raw) return undefined;
  try {
    const params = JSON.parse(raw);
    if (!params || typeof params !== 'object' || Array.isArray(params)) return undefined;
    return params;
  } catch {
    return undefined;
  }
};

export const navigateFromNotification = (remoteMessage) => {
  if (!remoteMessage || !navigationRef.isReady()) return;

  const screen = remoteMessage.data?.screen;
  const targetScreen = ALLOWED_NOTIFICATION_SCREENS.has(screen) ? screen : 'Notifications';

  if (PROTECTED_NOTIFICATION_SCREENS.has(targetScreen)) {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
      navigationRef.navigate('LoginScreen');
      return;
    }
  }

  const params = parseNotificationParams(remoteMessage.data?.params);
  navigationRef.navigate(targetScreen, params);
};

// Wrapper component that checks ELM verification
const ElmVerifiedTabNavigator = ({ navigation }) => {
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Skip ELM check if ELM is disabled from backend
    if (user?.elmDisabled) return;

    // Check if user is a patient and not ELM verified
    if (isAuthenticated && user?.role === 'patient' && !user?.elmVerified) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'ElmVerificationRequired' }],
      });
    }
  }, [isAuthenticated, user, navigation]);

  return <PreSessionJoinProvider><RoleTabNavigator /></PreSessionJoinProvider>;
};

const linking = {
  prefixes: [
    'spectrum://',
    'https://spectrumclinics.care',
    'https://www.spectrumclinics.care',
  ],
  config: {
    screens: {
      GuestVideoInvite: {
        path: 'video-conference/invite/:roomId',
        parse: {
          roomId: (roomId) => roomId,
        },
      },
    },
  },
  async getInitialURL() {
    const url = await Linking.getInitialURL();
    return url;
  },
  subscribe(listener) {
    const sub = Linking.addEventListener('url', ({ url }) => listener(url));
    return () => sub.remove();
  },
  getStateFromPath(path, options) {
    const inviteMatch = path.match(/^\/?video-conference\/invite\/([^/?]+)/);
    if (!inviteMatch) {
      return undefined;
    }

    const roomId = decodeURIComponent(inviteMatch[1]);
    const queryIndex = path.indexOf('?');
    const params = {};
    if (queryIndex !== -1) {
      const search = path.slice(queryIndex + 1);
      search.split('&').forEach((pair) => {
        const [key, value] = pair.split('=');
        if (key) params[key] = decodeURIComponent(value || '');
      });
    }

    return {
      routes: [{
        name: 'GuestVideoInvite',
        params: {
          roomId,
          token: params.token,
          name: params.name,
        },
      }],
    };
  },
};

const AppNavigator = () => {
  const [initialRoute, setInitialRoute] = useState(null);
  const [navigationReady, setNavigationReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('@spectrum_onboarding_done').then((done) => {
      setInitialRoute(done === 'true' ? 'Main' : 'Onboarding');
    });
  }, []);

  useEffect(() => {
    if (navigationReady) {
      BootSplash.hide({ fade: true });
    }
  }, [navigationReady]);

  // Deep links from push notifications
  useEffect(() => {
    const unsubscribe = messaging().onNotificationOpenedApp(navigateFromNotification);

    messaging().getInitialNotification().then((msg) => {
      if (msg) setTimeout(() => navigateFromNotification(msg), 1200);
    });

    return unsubscribe;
  }, []);

  // Navigate to login after session timeout or token expiry
  useEffect(() => {
    const navigateToLogin = () => {
      socketService.disconnect();
      if (navigationRef.isReady()) {
        navigationRef.reset({
          index: 0,
          routes: [{ name: 'LoginScreen' }],
        });
      }
    };

    const timeoutSub = DeviceEventEmitter.addListener('auth:sessionTimeout', navigateToLogin);
    const expiredSub = DeviceEventEmitter.addListener('auth:sessionExpired', navigateToLogin);

    return () => {
      timeoutSub.remove();
      expiredSub.remove();
    };
  }, []);

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer
        ref={navigationRef}
        linking={linking}
        onReady={() => setNavigationReady(true)}
      >
        <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="Main" component={ElmVerifiedTabNavigator} />
          <Stack.Screen name="ElmVerificationRequired" component={ElmVerificationRequiredScreen} options={{ gestureEnabled: false }} />
          <Stack.Screen name="LoginScreen" component={LoginScreen} />
          <Stack.Screen name="OTPScreen" component={OTPScreen} />
          <Stack.Screen name="Consent" component={ConsentScreen} />
          <Stack.Screen name="PatientInfoScreen" component={PatientInfoScreen} />
          <Stack.Screen name="Profile" component={makeProtected(ProfileScreen)} />
          <Stack.Screen name="SupportCard" component={SupportCardScreen} />
          <Stack.Screen name="SupportCardSuccessScreen" component={SupportCardSuccessScreen} options={{ gestureEnabled: false }} />
          <Stack.Screen name="NewMessage" component={makeProtected(NewMessageScreen)} />
          <Stack.Screen name="ChatDetails" component={makeProtected(ChatDetailsScreen)} />
          <Stack.Screen name="DoctorProfile" component={DoctorProfileScreen} />
          <Stack.Screen name="Checkout" component={makeProtected(CheckoutScreen)} />
          <Stack.Screen name="PaymentFormScreen" component={makeProtected(PaymentFormScreen)} />
          <Stack.Screen name="PaymentSuccessScreen" component={PaymentSuccessScreen} options={{ gestureEnabled: false }} />
          <Stack.Screen name="PaymentFailureScreen" component={PaymentFailureScreen} />
          <Stack.Screen name="Notifications" component={makeProtected(NotificationsScreen)} />
          <Stack.Screen name="WalletScreen" component={makeProtected(WalletScreen)} />
          <Stack.Screen name="BillingScreen" component={makeProtected(BillingScreen)} />
          <Stack.Screen name="RefillRequestScreen" component={makeProtected(RefillRequestScreen)} />
          <Stack.Screen name="MedicalReportsScreen" component={makeProtected(MedicalReportsScreen)} />
          <Stack.Screen name="MedicalRecordScreen" component={makeProtected(MedicalRecordScreen)} />
          <Stack.Screen name="TermsScreen" component={TermsScreen} />
          <Stack.Screen name="PrivacyPolicyScreen" component={PrivacyPolicyScreen} />
          <Stack.Screen name="AboutUsScreen" component={AboutUsScreen} />
          <Stack.Screen name="SearchResults" component={SearchResultsScreen} />
          <Stack.Screen name="GuestVideoInvite" component={GuestVideoInviteScreen} options={{ gestureEnabled: false }} />
          <Stack.Screen name="VideoConsultation" component={PatientVideoConsultationScreen} options={{ gestureEnabled: false }} />
          <Stack.Screen name="RescheduleAppointment" component={makeProtected(RescheduleAppointmentScreen)} />
          <Stack.Screen name="CancelAppointment" component={makeProtected(CancelAppointmentScreen)} />
          <Stack.Screen name="FindTherapist" component={FindTherapistScreen} />
          <Stack.Screen name="TherapistProfile" component={TherapistProfileScreen} />
          <Stack.Screen name="ProviderRefills" component={makeProtected(ProviderRefillsScreen)} />
          <Stack.Screen name="ProviderRevenue" component={makeProtected(ProviderRevenueScreen)} />
          <Stack.Screen name="ProviderPerformance" component={makeProtected(ProviderPerformanceScreen)} />
          <Stack.Screen name="ProviderReferralDetail" component={makeProtected(ProviderReferralDetailScreen)} />
          <Stack.Screen name="ProviderNewMessage" component={makeProtected(ProviderNewMessageScreen)} />
          <Stack.Screen name="ProviderReportDetail" component={makeProtected(ProviderReportDetailScreen)} />
          <Stack.Screen name="ProviderEncounterDetail" component={makeProtected(ProviderEncounterDetailScreen)} />
          <Stack.Screen name="ProviderProfile" component={makeProtected(ProviderProfileScreen)} />
          <Stack.Screen name="ProviderPatients" component={makeProtected(ProviderPatientsScreen)} />
          <Stack.Screen name="ProviderDiscounts" component={makeProtected(ProviderDiscountsScreen)} />
          <Stack.Screen name="AdminProfile" component={makeProtected(AdminProfileScreen)} />
          <Stack.Screen name="AdminNotifications" component={makeProtected(AdminNotificationsScreen)} />
          <Stack.Screen name="AdminDiscounts" component={makeProtected(AdminDiscountsScreen)} />
          <Stack.Screen name="AdminAppointments" component={makeProtected(AdminAppointmentsScreen)} />
          <Stack.Screen name="AdminClinicBookings" component={makeProtected(AdminClinicBookingsScreen)} />
          <Stack.Screen name="AdminRefunds" component={makeProtected(AdminRefundsScreen)} />
          <Stack.Screen name="AdminWalletLookup" component={makeProtected(AdminWalletLookupScreen)} />
          <Stack.Screen name="PromoDetail" component={PromoDetailScreen} />
        </Stack.Navigator>
      </NavigationContainer>

      {/* Global overlays — rendered above the NavigationContainer */}
      <InAppToast navigationRef={navigationRef} />
      <OfflineBanner />
      <BiometricLockModal />
    </View>
  );
};

export default AppNavigator;
