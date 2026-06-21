import { useEffect } from 'react';
import { BackHandler, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

export const useBackButtonHandler = (preventBackCondition = false) => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useTranslation();

  useEffect(() => {
    const backAction = () => {
      // 🔥 CRITICAL: Check if back navigation should be prevented
      if (preventBackCondition) {
        return true; // Prevent default behavior
      }

      // If we're already on the landing screen (tabs), show exit confirmation
      if (route.name === 'tabs') {
        Alert.alert(
          t('navigation.exitApp') || 'Exit App',
          t('navigation.exitConfirmation') || 'Are you sure you want to exit the app?',
          [
            {
              text: t('navigation.cancel') || 'Cancel',
              style: 'cancel',
            },
            {
              text: t('navigation.exit') || 'Exit',
              onPress: () => BackHandler.exitApp(),
            },
          ],
          { cancelable: false }
        );
        return true; // Prevent default behavior
      }

      // For other screens, navigate back to landing screen
      navigation.navigate('tabs');
      return true; // Prevent default behavior
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [navigation, route.name, t, preventBackCondition]);
};
