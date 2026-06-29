import React from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import Header from '../../components/Header';
import { AppText, AppCard, AppButton } from '../../components/ui';
import AppIcon from '../../components/ui/AppIcon';
import { useLanguage } from '../../store/LanguageContext';
import { useAuthStore } from '../../store/authStore';
import { Logout } from '../../api/services/Auth.Service';
import socketService from '../../utils/socket';
import { queryClient } from '../../api/queryClient';
import COLORS from '../../constants/colors';
import { SPACING, RADIUS } from '../../theme';

const MenuRow = ({ icon, label, subtitle, onPress, isRTL }) => (
  <AppButton
    title={label}
    variant="outline"
    onPress={onPress}
    style={styles.menuBtn}
  />
);

const ProviderProfileScreen = () => {
  const navigation = useNavigation();
  const { t, isRTL } = useLanguage();
  const { user, logout } = useAuthStore();
  const pd = t.providerDashboard || {};

  const handleLogout = async () => {
    try {
      socketService.disconnect();
      await Logout();
      await logout();
      queryClient.clear();
      navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Main' }] }));
    } catch {
      Alert.alert(t.common?.error || 'Error', pd.logoutFailed || 'Could not log out');
    }
  };

  const name = user?.fullName || user?.name || pd.provider || 'Provider';

  return (
    <View style={styles.container}>
      <Header showBack title={pd.providerProfile || 'My profile'} />
      <ScrollView contentContainerStyle={styles.content}>
        <AppCard padding={SPACING.xl} style={styles.hero}>
          <AppText variant="h2">{name}</AppText>
          <AppText variant="bodySmall" color={COLORS.textSecondary}>
            {pd.providerProfileHint || 'Manage scheduling, fees, and availability on the clinic website.'}
          </AppText>
        </AppCard>

        <AppText variant="label" style={styles.section}>{pd.quickLinks || 'Quick links'}</AppText>

        <MenuRow
          label={pd.manageOnWeb || 'Open clinic website'}
          onPress={() => Alert.alert(
            pd.manageOnWeb || 'Clinic website',
            pd.manageOnWebHint || 'Sign in at your clinic website to edit profile, availability, and fees.',
          )}
          isRTL={isRTL}
        />

        <View style={styles.spacer} />
        <AppButton
          title={t.moreOptions?.logout || 'Log out'}
          variant="outline"
          onPress={handleLogout}
          fullWidth
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: 40 },
  hero: { marginBottom: SPACING.xl },
  section: { marginBottom: SPACING.md },
  menuBtn: { marginBottom: SPACING.sm },
  spacer: { height: SPACING.xl },
});

export default ProviderProfileScreen;
