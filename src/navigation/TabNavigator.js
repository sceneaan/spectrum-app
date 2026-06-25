import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Image, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import HomeScreen from '../screens/HomeScreen';
import AppointmentsScreen from '../screens/AppointmentsScreen';
import InboxScreen from '../screens/InboxScreen';
import FindTherapistScreen from '../screens/FindTherapistScreen';
import { useLanguage } from '../store/LanguageContext';
import { useAuthStore } from '../store/authStore';
import { makeProtected } from './authGuards';
import { useGetUnreadCount } from '../api/services/Notification.Service';
import TabBarButton from '../components/TabBarButton';
import TabShortcutSheet from '../components/TabShortcutSheet';
import TabRadialShortcuts from '../components/TabRadialShortcuts';
import ICONS from '../constants/icons';
import COLORS from '../constants/colors';
import { SPACING, RADIUS, SHADOWS } from '../theme';

const Tab = createBottomTabNavigator();

const ProtectedAppointmentsScreen = makeProtected(AppointmentsScreen, {
  targetScreen: 'AppointmentsTab',
  targetParams: {},
});

const ProtectedInboxScreen = makeProtected(InboxScreen, {
  targetScreen: 'InboxTab',
  targetParams: {},
});

const TAB_ICONS = {
  HomeTab: ICONS.home,
  SearchTab: ICONS.docs,
  AppointmentsTab: ICONS.calendar,
  InboxTab: ICONS.inbox,
};

const TabIcon = ({ tabName, color, focused }) => (
  <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
    <Image
      source={TAB_ICONS[tabName]}
      style={[styles.icon, focused && styles.iconFocused, { tintColor: focused ? COLORS.primaryDark : color }]}
      resizeMode="contain"
    />
  </View>
);

const TabNavigator = () => {
  const navigation = useNavigation();
  const { t, isRTL } = useLanguage();
  const { isAuthenticated } = useAuthStore();
  const insets = useSafeAreaInsets();
  const tabBarHeight = 60 + insets.bottom;
  const [shortcutSheet, setShortcutSheet] = useState(null);
  const [appointmentRadial, setAppointmentRadial] = useState(null);

  const { data: unreadCount = 0 } = useGetUnreadCount();

  const closeSheet = () => setShortcutSheet(null);
  const closeRadial = () => setAppointmentRadial(null);

  const goToTab = useCallback((screen, params) => {
    navigation.navigate('Main', { screen, params });
  }, [navigation]);

  const appointmentRadialItems = useMemo(() => {
    if (!isAuthenticated) {
      return [
        {
          key: 'sign-in-left',
          label: t.tabs?.shortcuts?.signIn || 'Sign in',
          icon: ICONS.calendar,
          onPress: () => navigation.navigate('LoginScreen', { targetScreen: 'AppointmentsTab' }),
        },
        {
          key: 'sign-in-right',
          label: t.appointments?.upcoming || 'Upcoming',
          icon: ICONS.clock,
          onPress: () => navigation.navigate('LoginScreen', { targetScreen: 'AppointmentsTab' }),
        },
      ];
    }

    return [
      {
        key: 'upcoming',
        label: t.appointments?.upcoming || 'Upcoming',
        icon: ICONS.calendar,
        onPress: () => goToTab('AppointmentsTab', { initialTab: 'upcoming' }),
      },
      {
        key: 'pending',
        label: t.appointments?.pending || 'Pending',
        icon: ICONS.clock,
        onPress: () => goToTab('AppointmentsTab', { initialTab: 'pending' }),
      },
    ];
  }, [goToTab, isAuthenticated, navigation, t]);

  const openAppointmentRadial = useCallback((anchor) => {
    if (!anchor) return;
    setAppointmentRadial({ anchor, items: appointmentRadialItems });
  }, [appointmentRadialItems]);

  const inboxActions = useMemo(() => {
    if (!isAuthenticated) {
      return [
        {
          key: 'sign-in',
          label: t.tabs?.shortcuts?.signIn || 'Sign in',
          hint: t.tabs?.shortcuts?.messagesSignInHint || 'Message your care team',
          icon: ICONS.inbox,
          onPress: () => navigation.navigate('LoginScreen', { targetScreen: 'InboxTab' }),
        },
      ];
    }

    return [
      {
        key: 'compose',
        label: t.messaging?.newMessage || 'New Message',
        hint: t.tabs?.shortcuts?.composeHint || 'Start a conversation',
        icon: ICONS.inbox,
        onPress: () => navigation.navigate('NewMessage'),
      },
      {
        key: 'unread',
        label: t.messaging?.unread || 'Unread',
        hint: t.tabs?.shortcuts?.unreadHint || 'Focus on new messages',
        icon: ICONS.bell,
        badge: unreadCount > 0 ? (unreadCount > 9 ? '9+' : String(unreadCount)) : null,
        onPress: () => goToTab('InboxTab', { filterUnread: true }),
      },
      {
        key: 'all',
        label: t.messaging?.allMessages || 'All Messages',
        onPress: () => goToTab('InboxTab', { filterUnread: false }),
      },
    ];
  }, [goToTab, isAuthenticated, navigation, t, unreadCount]);

  const orderedTabs = useMemo(() => {
    const tabs = [
      {
        name: 'HomeTab',
        component: HomeScreen,
        label: t.tabs?.home || 'Home',
      },
      {
        name: 'SearchTab',
        component: FindTherapistScreen,
        label: t.tabs?.doctors || 'Doctors',
      },
      {
        name: 'AppointmentsTab',
        component: ProtectedAppointmentsScreen,
        label: t.tabs?.appointments || 'Appointments',
        lazy: true,
        longPress: openAppointmentRadial,
      },
      {
        name: 'InboxTab',
        component: ProtectedInboxScreen,
        label: t.tabs?.inbox || 'Inbox',
        lazy: true,
        longPress: () => setShortcutSheet('inbox'),
      },
    ];

    return isRTL ? [...tabs].reverse() : tabs;
  }, [isRTL, openAppointmentRadial, t.tabs]);

  return (
    <>
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
              tabBarButton: tab.longPress
                ? (props) => (
                    <TabBarButton
                      {...props}
                      onLongPress={tab.longPress}
                    />
                  )
                : undefined,
            }}
          />
        ))}
      </Tab.Navigator>

      <TabRadialShortcuts
        visible={Boolean(appointmentRadial)}
        anchor={appointmentRadial?.anchor}
        items={appointmentRadial?.items || []}
        onClose={closeRadial}
        isRTL={isRTL}
      />

      <TabShortcutSheet
        visible={shortcutSheet === 'inbox'}
        title={t.tabs?.shortcuts?.inboxTitle || 'Messages'}
        subtitle={t.tabs?.shortcuts?.holdHint || 'Quick shortcuts'}
        actions={inboxActions}
        onClose={closeSheet}
        isRTL={isRTL}
      />
    </>
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
  icon: {
    width: 26,
    height: 26,
    opacity: 0.85,
  },
  iconFocused: {
    width: 28,
    height: 28,
    opacity: 1,
  },
});

export default TabNavigator;
