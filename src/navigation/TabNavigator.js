import React, { useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Image, View, I18nManager } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import AppointmentsScreen from '../screens/AppointmentsScreen';
import InboxScreen from '../screens/InboxScreen';
import FindTherapistScreen from '../screens/FindTherapistScreen';
// ProfileScreen import is removed from here as it's no longer a tab
import { useLanguage } from '../store/LanguageContext';
import ICONS from '../constants/icons';
import COLORS from '../constants/colors';

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  const { t, isRTL } = useLanguage();

  // Memoize tabs configuration to prevent unnecessary re-renders
  const orderedTabs = useMemo(() => {
    // Define tab screens
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
        component: AppointmentsScreen,
        label: t.tabs?.appointments || 'Appointments',
        icon: ICONS.calendar,
      },
      {
        name: 'InboxTab',
        component: InboxScreen,
        label: t.tabs?.inbox || 'Inbox',
        icon: ICONS.inbox,
      },
    ];

    // Reverse tabs for RTL
    return isRTL ? [...tabs].reverse() : tabs;
  }, [isRTL, t.tabs]);

  return (
    <Tab.Navigator
      detachInactiveScreens={false}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.inactive,
        tabBarStyle: {
          height: 85,
          paddingBottom: 30,
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
        }
      }}
    >
      {orderedTabs.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{
            tabBarLabel: tab.label,
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
