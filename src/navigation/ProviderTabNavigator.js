import React, { useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProviderHomeScreen from '../screens/provider/ProviderHomeScreen';
import ProviderAppointmentsScreen from '../screens/provider/ProviderAppointmentsScreen';
import ProviderPracticeScreen from '../screens/provider/ProviderPracticeScreen';
import { useLanguage } from '../store/LanguageContext';
import { makeProtected } from './authGuards';
import AppIcon, { SHELL_ICONS } from '../components/ui/AppIcon';
import COLORS from '../constants/colors';
import { SPACING, RADIUS, SHADOWS } from '../theme';

const Tab = createBottomTabNavigator();

const ProtectedProviderAppointments = makeProtected(ProviderAppointmentsScreen, {
  targetScreen: 'ProviderAppointmentsTab',
  targetParams: {},
});

const ProtectedProviderInbox = makeProtected(ProviderInboxScreen, {
  targetScreen: 'ProviderInboxTab',
  targetParams: {},
});

const ProtectedProviderPractice = makeProtected(ProviderPracticeScreen, {
  targetScreen: 'ProviderPracticeTab',
  targetParams: {},
});

const PROVIDER_TAB_ICONS = {
  ProviderHomeTab: SHELL_ICONS.home,
  ProviderAppointmentsTab: SHELL_ICONS.calendar,
  ProviderInboxTab: SHELL_ICONS.inbox,
  ProviderPracticeTab: { outline: 'clipboard-text-outline', filled: 'clipboard-text' },
};

const TabIcon = ({ tabName, color, focused }) => (
  <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
    <AppIcon
      pair={PROVIDER_TAB_ICONS[tabName]}
      focused={focused}
      size={focused ? 28 : 26}
      color={focused ? COLORS.primaryDark : color}
    />
  </View>
);

const ProviderTabNavigator = () => {
  const { t, isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const tabBarHeight = 60 + insets.bottom;
  const pd = t.providerDashboard || {};

  const orderedTabs = useMemo(() => {
    const tabs = [
      {
        name: 'ProviderHomeTab',
        component: ProviderHomeScreen,
        label: pd.tabDashboard || 'Dashboard',
      },
      {
        name: 'ProviderAppointmentsTab',
        component: ProtectedProviderAppointments,
        label: pd.tabSchedule || 'Schedule',
        lazy: true,
      },
      {
        name: 'ProviderInboxTab',
        component: ProtectedProviderInbox,
        label: pd.tabInbox || 'Inbox',
        lazy: true,
      },
      {
        name: 'ProviderPracticeTab',
        component: ProtectedProviderPractice,
        label: pd.tabPractice || 'Practice',
        lazy: true,
      },
    ];
    return isRTL ? [...tabs].reverse() : tabs;
  }, [isRTL, pd]);

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

export default ProviderTabNavigator;
