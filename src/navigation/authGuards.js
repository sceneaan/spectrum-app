import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { canAuthenticatedUserJoinMobileVideo } from '../utils/videoAccess';
import i18n from '../config/i18n';

/**
 * Redirect unauthenticated users before rendering protected screens.
 * Optional loginParams (e.g. targetScreen) are passed to LoginScreen for post-login return.
 */
export const RequireAuth = ({ ScreenComponent, loginParams, ...screenProps }) => {
  const { isAuthenticated } = useAuthStore();
  const navigation = useNavigation();

  useEffect(() => {
    if (isAuthenticated) return;

    const timer = setTimeout(() => {
      if (useAuthStore.getState().isAuthenticated) return;

      if (loginParams?.targetScreen) {
        navigation.reset({
          index: 1,
          routes: [
            { name: 'Main', state: { routes: [{ name: 'HomeTab' }] } },
            { name: 'LoginScreen', params: loginParams },
          ],
        });
      } else {
        navigation.replace('LoginScreen', loginParams);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [isAuthenticated, navigation, loginParams]);

  if (!isAuthenticated) return null;
  return <ScreenComponent {...screenProps} />;
};

export const makeProtected = (ScreenComponent, loginParams) => {
  const Protected = (props) => (
    <RequireAuth ScreenComponent={ScreenComponent} loginParams={loginParams} {...props} />
  );
  Protected.displayName = `Protected(${ScreenComponent.displayName || ScreenComponent.name || 'Screen'})`;
  return Protected;
};

/** Navigate to login preserving the intended destination (booking, video invite, etc.). */
export const navigateToLogin = (navigation, targetScreen, targetParams = {}) => {
  navigation.navigate('LoginScreen', { targetScreen, targetParams });
};

/**
 * Mobile video requires a logged-in patient. Anonymous guest join is not allowed.
 */
export const PatientOnlyVideo = ({ ScreenComponent, ...screenProps }) => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user, isAuthenticated } = useAuthStore();
  const meetingRoomId = route.params?.meetingRoomId;

  useEffect(() => {
    const timer = setTimeout(() => {
      const { isAuthenticated: authed, user: currentUser } = useAuthStore.getState();

      if (route.params?.isGuest === true) {
        navigation.replace('LoginScreen', {
          targetScreen: 'GuestVideoInvite',
          targetParams: { roomId: meetingRoomId },
        });
        return;
      }

      if (!authed) {
        navigation.replace('LoginScreen', {
          targetScreen: 'VideoConsultation',
          targetParams: route.params,
        });
        return;
      }

      if (!canAuthenticatedUserJoinMobileVideo(currentUser)) {
        Alert.alert(
          i18n.t('auth.videoAccessDeniedTitle'),
          i18n.t('auth.videoAccessDeniedMessage'),
          [{ text: i18n.t('common.ok'), onPress: () => navigation.replace('Main') }],
        );
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [isAuthenticated, user, navigation, route.params, meetingRoomId]);

  if (
    route.params?.isGuest === true
    || !isAuthenticated
    || !canAuthenticatedUserJoinMobileVideo(user)
  ) {
    return null;
  }

  return <ScreenComponent {...screenProps} />;
};

export const makePatientOnlyVideo = (ScreenComponent) => {
  const Guarded = (props) => (
    <PatientOnlyVideo ScreenComponent={ScreenComponent} {...props} />
  );
  Guarded.displayName = `PatientOnlyVideo(${ScreenComponent.displayName || ScreenComponent.name || 'Screen'})`;
  return Guarded;
};
