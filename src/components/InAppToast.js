import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  DeviceEventEmitter,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import messaging from '@react-native-firebase/messaging';
import { emitForegroundMessage } from '../utils/fcmEvents';
import { navigateFromNotification } from '../navigation/AppNavigator';
import { displaySpectrumPushNotification, isJoinablePushPayload } from '../utils/pushNotifications';
import { parseSafeJson } from '../utils/parseSafeJson';
import { emitPreSessionJoinFromPush } from '../utils/pushNotificationHandlers';
import { AppText } from './ui';
import COLORS from '../constants/colors';
import ICONS from '../constants/icons';

const VARIANTS = {
  notification: {
    accent: COLORS.toastNotificationAccent,
    bg: COLORS.toastNotificationBg,
    icon: ICONS.bell,
  },
  success: {
    accent: COLORS.toastSuccessAccent,
    bg: COLORS.toastSuccessBg,
    icon: ICONS.checkCircle,
  },
  error: {
    accent: COLORS.toastErrorAccent,
    bg: COLORS.toastErrorBg,
    icon: ICONS.errorCircle,
  },
  info: {
    accent: COLORS.toastInfoAccent,
    bg: COLORS.toastInfoBg,
    icon: ICONS.info,
  },
};

export const showToast = (options) => {
  DeviceEventEmitter.emit('__in_app_toast__', options);
};

const InAppToast = () => {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState(null);
  const [visible, setVisible] = useState(false);
  const translateY = useRef(new Animated.Value(-130)).current;
  const dismissTimer = useRef(null);

  const dismiss = useCallback(() => {
    clearTimeout(dismissTimer.current);
    Animated.timing(translateY, {
      toValue: -130,
      duration: 240,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  }, [translateY]);

  const present = useCallback(
    (options) => {
      clearTimeout(dismissTimer.current);
      setToast(options);
      setVisible(true);
      Animated.spring(translateY, {
        toValue: 0,
        tension: 70,
        friction: 11,
        useNativeDriver: true,
      }).start();
      dismissTimer.current = setTimeout(dismiss, options.duration ?? 5000);
    },
    [translateY, dismiss],
  );

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('__in_app_toast__', present);

    const unsubFirebase = messaging().onMessage(async (msg) => {
      emitForegroundMessage(msg);
      const data = msg.data || {};
      const n = msg.notification;
      const joinable = isJoinablePushPayload(data);

      if (joinable) {
        try {
          await displaySpectrumPushNotification(msg);
        } catch {
          // Fall back to in-app toast below
        }
      }

      if (n) {
        present({
          type: 'notification',
          title: n.title || 'New Notification',
          message: n.body || '',
          navigateTo: data.screen,
          navigateParams: parseSafeJson(data.params),
          joinable,
          pushData: data,
        });
      }
    });

    return () => {
      sub.remove();
      unsubFirebase();
      clearTimeout(dismissTimer.current);
    };
  }, [present]);

  if (!visible || !toast) return null;

  const variant = VARIANTS[toast.type] || VARIANTS.notification;

  const handlePress = () => {
    dismiss();
    if (!toast.navigateTo) return;
    navigateFromNotification({
      data: {
        screen: toast.navigateTo,
        params: toast.navigateParams ? JSON.stringify(toast.navigateParams) : undefined,
      },
    });
  };

  const handleJoin = () => {
    dismiss();
    if (toast.pushData) {
      emitPreSessionJoinFromPush(toast.pushData);
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 8,
          backgroundColor: variant.bg,
          borderLeftColor: variant.accent,
          transform: [{ translateY }],
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        style={styles.row}
        onPress={handlePress}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel={toast.title || 'Notification'}
      >
        <Image source={variant.icon} style={[styles.icon, { tintColor: variant.accent }]} resizeMode="contain" />
        <View style={styles.textWrap}>
          {toast.title ? (
            <AppText variant="bodySmall" color={variant.accent} numberOfLines={1} style={styles.title}>
              {toast.title}
            </AppText>
          ) : null}
          {toast.message ? (
            <AppText variant="caption" color={COLORS.gray800} numberOfLines={2}>
              {toast.message}
            </AppText>
          ) : null}
        </View>
        <TouchableOpacity
          onPress={dismiss}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Dismiss notification"
        >
          <Image source={ICONS.close} style={[styles.closeIcon, { tintColor: variant.accent }]} resizeMode="contain" />
        </TouchableOpacity>
      </TouchableOpacity>
      {toast.joinable ? (
        <TouchableOpacity style={[styles.joinBtn, { backgroundColor: variant.accent }]} onPress={handleJoin}>
          <AppText variant="button" color={COLORS.white}>Join Session</AppText>
        </TouchableOpacity>
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9999,
    borderRadius: 14,
    borderLeftWidth: 4,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  icon: { width: 22, height: 22 },
  textWrap: { flex: 1 },
  title: { fontWeight: '700', marginBottom: 2 },
  closeIcon: { width: 14, height: 14 },
  joinBtn: {
    marginHorizontal: 14,
    marginBottom: 12,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
});

export default InAppToast;
