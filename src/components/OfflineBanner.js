import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, DeviceEventEmitter } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// api/index.js emits these events from its response interceptor
// network:offline → when a request fails with no response (network error)
// network:online  → when a subsequent request succeeds after an offline period

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
    >
      <Text style={styles.text}>⚠️  No internet connection</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#EF4444',
    paddingBottom: 10,
    alignItems: 'center',
    zIndex: 9998,
  },
  text: { color: '#fff', fontSize: 13, fontWeight: '600' },
});

export default OfflineBanner;
