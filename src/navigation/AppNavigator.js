import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { NavigationContainer, useNavigation, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import { AuthProvider } from '../store/AuthContext';
import { useAuthStore } from '../store/authStore';
import InAppToast from '../components/InAppToast';
import OfflineBanner from '../components/OfflineBanner';
import BiometricLockModal from '../components/BiometricLockModal';

// Shared ref for imperative navigation outside React context (toasts, deep links, etc.)
export const navigationRef = createNavigationContainerRef();

// Wraps any screen that requires authentication.
// Immediately redirects to LoginScreen if the user is not authenticated.
const RequireAuth = ({ Screen }) => {
  const { isAuthenticated } = useAuthStore();
  const navigation = useNavigation();

  useEffect(() => {
    if (!isAuthenticated) {
      navigation.replace('LoginScreen');
    }
  }, [isAuthenticated, navigation]);

  if (!isAuthenticated) return null;
  return <Screen />;
};

const makeProtected = (Screen) => (props) => <RequireAuth Screen={Screen} {...props} />;
// --- Auth Screens ---
import LoginScreen from '../screens/LoginScreen';
import OTPScreen from '../screens/OTPScreen';
import ConsentScreen from '../screens/ConsentScreen';
import PatientInfoScreen from '../screens/PatientInfoScreen';
import ElmVerificationRequiredScreen from '../screens/ElmVerificationRequiredScreen';
import OnboardingScreen from '../screens/OnboardingScreen';

import TabNavigator from './TabNavigator';
import SearchScreen from '../screens/SearchScreen';
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
import RescheduleAppointmentScreen from '../screens/RescheduleAppointmentScreen';
import CancelAppointmentScreen from '../screens/CancelAppointmentScreen';
import PaymentFormScreen from '../screens/PaymentFormScreen';
import FindTherapistScreen from '../screens/FindTherapistScreen';
import TherapistProfileScreen from '../screens/TherapistProfileScreen';

const Stack = createNativeStackNavigator();

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

  return <TabNavigator />;
};

const navigateFromNotification = (remoteMessage) => {
  if (!remoteMessage || !navigationRef.isReady()) return;
  const screen = remoteMessage.data?.screen;
  let params;
  try { params = remoteMessage.data?.params ? JSON.parse(remoteMessage.data.params) : undefined; } catch {}
  navigationRef.navigate(screen || 'Notifications', params);
};

const AppNavigator = () => {
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem('@spectrum_onboarding_done').then((done) => {
      setInitialRoute(done === 'true' ? 'Main' : 'Onboarding');
    });
  }, []);

  // Deep links from push notifications
  useEffect(() => {
    // App opened from background by tapping a notification
    const unsubscribe = messaging().onNotificationOpenedApp(navigateFromNotification);

    // App cold-started by tapping a notification
    messaging().getInitialNotification().then((msg) => {
      if (msg) setTimeout(() => navigateFromNotification(msg), 1200);
    });

    return unsubscribe;
  }, []);

  // Wait until we know the initial route before mounting NavigationContainer
  if (!initialRoute) return null;

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="Main" component={ElmVerifiedTabNavigator} />
          <Stack.Screen name="ElmVerificationRequired" component={ElmVerificationRequiredScreen} options={{ gestureEnabled: false }} />
          <Stack.Screen name="LoginScreen" component={LoginScreen} />
          <Stack.Screen name="OTPScreen" component={OTPScreen} />
          <Stack.Screen name="Consent" component={ConsentScreen} />
          <Stack.Screen name="PatientInfoScreen" component={PatientInfoScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Search" component={SearchScreen} />
          <Stack.Screen name="SupportCard" component={SupportCardScreen} />
          <Stack.Screen name="SupportCardSuccessScreen" component={SupportCardSuccessScreen} options={{ gestureEnabled: false }} />
          <Stack.Screen name="NewMessage" component={NewMessageScreen} />
          <Stack.Screen name="ChatDetails" component={ChatDetailsScreen} />
          <Stack.Screen name="DoctorProfile" component={DoctorProfileScreen} />
          <Stack.Screen name="Checkout" component={CheckoutScreen} />
          <Stack.Screen name="PaymentFormScreen" component={PaymentFormScreen} />
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
          <Stack.Screen name="VideoConsultation" component={VideoConsultationScreen} options={{ gestureEnabled: false }} />
          <Stack.Screen name="RescheduleAppointment" component={RescheduleAppointmentScreen} />
          <Stack.Screen name="CancelAppointment" component={CancelAppointmentScreen} />
          <Stack.Screen name="FindTherapist" component={FindTherapistScreen} />
          <Stack.Screen name="TherapistProfile" component={TherapistProfileScreen} />
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
