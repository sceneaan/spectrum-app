import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  DeviceEventEmitter,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import messaging from '@react-native-firebase/messaging';

const VARIANTS = {
  notification: { accent: '#4F46E5', bg: '#EEF2FF', icon: '🔔' },
  success: { accent: '#059669', bg: '#ECFDF5', icon: '✅' },
  error: { accent: '#DC2626', bg: '#FEF2F2', icon: '⚠️' },
  info: { accent: '#0284C7', bg: '#F0F9FF', icon: 'ℹ️' },
};

// Imperative helper — call from anywhere to show a toast
export const showToast = (options) => {
  DeviceEventEmitter.emit('__in_app_toast__', options);
};

const InAppToast = ({ navigationRef }) => {
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
      dismissTimer.current = setTimeout(dismiss, options.duration ?? 4000);
    },
    [translateY, dismiss],
  );

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('__in_app_toast__', present);

    // Handle Firebase foreground notifications as in-app toasts
    const unsubFirebase = messaging().onMessage(async (msg) => {
      const n = msg.notification;
      if (n) {
        present({
          type: 'notification',
          title: n.title || 'New Notification',
          message: n.body || '',
          navigateTo: msg.data?.screen,
          navigateParams: msg.data?.params ? JSON.parse(msg.data.params) : undefined,
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
    if (toast.navigateTo && navigationRef?.current) {
      navigationRef.current.navigate(toast.navigateTo, toast.navigateParams);
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
        <Text style={styles.icon}>{variant.icon}</Text>
        <View style={styles.textWrap}>
          {toast.title ? (
            <Text style={[styles.title, { color: variant.accent }]} numberOfLines={1}>
              {toast.title}
            </Text>
          ) : null}
          {toast.message ? (
            <Text style={styles.message} numberOfLines={2}>
              {toast.message}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity
          onPress={dismiss}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Dismiss notification"
        >
          <Text style={[styles.close, { color: variant.accent }]}>✕</Text>
        </TouchableOpacity>
      </TouchableOpacity>
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
    shadowColor: '#000',
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
  icon: { fontSize: 20 },
  textWrap: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  message: { fontSize: 13, color: '#374151', lineHeight: 18 },
  close: { fontSize: 13, fontWeight: '700', paddingLeft: 4 },
});

export default InAppToast;
