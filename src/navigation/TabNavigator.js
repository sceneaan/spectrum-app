import React, { useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeScreen from '../screens/HomeScreen';
import AppointmentsScreen from '../screens/AppointmentsScreen';
import InboxScreen from '../screens/InboxScreen';
import FindTherapistScreen from '../screens/FindTherapistScreen';
import { useLanguage } from '../store/LanguageContext';
import { makeProtected } from './authGuards';
import ICONS from '../constants/icons';
import COLORS from '../constants/colors';

const Tab = createBottomTabNavigator();

const ProtectedAppointmentsScreen = makeProtected(AppointmentsScreen, {
  targetScreen: 'AppointmentsTab',
  targetParams: {},
});

const ProtectedInboxScreen = makeProtected(InboxScreen, {
  targetScreen: 'InboxTab',
  targetParams: {},
});

const TabNavigator = () => {
  const { t, isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const tabBarHeight = 56 + insets.bottom;

  const orderedTabs = useMemo(() => {
    const tabs = [
      {
        name: 'HomeTab',
        component: HomeScreen,
        label: t.tabs?.home || 'Home',
        icon: ICONS.home,
      },
      {
        name: 'SearchTab',
        component: FindTherapistScreen,
        label: t.tabs?.doctors || 'Doctors',
        icon: ICONS.docs,
      },
      {
        name: 'AppointmentsTab',
        component: ProtectedAppointmentsScreen,
        label: t.tabs?.appointments || 'Appointments',
        icon: ICONS.calendar,
        lazy: true,
      },
      {
        name: 'InboxTab',
        component: ProtectedInboxScreen,
        label: t.tabs?.inbox || 'Inbox',
        icon: ICONS.inbox,
        lazy: true,
      },
    ];

    return isRTL ? [...tabs].reverse() : tabs;
  }, [isRTL, t.tabs, insets.bottom, tabBarHeight]);

  return (
    <Tab.Navigator
      detachInactiveScreens
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.inactive,
        tabBarStyle: {
          height: tabBarHeight,
          paddingBottom: insets.bottom + 8,
          paddingTop: 10,
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.gray200,
          elevation: 10,
          shadowColor: COLORS.shadow,
          shadowOpacity: 0.05,
          shadowRadius: 5,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          marginTop: 5,
          fontWeight: '500',
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
            tabBarIcon: ({ color }) => (
              <Image
                source={tab.icon}
                style={{ width: 24, height: 24, tintColor: color }}
              />
            ),
          }}
          listeners={tab.listeners}
        />
      ))}
    </Tab.Navigator>
  );
};

export default TabNavigator;
