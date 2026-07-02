import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import { useLanguage } from '../store/LanguageContext';
import { useAuthStore } from '../store/authStore';
import Header from '../components/Header';
import COLORS from '../constants/colors';
import { fullLogout } from '../utils/fullLogout';

// Import your new sub-components
import ProfileMenu from '../components/profile/ProfileMenu';
import EditProfileForm from '../components/profile/EditProfileForm';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useLanguage();
  const openedFromCompleteProfile = route.params?.view === 'edit';
  const [viewMode, setViewMode] = useState(openedFromCompleteProfile ? 'edit' : 'menu');

  useEffect(() => {
    if (route.params?.view === 'edit') {
      setViewMode('edit');
    }
  }, [route.params?.view]);

  const handleBack = () => {
    if (viewMode === 'edit') {
      if (openedFromCompleteProfile) {
        navigation.goBack();
      } else {
        setViewMode('menu');
      }
    } else {
      navigation.goBack();
    }
  };

  const handleSave = () => {
    if (openedFromCompleteProfile) {
      navigation.goBack();
      return;
    }
    setViewMode('menu');
  };

  const handleLogout = async () => {
    try {
      await fullLogout();
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'LoginScreen' }],
        }),
      );
    } catch (error) {
      Alert.alert(
        t.common?.error || 'Error',
        t.profile?.logoutFailed || 'Could not log out. Please try again.',
      );
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title={viewMode === 'edit' ? (t.profile?.personalInfo || 'Personal Info') : (t.moreOptions?.profile || 'Profile')}
        showBack={true}
        onBack={handleBack}
      />
      
      {viewMode === 'menu' ? (
        <ProfileMenu 
          onEditPress={() => setViewMode('edit')} 
          onLogout={handleLogout}
        />
      ) : (
        <EditProfileForm
          onSave={handleSave}
          initialTab={route.params?.initialTab || 'patient'}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
});

export default ProfileScreen;
