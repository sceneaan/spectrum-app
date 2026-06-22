import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useLanguage } from '../store/LanguageContext';
import { useAuthStore } from '../store/authStore';
import Header from '../components/Header';
import COLORS from '../constants/colors';
import { Logout } from '../api/services/Auth.Service';
import socketService from '../utils/socket';
import { queryClient } from '../api/queryClient';

// Import your new sub-components
import ProfileMenu from '../components/profile/ProfileMenu';
import EditProfileForm from '../components/profile/EditProfileForm';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const { logout } = useAuthStore();
  const [viewMode, setViewMode] = useState('menu'); // 'menu' | 'edit'

  const handleBack = () => {
    if (viewMode === 'edit') {
      setViewMode('menu');
    } else {
      navigation.goBack();
    }
  };

  const handleLogout = async () => {
    try {
      socketService.disconnect();
      await Logout();
      await logout();
      // Clear all React Query cached data so stale user data never leaks post-logout
      queryClient.clear();
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            {
              name: 'Main',
              state: {
                routes: [{ name: 'HomeTab' }],
              },
            },
          ],
        })
      );
    } catch (error) {
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
          onSave={() => setViewMode('menu')} 
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
});

export default ProfileScreen;
