/**
 * @format
 */
globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;

import React, { useEffect, useState } from 'react';
import { AppRegistry, Platform, View } from 'react-native';
import { enableScreens } from 'react-native-screens';
import BootSplash from 'react-native-bootsplash';
import { name as appName } from './app.json';

if (Platform.OS === 'android') {
  enableScreens(false);
}

function hideSplashSoon() {
  BootSplash.hide({ fade: true }).catch(() => {});
}

function Bootstrap() {
  const [AppComponent, setAppComponent] = useState(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const splashSafety = setTimeout(() => {
      hideSplashSoon();
    }, 4000);

    import('./App')
      .then((module) => {
        if (cancelled) return;
        setAppComponent(() => module.default);
        hideSplashSoon();
      })
      .catch((error) => {
        console.error('[Bootstrap] Failed to load App module:', error);
        if (!cancelled) setLoadError(true);
        hideSplashSoon();
      })
      .finally(() => {
        clearTimeout(splashSafety);
      });

    return () => {
      cancelled = true;
      clearTimeout(splashSafety);
    };
  }, []);

  if (loadError) {
    return <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />;
  }

  if (!AppComponent) {
    return <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />;
  }

  return <AppComponent />;
}

AppRegistry.registerComponent(appName, () => Bootstrap);

setTimeout(() => {
  Promise.all([
    import('@react-native-firebase/messaging'),
    import('./src/utils/pushNotifications'),
  ])
    .then(([messagingMod, pushMod]) => {
      const messaging = messagingMod.default;
      const { displaySpectrumPushNotification } = pushMod;
      messaging().setBackgroundMessageHandler(async (remoteMessage) => {
        try {
          await displaySpectrumPushNotification(remoteMessage);
        } catch (error) {
          console.error('Error displaying background notification:', error);
        }
      });
    })
    .catch((error) => {
      console.warn('[Bootstrap] Background messaging setup skipped:', error?.message || error);
    });
}, 0);
