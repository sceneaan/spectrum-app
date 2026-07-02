import React from 'react';
import { View, StyleSheet, ScrollView, Alert, Linking } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import Header from '../../components/Header';
import AppIcon from '../../components/ui/AppIcon';
import { AppText, AppCard, AppButton } from '../../components/ui';
import { useLanguage } from '../../store/LanguageContext';
import { useAuthStore } from '../../store/authStore';
import { getAdminPermissions } from '../../utils/adminPermissions';
import { useGetUserData } from '../../api/services/User.Service';
import { fullLogout } from '../../utils/fullLogout';
import COLORS from '../../constants/colors';
import { SPACING } from '../../theme';

const AdminProfileScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const ad = t.adminDashboard || {};
  const { user } = useAuthStore();
  const { data: userData } = useGetUserData();
  const profile = userData || user;
  const permissions = getAdminPermissions(profile);

  const handleLogout = async () => {
    try {
      await fullLogout();
      navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'LoginScreen' }] }));
    } catch {
      Alert.alert(t.common?.error || 'Error', ad.logoutFailed || 'Could not log out');
    }
  };

  const openWebAdmin = () => {
    Linking.openURL('https://spectrumclinics.care/admin/dashboard').catch(() => {});
  };

  return (
    <View style={styles.container}>
      <Header showBack title={ad.profileTitle || 'Admin profile'} />
      <ScrollView contentContainerStyle={styles.content}>
        <AppCard padding={SPACING.lg}>
          <AppText variant="h3">{profile?.fullName || ad.adminUser || 'Admin'}</AppText>
          <AppText variant="bodySmall" color={COLORS.textSecondary}>{profile?.email}</AppText>
          <AppText variant="caption" color={COLORS.primaryDark} style={styles.role}>
            {permissions?.name || ad.role || 'Admin'}
          </AppText>
        </AppCard>

        <AppCard muted padding={SPACING.lg} style={styles.hintCard}>
          <View style={styles.hintRow}>
            <AppIcon name="monitor" size={20} color={COLORS.textSecondary} />
            <AppText variant="bodySmall" color={COLORS.textSecondary} style={styles.hintText}>
              {ad.manageOnWebHint || 'Financial reconciliation, roles, settings, and clinical audit are available on the admin website.'}
            </AppText>
          </View>
        </AppCard>

        <AppButton title={ad.openWebAdmin || 'Open admin website'} onPress={openWebAdmin} style={styles.btn} />
        <AppButton title={ad.logout || 'Log out'} variant="outline" onPress={handleLogout} style={styles.btn} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: 40 },
  role: { marginTop: SPACING.xs },
  hintCard: { marginTop: SPACING.lg },
  hintRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md },
  hintText: { flex: 1 },
  btn: { marginTop: SPACING.md },
});

export default AdminProfileScreen;
