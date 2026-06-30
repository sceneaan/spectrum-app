import React, { useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AdminHomeScreen from '../screens/admin/AdminHomeScreen';
import AdminAppointmentsScreen from '../screens/admin/AdminAppointmentsScreen';
import AdminClinicBookingsScreen from '../screens/admin/AdminClinicBookingsScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import { useLanguage } from '../store/LanguageContext';
import { useAuthStore } from '../store/authStore';
import { useGetUserData } from '../api/services/User.Service';
import { hasAdminPermission } from '../utils/adminPermissions';
import { SHELL_ICONS } from '../components/ui/AppIcon';
import GlassShellTabBar, { createGlassTabNavigatorOptions } from './GlassShellTabBar';
import { ShellTabIcon } from './shellTabBar';
import haptics from '../utils/haptics';

const Tab = createBottomTabNavigator();

const ADMIN_TAB_ICONS = {
  AdminHomeTab: SHELL_ICONS.home,
  AdminAppointmentsTab: SHELL_ICONS.calendar,
  AdminBookingsTab: { outline: 'calendar-clock', filled: 'calendar-clock' },
  AdminUsersTab: { outline: 'account-search-outline', filled: 'account-search' },
};

const TabIcon = ({ tabName, color, focused }) => (
  <ShellTabIcon
    pair={ADMIN_TAB_ICONS[tabName]}
    color={color}
    focused={focused}
  />
);

const TabAdminAppointments = () => <AdminAppointmentsScreen showBack={false} />;
const TabAdminBookings = () => <AdminClinicBookingsScreen showBack={false} />;
const TabAdminUsers = () => <AdminUsersScreen showBack={false} />;

const AdminTabNavigator = () => {
  const { t, isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const shellTabOptions = useMemo(() => createGlassTabNavigatorOptions(insets), [insets]);
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
      tabBar={(props) => <GlassShellTabBar {...props} />}
      screenOptions={shellTabOptions}
      screenListeners={{
        tabPress: () => haptics.light(),
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

export default AdminTabNavigator;
