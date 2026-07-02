import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, DeviceEventEmitter, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './ui';
import COLORS from '../constants/colors';
import ICONS from '../constants/icons';
import i18n from '../config/i18n';

const OfflineBanner = () => {
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);
  const translateY = useRef(new Animated.Value(-60)).current;

  const showBanner = () => {
    setOffline(true);
    Animated.timing(translateY, {
      toValue: 0,
      duration: 280,
      useNativeDriver: true,
    }).start();
  };

  const hideBanner = () => {
    Animated.timing(translateY, {
      toValue: -60,
      duration: 280,
      useNativeDriver: true,
    }).start(() => setOffline(false));
  };

  useEffect(() => {
    const offSub = DeviceEventEmitter.addListener('network:offline', showBanner);
    const onSub = DeviceEventEmitter.addListener('network:online', hideBanner);
    return () => {
      offSub.remove();
      onSub.remove();
    };
  }, []);

  if (!offline) return null;

  return (
    <Animated.View
      style={[styles.banner, { paddingTop: insets.top, transform: [{ translateY }] }]}
      pointerEvents="none"
      accessibilityRole="alert"
    >
      <View style={styles.row}>
        <Image source={ICONS.errorCircle} style={styles.icon} resizeMode="contain" />
        <AppText variant="bodySmall" color={COLORS.white} style={styles.text}>
          {i18n.t('common.noInternetConnection')}
        </AppText>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.danger,
    paddingBottom: 10,
    alignItems: 'center',
    zIndex: 9998,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  icon: {
    width: 16,
    height: 16,
    tintColor: COLORS.white,
  },
  text: { fontWeight: '600' },
});

export default OfflineBanner;
