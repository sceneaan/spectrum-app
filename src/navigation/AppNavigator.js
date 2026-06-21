import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider } from '../store/AuthContext';
import { useAuthStore } from '../store/authStore';
// --- Auth Screens ---
import LoginScreen from '../screens/LoginScreen';
import OTPScreen from '../screens/OTPScreen';
import ConsentScreen from '../screens/ConsentScreen';
import PatientInfoScreen from '../screens/PatientInfoScreen';
import ElmVerificationRequiredScreen from '../screens/ElmVerificationRequiredScreen';

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
import WalletScreen from '../screens/WalletScreen'; // Import
import BillingScreen from '../screens/BillingScreen'; // Import
import RefillRequestScreen from '../screens/RefillRequestScreen';
import MedicalReportsScreen from '../screens/MedicalReportsScreen';
import MedicalRecordScreen from '../screens/MedicalRecordScreen';
import TermsScreen from '../screens/TermsScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import AboutUsScreen from '../screens/AboutUsScreen';
import { CustomVideoConferenceScreen as VideoConsultationScreen } from '../screens/VideoConference'; // Import Custom Video Conference
import RescheduleAppointmentScreen from '../screens/RescheduleAppointmentScreen'; // Import Reschedule Appointment
import CancelAppointmentScreen from '../screens/CancelAppointmentScreen'; // Import Cancel Appointment

import PaymentFormScreen from '../screens/PaymentFormScreen'; // Import PaymentFormScreen
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
      // Redirect to ELM verification screen
      navigation.reset({
        index: 0,
        routes: [{ name: 'ElmVerificationRequired' }],
      });
    }
  }, [isAuthenticated, user, navigation]);

  return <TabNavigator />;
};

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
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
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="WalletScreen" component={WalletScreen} />
        <Stack.Screen name="BillingScreen" component={BillingScreen} />
        <Stack.Screen name="RefillRequestScreen" component={RefillRequestScreen} />
        <Stack.Screen name="MedicalReportsScreen" component={MedicalReportsScreen} />
        <Stack.Screen name="MedicalRecordScreen" component={MedicalRecordScreen} />
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
  );
};

export default AppNavigator;