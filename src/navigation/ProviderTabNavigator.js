import React, { useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProviderHomeScreen from '../screens/provider/ProviderHomeScreen';
import ProviderAppointmentsScreen from '../screens/provider/ProviderAppointmentsScreen';
import ProviderInboxScreen from '../screens/provider/ProviderInboxScreen';
import ProviderPracticeScreen from '../screens/provider/ProviderPracticeScreen';
import { useLanguage } from '../store/LanguageContext';
import { makeProtected } from './authGuards';
import { SHELL_ICONS } from '../components/ui/AppIcon';
import { createShellTabBarScreenOptions, ShellTabIcon } from './shellTabBar';

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
  <ShellTabIcon
    pair={PROVIDER_TAB_ICONS[tabName]}
    color={color}
    focused={focused}
  />
);

const ProviderTabNavigator = () => {
  const { t, isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const shellTabOptions = useMemo(() => createShellTabBarScreenOptions(insets), [insets]);
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
      screenOptions={shellTabOptions}
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

export default ProviderTabNavigator;
