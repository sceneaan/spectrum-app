import React, { useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AdminHomeScreen from '../screens/admin/AdminHomeScreen';
import AdminAppointmentsScreen from '../screens/admin/AdminAppointmentsScreen';
import AdminClinicBookingsScreen from '../screens/admin/AdminClinicBookingsScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import { useLanguage } from '../store/LanguageContext';
import { useAuthStore } from '../store/authStore';
import { useGetUserData } from '../api/services/User.Service';
import { hasAdminPermission } from '../utils/adminPermissions';
import AppIcon, { SHELL_ICONS } from '../components/ui/AppIcon';
import COLORS from '../constants/colors';
import { SPACING, RADIUS, SHADOWS } from '../theme';

const Tab = createBottomTabNavigator();

const ADMIN_TAB_ICONS = {
  AdminHomeTab: SHELL_ICONS.home,
  AdminAppointmentsTab: SHELL_ICONS.calendar,
  AdminBookingsTab: { outline: 'calendar-clock', filled: 'calendar-clock' },
  AdminUsersTab: { outline: 'account-search-outline', filled: 'account-search' },
};

const TabIcon = ({ tabName, color, focused }) => (
  <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
    <AppIcon
      pair={ADMIN_TAB_ICONS[tabName]}
      focused={focused}
      size={focused ? 28 : 26}
      color={focused ? COLORS.primaryDark : color}
    />
  </View>
);

const TabAdminAppointments = () => <AdminAppointmentsScreen showBack={false} />;
const TabAdminBookings = () => <AdminClinicBookingsScreen showBack={false} />;
const TabAdminUsers = () => <AdminUsersScreen showBack={false} />;

const AdminTabNavigator = () => {
  const { t, isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const tabBarHeight = 60 + insets.bottom;
  const ad = t.adminDashboard || {};
  const user = useAuthStore((state) => state.user);
  const { data: userData } = useGetUserData();
  const profile = userData || user;

  const orderedTabs = useMemo(() => {
    const tabs = [
      {
        name: 'AdminHomeTab',
        component: AdminHomeScreen,
        label: ad.tabDashboard || 'Dashboard',
      },
    ];

    if (hasAdminPermission(profile, 'view_appointments')) {
      tabs.push({
        name: 'AdminAppointmentsTab',
        component: TabAdminAppointments,
        label: ad.tabAppointments || 'Appointments',
        lazy: true,
      });
      tabs.push({
        name: 'AdminBookingsTab',
        component: TabAdminBookings,
        label: ad.tabBookings || 'Bookings',
        lazy: true,
      });
    }

    if (hasAdminPermission(profile, 'view_patients') || hasAdminPermission(profile, 'view_providers')) {
      tabs.push({
        name: 'AdminUsersTab',
        component: TabAdminUsers,
        label: ad.tabUsers || 'Users',
        lazy: true,
      });
    }

    return isRTL ? [...tabs].reverse() : tabs;
  }, [isRTL, ad, profile]);

  return (
    <Tab.Navigator
      detachInactiveScreens
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray500,
        tabBarStyle: {
          height: tabBarHeight,
          paddingBottom: insets.bottom + SPACING.sm,
          paddingTop: SPACING.sm,
          backgroundColor: COLORS.surface,
          borderTopWidth: 0,
          ...SHADOWS.md,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          marginTop: 2,
          fontWeight: '600',
        },
      }}
    >
      {orderedTabs.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{
            tabBarLabel: tab.label,
            lazy: tab.lazy,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon tabName={tab.name} color={color} focused={focused} />
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  iconWrap: {
    width: 44,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
  },
  iconWrapActive: {
    backgroundColor: COLORS.primaryLight,
  },
});

export default AdminTabNavigator;
